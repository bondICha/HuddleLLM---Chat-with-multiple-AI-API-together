import { FC, forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import Browser from 'webextension-polyfill'
import { useChat } from '~app/hooks/use-chat'
import { getUserConfig } from '~services/user-config'
import Button from '~app/components/Button'
import ChatMessageList from '~app/components/Chat/ChatMessageList'

// ============================================================
// Serializable types for chrome.storage.session
// ============================================================

export interface StoredMessage {
  author: number | 'user'
  text: string
}

export interface StoredChatEntry {
  index: number
  messages: StoredMessage[]
}

export interface BtwStorageContext {
  query: string
  chats: StoredChatEntry[]
  sessionName?: string
}

// ============================================================
// BtwChatInner — chat logic (adapted from BtwDrawer)
// ============================================================

interface InnerHandle {
  send: (text: string) => void
}

interface InnerProps {
  botIndex: number
  chats: StoredChatEntry[]
  botNames: Record<number, string>
}

const BtwChatInner = forwardRef<InnerHandle, InnerProps>(({ botIndex, chats, botNames }, ref) => {
  const { t } = useTranslation()
  const btwChat = useChat(botIndex, 'btw')

  const buildContextPrefix = useCallback((): string | undefined => {
    const activePanels = chats.filter((c) => c.messages.length > 0)
    if (activePanels.length === 0) return undefined

    const panelTurns = activePanels.map((c) => {
      const name = botNames[c.index] || `Bot ${c.index + 1}`
      const pairs: Array<{ user: string; bot: string }> = []
      let i = 0
      while (i < c.messages.length) {
        const msg = c.messages[i]
        if (msg.author === 'user') {
          const userText = msg.text || ''
          const nextMsg = c.messages[i + 1]
          const botText =
            nextMsg && nextMsg.author !== 'user' ? nextMsg.text || '' : ''
          pairs.push({ user: userText, bot: botText })
          i += 2
        } else {
          i++
        }
      }
      return { name, pairs }
    })

    const maxTurns = Math.max(...panelTurns.map((p) => p.pairs.length))
    const systemPrompt = t('Btw context preamble')
    const comparisonPrompt = t('Btw comparison System-prompt')
    const lines: string[] = [systemPrompt, '']

    for (let turnIdx = 0; turnIdx < maxTurns; turnIdx++) {
      for (const panel of panelTurns) {
        const pair = panel.pairs[turnIdx]
        if (!pair) continue
        lines.push(`user: ${pair.user}`)
        if (pair.bot) {
          lines.push(`${panel.name}: ${pair.bot}`)
        }
      }
      lines.push('')
    }

    lines.push(comparisonPrompt)

    return lines.join('\n').trimEnd()
  }, [chats, botNames, t])

  useImperativeHandle(
    ref,
    () => ({
      send: (text: string) => {
        if (!text.trim() || btwChat.generating) return
        const contextPrefix = buildContextPrefix()
        btwChat.sendMessage(text, undefined, undefined, undefined, undefined, undefined, contextPrefix)
      },
    }),
    [btwChat, buildContextPrefix],
  )

  if (btwChat.messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-secondary-text text-sm px-6 text-center">
        {t('Btw empty state')}
      </div>
    )
  }

  return (
    <ChatMessageList
      index={botIndex}
      messages={btwChat.messages}
      shouldAutoScroll={btwChat.shouldAutoScroll}
      setAutoScroll={btwChat.setAutoScroll}
    />
  )
})

BtwChatInner.displayName = 'BtwChatInner'

// ============================================================
// BtwPage — full-page popup UI
// ============================================================

const BtwPage: FC = () => {
  const { t } = useTranslation()

  const [context, setContext] = useState<BtwStorageContext | null>(null)
  const [botNames, setBotNames] = useState<Record<number, string>>({})
  const [selectedBotIndex, setSelectedBotIndex] = useState<number>(0)
  const [inputText, setInputText] = useState('')

  const chatInnerRef = useRef<InnerHandle>(null)
  const sentInitialRef = useRef(false)

  // Load context from storage
  useEffect(() => {
    Browser.storage.session.get('btwContext').then((data) => {
      const ctx = (data as { btwContext?: BtwStorageContext }).btwContext
      if (ctx) {
        setContext(ctx)
        setSelectedBotIndex(ctx.chats[0]?.index ?? 0)
        const name = ctx.sessionName
        document.title = name ? `BTW: ${name} - HuddleLLM` : 'BTW: HuddleLLM'
      }
    })
  }, [])

  // Load bot names
  useEffect(() => {
    if (!context) return
    getUserConfig().then((config) => {
      const names: Record<number, string> = {}
      context.chats.forEach((c) => {
        const botConfig = config.customApiConfigs?.[c.index]
        names[c.index] = botConfig?.name || `Bot ${c.index + 1}`
      })
      setBotNames(names)
    })
  }, [context])

  // Keep selectedBotIndex valid when context loads
  const chatIndicesKey = useMemo(() => context?.chats.map((c) => c.index).join(',') ?? '', [context])
  useEffect(() => {
    if (!context) return
    const indices = context.chats.map((c) => c.index)
    if (indices.length > 0 && !indices.includes(selectedBotIndex)) {
      setSelectedBotIndex(indices[0])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatIndicesKey])

  // Send initial query once
  useEffect(() => {
    if (!context?.query || sentInitialRef.current) return
    sentInitialRef.current = true
    const timer = setTimeout(() => {
      chatInnerRef.current?.send(context.query)
    }, 150)
    return () => clearTimeout(timer)
  }, [context])

  const handleSend = useCallback(() => {
    const text = inputText.trim()
    if (!text) return
    chatInnerRef.current?.send(text)
    setInputText('')
  }, [inputText])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        handleSend()
      }
    },
    [handleSend],
  )

  if (!context) {
    return (
      <div className="flex items-center justify-center h-screen bg-primary-background text-secondary-text text-sm">
        {t('Loading')}
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen bg-primary-background text-primary-text">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-2 border-b border-primary-border shrink-0">
        <span className="font-semibold text-sm text-btw">By The Way</span>
        {context.chats.length > 1 && (
          <div className="flex items-center gap-2 ml-auto shrink-0">
            <span className="text-xs text-secondary-text">{t('Btw bot selector label')}:</span>
            <select
              className="text-xs rounded-md border border-primary-border bg-primary-background text-primary-text px-2 py-1 focus:outline-none focus:border-primary-blue"
              value={selectedBotIndex}
              onChange={(e) => setSelectedBotIndex(Number(e.target.value))}
            >
              {context.chats.map((c) => (
                <option key={c.index} value={c.index}>
                  {botNames[c.index] || `Bot ${c.index + 1}`}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Chat area */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <BtwChatInner
          key={selectedBotIndex}
          ref={chatInnerRef}
          botIndex={selectedBotIndex}
          chats={context.chats}
          botNames={botNames}
        />
      </div>

      {/* Input area */}
      <div className="flex items-center gap-2 px-4 py-3 border-t border-primary-border shrink-0">
        <input
          className="flex-1 text-sm bg-secondary rounded-xl px-3 py-2 outline-none text-primary-text placeholder:text-light-text"
          placeholder={t('Btw input placeholder')}
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={handleKeyDown}
          autoFocus
        />
        <Button text={t('Send')} color="primary" onClick={handleSend} disabled={!inputText.trim()} />
      </div>
    </div>
  )
}

export default BtwPage
