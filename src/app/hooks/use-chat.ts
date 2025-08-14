import { useAtom } from 'jotai'
import { useCallback, useEffect, useMemo, useState } from 'react'
import Browser from 'webextension-polyfill'
import { chatFamily } from '~app/state'
import { compressImageFile } from '~app/utils/image-compression'
import { setConversationMessages } from '~services/chat-history'
import { ChatMessageModel, FetchedUrlContent } from '~types'
import { uuid } from '~utils'
import { ChatError } from '~utils/errors'

export function useChat(index: number) {
  const chatAtom = useMemo(() => chatFamily({ index, page: 'singleton' }), [index])
  const [chatState, setChatState] = useAtom(chatAtom)

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
    async (input: string, images?: File[]) => {
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
            }) as {success: boolean, content?: string, error?: string, status?: number, statusText?: string}
            
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
              
              // HTMLタグを削除してテキストのみ抽出
              let textContent = content
                .replace(/<script[\s\S]*?<\/script>/gi, '')     // スクリプト削除
                .replace(/<style[\s\S]*?<\/style>/gi, '')       // スタイル削除
                .replace(/<br\s*\/?>/gi, '\n')                  // <br>を改行に
                .replace(/<p\s*[^>]*>/gi, '\n')                 // <p>を改行に
                .replace(/<\/p>/gi, '\n')                       // </p>を改行に
                .replace(/<div\s*[^>]*>/gi, '\n')               // <div>を改行に
                .replace(/<\/div>/gi, '\n')                     // </div>を改行に
                .replace(/<h1\s*[^>]*>/gi, '\n# ')              // h1を#に
                .replace(/<h2\s*[^>]*>/gi, '\n## ')             // h2を##に
                .replace(/<h3\s*[^>]*>/gi, '\n### ')            // h3を###に
                .replace(/<h4\s*[^>]*>/gi, '\n#### ')           // h4を####に
                .replace(/<h5\s*[^>]*>/gi, '\n##### ')          // h5を#####に
                .replace(/<h6\s*[^>]*>/gi, '\n###### ')         // h6を######に
                .replace(/<\/h[1-6]>/gi, '\n')                  // ヘッダー終了
                .replace(/<ul\s*[^>]*>([\s\S]*?)<\/ul>/gi, (_, content: string) => {
                  // ul内のliだけを処理
                  return content.replace(/<li\s*[^>]*>([\s\S]*?)<\/li>/gi, (_, liContent: string) => {
                    return '\n• ' + liContent.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
                  })
                })
                .replace(/<ol\s*[^>]*>([\s\S]*?)<\/ol>/gi, (_, content: string) => {
                  // ol内のliを番号付きで処理
                  let counter = 1
                  return content.replace(/<li\s*[^>]*>([\s\S]*?)<\/li>/gi, (_, liContent: string) => {
                    return '\n' + (counter++) + '. ' + liContent.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
                  })
                })
                .replace(/<li\s*[^>]*>/gi, '')                  // 残りの単体liタグを削除
                .replace(/<\/li>/gi, '')                        // 残りの単体li終了タグを削除
                .replace(/<[^>]*>/g, ' ')                       // 残りのHTMLタグ削除
                .replace(/\n\s*\n\s*\n/g, '\n\n')               // 3つ以上の改行を2つに
                .replace(/[ \t]+/g, ' ')                        // 連続する空白・タブを1つに
                .trim()
              
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

      const finalMessage = cleanInput.trim() + (fetchedContent ? '\n\n' + fetchedContent : '')

      const botMessageId = uuid()
      setChatState((draft) => {
        draft.messages.push(
          { 
            id: uuid(), 
            text: input, // 元のメッセージを保持（@URL含む）
            images, 
            author: 'user',
            thinking: fetchedContent || undefined,
            fetchedUrls: fetchedUrls.length > 0 ? fetchedUrls : undefined
          },
          { id: botMessageId, text: '', author: index }, // Use index as author
        )
      })

      const abortController = new AbortController()
      setChatState((draft) => {
        draft.generatingMessageId = botMessageId
        draft.abortController = abortController
      })

      let compressedImages: File[] | undefined = undefined
      if (images && images.length > 0) {
        compressedImages = await Promise.all(images.map(compressImageFile))
      }
      
      const resp = await chatState.bot.sendMessage({
        prompt: finalMessage,
        images: compressedImages,
        signal: abortController.signal,
      })

      try {
        for await (const answer of resp) {
          updateMessage(botMessageId, (message) => {
            message.text = answer.text
            if (answer.thinking) {
              message.thinking = answer.thinking
            }
          })
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

  useEffect(() => {
    if (chatState.messages.length) {
      setConversationMessages(index, chatState.conversationId, chatState.messages)
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
      resetConversation,
      sendMessage,
      stopGenerating,
      modifyLastMessage,
      botInitialized
    ],
  )

  return chat
}
