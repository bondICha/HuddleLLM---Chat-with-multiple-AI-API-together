import { useAtom } from 'jotai'
import { useCallback, useEffect, useMemo } from 'react'
import { chatFamily } from '~app/state'
import { compressImageFile } from '~app/utils/image-compression'
import { setConversationMessages } from '~services/chat-history'
import { ChatMessageModel } from '~types'
import { uuid } from '~utils'
import { ChatError } from '~utils/errors'
import { BotId } from '../bots'

export function useChat(botId: BotId, initialMessages?: ChatMessageModel[]) {
  const chatAtom = useMemo(() => chatFamily({ botId, page: 'singleton' }), [botId])
  const [chatState, setChatState] = useAtom(chatAtom)

  // 初期メッセージがある場合は設定
  useEffect(() => {
    if (initialMessages && initialMessages.length > 0) {
      console.log('Setting initial messages:', initialMessages);
      
      // ボットに会話履歴を設定
      chatState.bot.setConversationHistory({ messages: initialMessages });
      
      setChatState((draft) => {
        // 既存のメッセージがない場合のみ設定
        if (draft.messages.length === 0) {
          draft.messages = [...initialMessages]
        }
      })
    }
  }, [initialMessages, setChatState, chatState.bot])

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
    async (input: string, image?: File) => {

      const botMessageId = uuid()
      setChatState((draft) => {
        draft.messages.push(
          { id: uuid(), text: input, image, author: 'user' },
          { id: botMessageId, text: '', author: botId },
        )
      })

      const abortController = new AbortController()
      setChatState((draft) => {
        draft.generatingMessageId = botMessageId
        draft.abortController = abortController
      })

      let compressedImage: File | undefined = undefined
      if (image) {
        compressedImage = await compressImageFile(image)
      }

      const resp = await chatState.bot.sendMessage({
        prompt: input,
        image: compressedImage,
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
    [botId, chatState.bot, setChatState, updateMessage],
  )

  const modifyLastMessage = useCallback(
    async (text: string) => {
      chatState.bot.modifyLastMessage(text)

    // 最後のボットメッセージを見つけて更新
    setChatState((draft) => {
      const lastBotMessage = [...draft.messages].reverse().find(m => m.author === botId)
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
      setConversationMessages(botId, chatState.conversationId, chatState.messages)
    }
  }, [botId, chatState.conversationId, chatState.messages])

  const chat = useMemo(
    () => ({
      botId,
      bot: chatState.bot,
      messages: chatState.messages,
      sendMessage,
      resetConversation,
      generating: !!chatState.generatingMessageId,
      stopGenerating,
      modifyLastMessage
    }),
    [
      botId,
      chatState.bot,
      chatState.generatingMessageId,
      chatState.messages,
      resetConversation,
      sendMessage,
      stopGenerating,
      modifyLastMessage
    ],
  )

  return chat
}
