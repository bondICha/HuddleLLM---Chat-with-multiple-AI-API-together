import { cx } from '~/utils'
import { FC, memo, useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { CopyToClipboard } from 'react-copy-to-clipboard-ts'
import { IoCheckmarkSharp, IoCopyOutline, IoMegaphoneOutline as IoPropaganda } from 'react-icons/io5'
import { BsCheckAll } from "react-icons/bs";
import { LuCircleCheckBig } from "react-icons/lu";
import { BeatLoader } from 'react-spinners'
import { ChatMessageModel } from '~/types'
import Expandable from '../common/Expandable'
import Markdown from '../Markdown'
import MessageBubble from './MessageBubble'
import { useTranslation } from 'react-i18next'

const COPY_ICON_CLASS = 'self-top cursor-pointer invisible group-hover:visible mt-[6px] text-primary-text'
const RESET_TIMER_DURATION = 4000
const MESSAGE_HEIGHT_THRESHOLD = 200

interface Props {
  message: ChatMessageModel
  className?: string
  onPropaganda?: (text: string) => void
}

interface SimpleTooltipProps {
  content: string;
  children: React.ReactNode;
  align?: 'center' | 'left' | 'right'
}

const SimpleTooltip: FC<SimpleTooltipProps> = ({ content, children, align = 'center' }) => {
  const [hovered, setHovered] = useState(false)

  const tooltipPositionClasses = useMemo(() => {
    let baseClasses = `absolute bottom-full mb-2 whitespace-pre z-[100] 
    bg-black bg-opacity-85 text-white px-4 py-2 rounded-md text-sm 
    before:content-[''] before:absolute before:top-full before:border-8 
    before:border-transparent before:border-t-black before:border-opacity-90 `

  if (align === 'center') {
      return baseClasses + 'left-1/2 transform -translate-x-1/2 before:left-1/2 before:-translate-x-1/2'
  } else if (align === 'right') {
      return baseClasses + 'right-0 before:right-4'
    } else {
      return baseClasses + 'left-0 before:left-4'
  }
  }, [align])

  return (
    <span
      className="relative inline-block"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {children}
      {hovered && (
        <span className={tooltipPositionClasses}>
          {content}
        </span>
      )}
    </span>
  );
};

type ConfirmationStage = 'none' | 'confirm' | 'final'

const ChatMessageCard: FC<Props> = ({ message, className, onPropaganda }) => {
  const [copied, setCopied] = useState(false)
  const [messageHeight, setMessageHeight] = useState(0)
  const [confirmationStage, setConfirmationStage] = useState<ConfirmationStage>('none')
  const messageRef = useRef<HTMLDivElement>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const { t } = useTranslation()


  const imageUrls = useMemo(() => {
    return message.images ? message.images.map(img => URL.createObjectURL(img)) : []
  }, [message.images])

  const copyText = useMemo(() => {
    if (message.text) {
      return message.text
    }
    if (message.error) {
      return message.error.message
    }
  }, [message.error, message.text])

  useEffect(() => {
    if (copied) {
      const timer = setTimeout(() => setCopied(false), 1000)
      return () => clearTimeout(timer)
    }
  }, [copied])

  useEffect(() => {
    const updateHeight = () => {
      if (messageRef.current) {
        setMessageHeight(messageRef.current.offsetHeight)
      }
    }
    
    updateHeight()
    
    // ResizeObserverを使って動的に高さを監視
    const resizeObserver = new ResizeObserver(updateHeight)
    if (messageRef.current) {
      resizeObserver.observe(messageRef.current)
    }
    
    return () => {
      resizeObserver.disconnect()
    }
  }, [message.text, message.error, message.thinking])


  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  const resetConfirmation = useCallback(() => {
    setConfirmationStage('none')
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const startResetTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      setConfirmationStage('none')
      timerRef.current = null
    }, RESET_TIMER_DURATION)
  }, [])

  const handlePropagandaClick = useCallback(() => {
    if (confirmationStage === 'none') {
      setConfirmationStage('confirm')
      startResetTimer()
    } else if (confirmationStage === 'confirm') {
      if (timerRef.current) clearTimeout(timerRef.current)
      setConfirmationStage('final')
      onPropaganda?.(message.text ?? '')
      startResetTimer()
    }
  }, [confirmationStage, message.text, onPropaganda, startResetTimer])

  const getTooltipContent = useCallback(() => {
    if (confirmationStage === 'confirm') {
      return t("Propaganda action is irreversible.\nClick again to confirm.")
    } else if (confirmationStage === 'final') {
      return t("Confirmed.")
    } else {
      return t("Propaganda👊")
    }
  }, [confirmationStage, t])

  const ActionButton = useCallback(() => (
    <div className="flex flex-col">
      <CopyToClipboard text={copyText!} onCopy={() => setCopied(true)}>
        <button aria-label={copied ? "Copied" : "Copy"} className={COPY_ICON_CLASS}>
        {copied ? <IoCheckmarkSharp /> : <IoCopyOutline />}
      </button>
      </CopyToClipboard>
      {message.author !== 'user' && onPropaganda && (
        <SimpleTooltip align="right" content={getTooltipContent()}>
          <button
            aria-label={getTooltipContent()}
              className={COPY_ICON_CLASS}
              onClick={handlePropagandaClick}
          >
            {confirmationStage === 'confirm' ? (
              <LuCircleCheckBig />
            ) : confirmationStage === 'final' ? (
              <BsCheckAll />
          ) : (
              <IoPropaganda />
          )}
          </button>
        </SimpleTooltip>
      )}
    </div>
  ), [copied, copyText, message.author, onPropaganda, confirmationStage, getTooltipContent, handlePropagandaClick])

  return (
    <div
      className={cx(
        'group flex gap-2 w-full',
        message.author === 'user' ? 'flex-row-reverse' : 'flex-row',
        className,
      )}
    >
      <div ref={messageRef} className="flex flex-col max-w-fit items-start gap-2 min-w-0">
        <MessageBubble 
          color={message.author === 'user' ? 'primary' : 'flat'}
          thinking={message.thinking}
          searchResults={message.searchResults}
          isUserMessage={message.author === 'user'}
          fetchedUrls={message.fetchedUrls}
        >
          {imageUrls.length > 0 && (
            <div className="flex flex-wrap gap-2 my-2">
              {imageUrls.map((url, index) => (
                <img key={index} src={url} alt={`Uploaded content ${index + 1}`} className="max-w-xs" />
              ))}
            </div>
          )}
          {message.text ? (
            message.author === 'user' ? (
              <div style={{ whiteSpace: 'pre-line' }}>{message.text}</div>
            ) : (
              <Markdown>{message.text}</Markdown>
            )
          ) : (
            !message.error && (
              <BeatLoader size={10} className="leading-tight" color="rgb(var(--primary-text))" />
            )
          )}
          {!!message.error && (
            <div className="text-[#cc0000] dark:text-[#ff0033] space-y-1">
              <p>{message.error.message}</p>
              {message.error.cause && (
                <Expandable
                  header={<p className="text-sm opacity-80">({t('Error Details')})</p>}
                  initiallyExpanded={false}
                >
                  <pre className="whitespace-pre-wrap text-sm">
                    {(() => {
                      try {
                        const causeObj = typeof message.error.cause === 'string'
                          ? JSON.parse(message.error.cause)
                          : message.error.cause;
                        return JSON.stringify(causeObj, null, 2);
                      } catch {
                        return String(message.error.cause);
                      }
                    })()}
                  </pre>
                </Expandable>
              )}
            </div>
          )}
        </MessageBubble>
      </div>
      {!!copyText && (
        <div className="flex flex-col justify-between py-1 self-stretch">
          <ActionButton />
          {messageHeight > MESSAGE_HEIGHT_THRESHOLD && <ActionButton />}
        </div>
      )}
    </div>
  )
}

export default memo(ChatMessageCard)
