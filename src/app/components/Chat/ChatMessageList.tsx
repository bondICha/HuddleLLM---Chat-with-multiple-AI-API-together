import { FC, useEffect } from 'react'
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
  shouldAutoScroll?: boolean
}

const ChatMessageList: FC<Props> = (props) => {
  const { scrollRef, contentRef, isAtBottom, scrollToBottom, stopScroll } = useStickToBottom({
    resize: 'smooth',
    initial: {
      mass: 0.8,
      damping: 0.7,
      stiffness: 0.1
    },
  })

  // shouldAutoScrollがfalseの場合はスクロールを停止、trueの場合はスクロールを再開
  useEffect(() => {
    if (props.shouldAutoScroll === false) {
      stopScroll()
    } else {
      // shouldAutoScrollがtrueになったら最下部にスクロール
      scrollToBottom()
    }
  }, [props.shouldAutoScroll, stopScroll, scrollToBottom])

  // 新しいメッセージが追加されたときに自動スクロールを確認
  useEffect(() => {
    if (props.shouldAutoScroll) {
      scrollToBottom()
    }
  }, [props.messages, props.shouldAutoScroll, scrollToBottom])

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
