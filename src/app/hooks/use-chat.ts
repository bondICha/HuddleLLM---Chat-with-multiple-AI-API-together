import { htmlToText } from '~app/utils/html-utils';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { useCallback, useEffect, useMemo, useState } from 'react'
import Browser from 'webextension-polyfill'
import { chatFamily, sessionToRestoreAtom, allInOneRestoreDataAtom } from '~app/state'
import { compressImageFile } from '~app/utils/image-compression'
import { setConversationMessages, loadHistoryMessages } from '~services/chat-history'
import { ChatMessageModel, FetchedUrlContent } from '~types'
import { uuid } from '~utils'
import { ChatError } from '~utils/errors'

export function useChat(index: number) {
  console.log(`useChat called with index:`, index, `(type: ${typeof index})`);
  const chatAtom = useMemo(() => chatFamily({ index, page: 'singleton' }), [index])
  const [chatState, setChatState] = useAtom(chatAtom)

  const sessionToRestore = useAtomValue(sessionToRestoreAtom)
  const setSessionToRestore = useSetAtom(sessionToRestoreAtom)
  const allInOneRestoreData = useAtomValue(allInOneRestoreDataAtom)
  const setAllInOneRestoreData = useSetAtom(allInOneRestoreDataAtom)

  const updateMessage = useCallback(
    (messageId: string, updater: (message: ChatMessageModel) => void) => {
      setChatState((draft) => {
        const message = draft.messages.find((m) => m.id === messageId)
        if (message) {
          updater(message)
        }
      })
    },
    [setChatState],
  )

  const sendMessage = useCallback(
    async (input: string, images?: File[], attachments?: { name: string; content: string }[]) => {
      // URL処理
      const urlPattern = /@(https?:\/\/[^\s]+)/g
      const matches = [...input.matchAll(urlPattern)]

      let cleanInput = input
      let fetchedContent = ''

      let fetchedUrls: FetchedUrlContent[] = []

      // URLがある場合は取得処理
      if (matches.length > 0) {
        for (const match of matches) {
          const fullMatch = match[0]
          const url = match[1]

          try {
            console.log('🌐 Fetching URL:', url)

            // URLのホストを抽出して権限チェック
            const urlObj = new URL(url)
            const hostPattern = `${urlObj.protocol}//${urlObj.hostname}/*`

            // 権限チェック
            const hasPermission = await Browser.permissions.contains({
              origins: [hostPattern]
            })

            if (!hasPermission) {
              console.log('🔐 Requesting permission for:', hostPattern)
              // ユーザージェスチャー内で権限リクエスト
              const granted = await Browser.permissions.request({
                origins: [hostPattern]
              })

              if (!granted) {
                throw new Error(`Permission denied for ${urlObj.hostname}`)
              }
            }

            // Background scriptにフェッチ依頼を送信
            const response = await Browser.runtime.sendMessage({
              type: 'FETCH_URL',
              url: url
            }) as { success: boolean, content?: string, error?: string, status?: number, statusText?: string }

            if (!response.success) {
              throw new Error(response.error || 'Fetch failed')
            }

            // Response objectを模擬
            const mockResponse = {
              ok: true,
              status: response.status || 200,
              statusText: response.statusText || 'OK',
              text: async () => response.content || '',
              headers: new Map()
            }
            console.log('📡 Response status:', mockResponse.status, mockResponse.statusText)
            console.log('📡 Response headers:', Object.fromEntries(mockResponse.headers.entries()))
            if (mockResponse.ok) {
              const content = await mockResponse.text()
              console.log('🔍 Raw content length:', content.length)
              console.log('🔍 Content preview:', content.substring(0, 500))

              const textContent = htmlToText(content);

              console.log('📝 Processed content length:', textContent.length)

              // UIには制限付きで表示
              const maxDisplayLength = 12000
              const displayContent = textContent.length > maxDisplayLength
                ? textContent.substring(0, maxDisplayLength) + '\n\n[Content truncated - showing first ' + maxDisplayLength + ' of ' + textContent.length + ' characters]'
                : textContent

              // UIには短縮版、AIには全文
              fetchedUrls.push({ url, content: displayContent })
              fetchedContent += `Content from ${url}:\n\n${textContent}\n\n`  // AIには全文
            } else {
              const errorContent = `Error fetching ${url}: ${response.status} ${response.statusText}`
              fetchedUrls.push({ url, content: errorContent })
              fetchedContent += errorContent + '\n\n'
            }
          } catch (error) {
            console.error('💥 Fetch error details:', {
              url: url,
              error: error,
              errorType: error?.constructor?.name,
              errorMessage: error instanceof Error ? error.message : 'Unknown error',
              errorStack: error instanceof Error ? error.stack : undefined,
              timestamp: new Date().toISOString()
            })

            let errorContent = `Error fetching ${url}:\n`
            errorContent += `• Error Type: ${error?.constructor?.name || 'Unknown'}\n`
            errorContent += `• Message: ${error instanceof Error ? error.message : 'Unknown error'}\n`
            errorContent += `• Timestamp: ${new Date().toISOString()}\n`

            fetchedUrls.push({ url, content: errorContent })
            fetchedContent += errorContent + '\n\n'
          }
        }
      }

      // 添付は履歴に残さない。UI用の attachments は message に保持しつつ、保存時に除去する（既存仕様・下部で処理）
      const botMessageId = uuid()
      setChatState((draft) => {
        draft.messages.push(
          {
            id: uuid(),
            text: input, // 画面表示用にそのまま保持（ただし履歴保存時にattachmentsは落とす）
            images,
            attachments: attachments && attachments.length ? attachments : undefined,
            author: 'user',
            fetchedUrls: fetchedUrls.length > 0 ? fetchedUrls : undefined
          },
          { id: botMessageId, text: '', author: index }, // Use index as author
        )
      })
      
      // API へ渡す最終メッセージは、ユーザ本文 + 取得URL + 添付を末尾に付加
      let finalMessage = cleanInput.trim() + (fetchedContent ? '\n\n' + fetchedContent : '')
      if (attachments && attachments.length) {
        const attachmentSection = attachments
          .map(att => `<${att.name}>\n${att.content}\n</${att.name}>`)
          .join('\n\n')
        finalMessage = `${finalMessage}\n\n---\n\n<Attachment>\n\n${attachmentSection}\n\n</Attachment>`
      }

      const abortController = new AbortController()
      setChatState((draft) => {
        draft.generatingMessageId = botMessageId
        draft.abortController = abortController
      })

      let compressedImages: File[] | undefined = undefined
      if (images && images.length > 0) {
        compressedImages = await Promise.all(images.map(compressImageFile))
      }

      const resp = chatState.bot.sendMessage({
        prompt: finalMessage,
        images: compressedImages,
        signal: abortController.signal,
      });

      try {
        for await (const answer of resp) {
          updateMessage(botMessageId, (message) => {
            message.text = answer.text;
                        if (answer.thinking) {
              message.thinking = answer.thinking;
            }
            if (answer.searchResults) {
              message.searchResults = answer.searchResults;
            }
          });
        }
      } catch (err: unknown) {
        if (!abortController.signal.aborted) {
          abortController.abort()
        }
        const error = err as ChatError
        console.error('sendMessage error', error.code, error)
        updateMessage(botMessageId, (message) => {
          message.error = error
        })
        setChatState((draft) => {
          draft.abortController = undefined
          draft.generatingMessageId = ''
        })
      }

      setChatState((draft) => {
        draft.abortController = undefined
        draft.generatingMessageId = ''
      })
    },
    [index, chatState.bot, setChatState, updateMessage],
  )

  const modifyLastMessage = useCallback(
    async (text: string) => {
      chatState.bot.modifyLastMessage(text)

      // 最後のボットメッセージを見つけて更新
      setChatState((draft) => {
        const lastBotMessage = [...draft.messages].reverse().find(m => m.author === index) // Use index to find bot message
        if (lastBotMessage) {
          lastBotMessage.text = text
        }
      })

    }, [chatState.bot, setChatState])

  const resetConversation = useCallback(() => {
    chatState.bot.resetConversation()
    setChatState((draft) => {
      draft.abortController = undefined
      draft.generatingMessageId = ''
      draft.messages = []
      draft.conversationId = uuid()
    })
  }, [chatState.bot, setChatState])

  const stopGenerating = useCallback(() => {
    chatState.abortController?.abort()
    if (chatState.generatingMessageId) {
      updateMessage(chatState.generatingMessageId, (message) => {
        if (!message.text && !message.error) {
          message.text = 'Cancelled'
        }
      })
    }
    setChatState((draft) => {
      draft.generatingMessageId = ''
    })
  }, [chatState.abortController, chatState.generatingMessageId, setChatState, updateMessage])

  // セッション復元の処理
  useEffect(() => {
    const restoreSession = async () => {
      if (sessionToRestore && sessionToRestore.type === 'single' && sessionToRestore.botIndex === index) {
        try {
          const conversations = await loadHistoryMessages(index)
          const targetConversation = conversations.find(c => c.id === sessionToRestore.conversationId)

          if (targetConversation && targetConversation.messages.length > 0) {
            setChatState((draft) => {
              draft.messages = targetConversation.messages
              draft.conversationId = targetConversation.id
            })

            // ボットに会話履歴を設定
            if (chatState.bot.setConversationHistory) {
              chatState.bot.setConversationHistory({
                messages: targetConversation.messages
              })
            }

            // セッション復元完了後、atomをクリア
            setSessionToRestore(null)
          }
        } catch (error) {
          console.error('Failed to restore session:', error)
        }
      }
    }

    restoreSession()
  }, [sessionToRestore, index, setChatState, chatState.bot, setSessionToRestore])

  // All-in-one復元データの監視
  useEffect(() => {
    const restoreAllInOneData = async () => {
      if (allInOneRestoreData && allInOneRestoreData[index]) {
        try {
          const restoreInfo = allInOneRestoreData[index]

          // スナップショット復元の場合は直接メッセージを使用
          if (restoreInfo.conversationId.startsWith('snapshot-')) {
            // スナップショットメッセージを直接復元
            if (restoreInfo.messages && restoreInfo.messages.length > 0) {
              setChatState((draft) => {
                draft.messages = restoreInfo.messages
                draft.conversationId = restoreInfo.conversationId
              })

              // ボットに会話履歴を設定
              if (chatState.bot.setConversationHistory) {
                chatState.bot.setConversationHistory({
                  messages: restoreInfo.messages
                })
              }

            }
          } else {
            // 既存の会話履歴から復元（従来の方法）
            const conversations = await loadHistoryMessages(index)
            const targetConversation = conversations.find(c => c.id === restoreInfo.conversationId)

            if (targetConversation && targetConversation.messages.length > 0) {
              setChatState((draft) => {
                draft.messages = targetConversation.messages
                draft.conversationId = targetConversation.id
              })

              // ボットに会話履歴を設定
              if (chatState.bot.setConversationHistory) {
                chatState.bot.setConversationHistory({
                  messages: targetConversation.messages
                })
              }
            }
          }
        } catch (error) {
          console.error(`Failed to restore All-in-one data for bot ${index}:`, error)
        }
      }
    }

    restoreAllInOneData()
  }, [allInOneRestoreData, index, setChatState, chatState.bot])

  useEffect(() => {
    if (chatState.messages.length) {
      // 履歴保存時に添付を除去（画像同様、添付テキストは残さない）
      const sanitized = chatState.messages.map(({ attachments, ...rest }) => rest)
      setConversationMessages(index, chatState.conversationId, sanitized as ChatMessageModel[])
    }
  }, [index, chatState.conversationId, chatState.messages])

  // AsyncAbstractBotの初期化状態を監視するためのstate
  const [botInitialized, setBotInitialized] = useState(false)

  // ボットの初期化状態を定期的にチェック
  useEffect(() => {
    if ('isInitialized' in chatState.bot) {
      const checkInitialization = () => {
        const initialized = chatState.bot.isInitialized
        if (initialized !== botInitialized) {
          setBotInitialized(initialized)
        }
      }

      // 初期チェック
      checkInitialization()

      // 定期的にチェック（初期化完了まで）
      const interval = setInterval(() => {
        checkInitialization()
        if (chatState.bot.isInitialized) {
          clearInterval(interval)
        }
      }, 100)

      return () => clearInterval(interval)
    } else {
      setBotInitialized(true) // 通常のAbstractBotの場合は常に初期化済み
    }
  }, [chatState.bot, botInitialized])

  const chat = useMemo(
    () => ({
      index,
      bot: chatState.bot,
      messages: chatState.messages,
      conversationId: chatState.conversationId,
      sendMessage,
      resetConversation,
      generating: !!chatState.generatingMessageId,
      stopGenerating,
      modifyLastMessage,
      isInitialized: botInitialized
    }),
    [
      index,
      chatState.bot,
      chatState.generatingMessageId,
      chatState.messages,
      chatState.conversationId,
      resetConversation,
      sendMessage,
      stopGenerating,
      modifyLastMessage,
      botInitialized
    ],
  )

  return chat
}
