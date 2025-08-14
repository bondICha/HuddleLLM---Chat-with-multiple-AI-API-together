import { cx } from '~/utils'
import { FC, PropsWithChildren } from 'react'
import Thinking from './Thinking'
import FetchedContentThinking from './FetchedContentThinking'
import type { FetchedUrlContent } from '~types/chat'

interface Props {
  color: 'primary' | 'flat'
  className?: string
  thinking?: string
  isUserMessage?: boolean
  fetchedUrls?: FetchedUrlContent[]
}

const MessageBubble: FC<PropsWithChildren<Props>> = (props) => {
  return (
    <div
      className={cx(
        'rounded-[15px] px-3 py-2 w-full',
        props.color === 'primary' ? 'bg-primary-blue text-white primary-message-bubble' : 'bg-secondary text-primary-text',
        props.className,
      )}
    >
      {props.thinking && !props.fetchedUrls && (
        props.isUserMessage ? 
          <FetchedContentThinking>{props.thinking}</FetchedContentThinking> : 
          <Thinking>{props.thinking}</Thinking>
      )}
      {props.fetchedUrls && props.fetchedUrls.map((fetchedUrl, index) => (
        <FetchedContentThinking key={`${fetchedUrl.url}-${index}`} url={fetchedUrl.url}>
          {fetchedUrl.content}
        </FetchedContentThinking>
      ))}
      {props.children}
    </div>
  )
}

export default MessageBubble
