import { FC, useEffect } from 'react'
import { useSetAtom } from 'jotai'
import { useTranslation } from 'react-i18next'
import { useChat } from '~app/hooks/use-chat'
import ConversationPanel from '../components/Chat/ConversationPanel'
import { sessionToRestoreAtom } from '~app/state'
import { loadHistoryMessages } from '~services/chat-history'


interface Props {
  index: number
}

const SingleBotChatPanel: FC<Props> = ({ index }) => {
  const { t } = useTranslation()
  const setSessionToRestore = useSetAtom(sessionToRestoreAtom)
  const chat = useChat(index)

  // URL パラメータ経由の単体セッション復元（新規タブ復元用）
  useEffect(() => {
    const hash = window.location.hash
    const queryStart = hash.indexOf('?')
    if (queryStart === -1) return

    const params = new URLSearchParams(hash.substring(queryStart + 1))
    const restoreConversationId = params.get('restoreConversationId')
    if (!restoreConversationId) return

    ;(async () => {
      const conversations = await loadHistoryMessages(index)
      const found = conversations.some(c => c.id === restoreConversationId)
      if (!found) {
        alert(`${t('Restore Session')}: ${t('No sessions found.')}`)
        return
      }
      setSessionToRestore({
        type: 'single',
        botIndex: index,
        conversationId: restoreConversationId,
      })
    })()

    const newHash = hash.substring(0, queryStart)
    window.history.replaceState({}, '', window.location.pathname + newHash)
  }, [index, setSessionToRestore, t])

  return (
    <div className="overflow-hidden h-full">
      <ConversationPanel
        index={index}
        bot={chat.bot}
        messages={chat.messages}
        onUserSendMessage={(input, images, attachments, audioFiles) => chat.sendMessage(input, images, attachments, audioFiles)}
        generating={chat.generating}
        stopGenerating={chat.stopGenerating}
        resetConversation={chat.resetConversation}
        shouldAutoScroll={chat.shouldAutoScroll}
        setAutoScroll={chat.setAutoScroll}
      />
    </div>
  )
}

export default SingleBotChatPanel
