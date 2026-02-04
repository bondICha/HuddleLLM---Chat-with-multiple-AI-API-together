import { FC } from 'react'
import { useChat } from '~app/hooks/use-chat'
import ConversationPanel from '../components/Chat/ConversationPanel'
import { getUserConfig } from '~services/user-config'


interface Props {
  index: number
}

const SingleBotChatPanel: FC<Props> = ({ index }) => {
  const chat = useChat(index)
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
