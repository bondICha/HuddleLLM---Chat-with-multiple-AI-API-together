import { FC } from 'react'
import { cx } from '~/utils'
import { useStickToBottom } from 'use-stick-to-bottom'
import { ChatMessageModel } from '~types'
import ChatMessageCard from './ChatMessageCard'
import ScrollToBottomButton from './ScrollToBottomButton'

interface Props {
  index: number
  messages: ChatMessageModel[]
  className?: string
  onPropaganda?: (text: string) => void
}

const ChatMessageList: FC<Props> = (props) => {
  const { scrollRef, contentRef, isAtBottom, scrollToBottom } = useStickToBottom({
    resize: 'smooth',
    initial: {
      mass: 1,
      damping: 0.2,
      stiffness: 500
    },
  })

  return (
    <div className="flex-1 relative overflow-hidden">
      <div ref={scrollRef} className="h-full overflow-auto custom-scrollbar">
        <div ref={contentRef} className={cx('flex flex-col gap-3', props.className)}>
          {props.messages.map((message, index) => {
            return (
              <ChatMessageCard
                key={`${message.id}-${message.text}`}
                message={message}
                className={index === 0 ? 'mt-5' : undefined}
                onPropaganda={props.onPropaganda}
              />
            )
          })}
        </div>
      </div>
      {!isAtBottom && <ScrollToBottomButton onClick={scrollToBottom} />}
    </div>
  )
}

export default ChatMessageList
