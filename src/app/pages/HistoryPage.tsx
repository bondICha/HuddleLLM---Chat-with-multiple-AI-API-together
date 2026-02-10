import { FC, memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation } from '@tanstack/react-router'
import Browser from 'webextension-polyfill'
import { useTranslation } from 'react-i18next'
import { FiSearch } from 'react-icons/fi'
import { ViewportList } from 'react-viewport-list'
import PagePanel from '~app/components/Page'
import SessionCard from '~app/components/History/SessionCard'
import { MigrationProgress } from '~app/components/MigrationProgress'
import {
  loadAllInOneSessions,
  loadHistoryMessages,
  loadSessionSnapshots,
  isMigrationCompleted,
  loadSessionIndexV2,
  loadSessionsByIds,
} from '~services/chat-history'
import { getUserConfig } from '~services/user-config'
import { cx } from '~utils'

type ActiveTab = 'allInOne' | 'individual'

type SessionListItem =
  | {
      type: 'sessionSnapshot'
      sessionUUID: string
      createdAt: number
      lastUpdated: number
      messageCount: number
      botIndices: number[]
      layout: string
      pairName?: string
      firstMessage?: string
      botResponses?: { botName: string; response: string; botIcon?: string }[]
      botNames?: string[]
      botIcons?: string[]
      // Performance optimization: pre-computed fields
      _sessionKey: string
      _searchString: string
    }
  | {
      type: 'allInOneLegacy'
      sessionId: string
      createdAt: number
      lastUpdated: number
      messageCount: number
      botIndices: number[]
      layout: string
      pairName?: string
      firstMessage?: string
      botResponses?: { botName: string; response: string; botIcon?: string }[]
      botNames?: string[]
      botIcons?: string[]
      // Performance optimization: pre-computed fields
      _sessionKey: string
      _searchString: string
    }
  | {
      type: 'single'
      botIndex: number
      conversationId: string
      createdAt: number
      lastUpdated: number
      messageCount: number
      firstMessage?: string
      lastMessage?: string
      botNames?: string[]
      botIcons?: string[]
      // Performance optimization: pre-computed fields
      _sessionKey: string
      _searchString: string
    }


const SearchInput: FC<{ value: string; onChange: (v: string) => void }> = memo((props) => {
  const { t } = useTranslation()
  return (
    <div className="rounded-xl bg-secondary h-9 flex flex-row items-center px-4 grow">
      <FiSearch size={18} className="mr-[6px] opacity-30" />
      <input
        className={cx('bg-transparent w-full outline-none text-sm')}
        placeholder={t('Full-text search for chat history') as string}
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
      />
    </div>
  )
})
SearchInput.displayName = 'SearchInput'

const HistoryPage: FC = () => {
  const { t } = useTranslation()
  const location = useLocation()

  const [activeTab, setActiveTab] = useState<ActiveTab>('allInOne')
  const [selectedSessionKey, setSelectedSessionKey] = useState<string | null>(null)

  const [loadingSessions, setLoadingSessions] = useState(false)
  const [sessions, setSessions] = useState<SessionListItem[]>([])
  const [sessionSearch, setSessionSearch] = useState('')
  const [sessionVisibleCount, setSessionVisibleCount] = useState(100)
  const sessionCardRefs = useRef<Map<string, HTMLDivElement | null>>(new Map())
  const sessionListRef = useRef<HTMLDivElement | null>(null)

  const clearHashQuery = useCallback(() => {
    const hash = window.location.hash
    const queryStart = hash.indexOf('?')
    if (queryStart === -1) return
    const newHash = hash.substring(0, queryStart)
    window.history.replaceState({}, '', window.location.pathname + newHash)
  }, [])

  useEffect(() => {
    const hash = window.location.hash
    const queryStart = hash.indexOf('?')
    if (queryStart === -1) return

    const params = new URLSearchParams(hash.substring(queryStart + 1))
    const tab = params.get('tab')
    if (tab === 'individual') {
      setActiveTab('individual')
      clearHashQuery()
      return
    }
    if (tab === 'allInOne') {
      setActiveTab('allInOne')
      clearHashQuery()
      return
    }
    const idx = params.get('botIndex')
    if (idx && /^\d+$/.test(idx)) clearHashQuery()
  }, [location.hash, location.search])

  const loadSessionsData = useCallback(async () => {
    setLoadingSessions(true)
    try {
      const config = await getUserConfig()
      const botNames = (config.customApiConfigs || []).map((c, i) => c.name || `Bot ${i + 1}`)
      const botIcons = (config.customApiConfigs || []).map((c) => c.avatar || '')
      const all: SessionListItem[] = []
      const excludedByBotPrefix = new Map<number, Map<string, number>>()

      const upsertExclude = (botIndex: number, prefixSig: string, minLen: number) => {
        if (!prefixSig || minLen <= 0) return
        const botMap = excludedByBotPrefix.get(botIndex) || new Map<string, number>()
        botMap.set(prefixSig, Math.max(botMap.get(prefixSig) || 0, minLen))
        excludedByBotPrefix.set(botIndex, botMap)
      }

      const prefixSigOf = (messages: any[]) => {
        if (!Array.isArray(messages) || messages.length === 0) return ''
        const ids = messages
          .map((m) => (m && typeof m.id === 'string' ? m.id : ''))
          .filter(Boolean)
          .slice(0, 3)
        return ids.join('|')
      }

      const snapshots = await loadSessionSnapshots()
      for (const s of snapshots) {
        const allMessages = Object.values(s.conversations || {}).flat()
        const firstUserMsg = allMessages.find((m: any) => m.author === 'user' && typeof m.text === 'string' && m.text.trim() !== '')

        if (s.botIndices && s.conversations) {
          for (const botIndex of s.botIndices) {
            const msgs = (s.conversations as any)[botIndex] || []
            upsertExclude(botIndex, prefixSigOf(msgs), Array.isArray(msgs) ? msgs.length : 0)
          }
        }

        const botResponses: { botName: string; response: string; botIcon?: string }[] = []
        if (s.botIndices && s.conversations) {
          for (const botIndex of s.botIndices) {
            const msgs = (s.conversations as any)[botIndex] || []
            const botName = botNames[botIndex] || `Bot ${botIndex + 1}`
            const botIcon = botIcons[botIndex]
            const lastAssistant = Array.isArray(msgs)
              ? msgs.findLast((m: any) => m && m.author !== 'user' && typeof m.text === 'string' && m.text.trim() !== '')
              : undefined
            if (lastAssistant?.text) {
              botResponses.push({ botName, response: String(lastAssistant.text), botIcon })
            }
          }
        }

        const sessionKey = `snap:${s.sessionUUID}`
        const sessionBotNames = s.botIndices?.map((idx: number) => botNames[idx] || `Bot ${idx + 1}`) || []
        const searchString = [
          sessionBotNames.join(' '),
          firstUserMsg?.text ? String(firstUserMsg.text) : '',
          s.pairName || '',
          ...botResponses.map((r) => r.response),
        ].join(' ').toLowerCase()

        all.push({
          type: 'sessionSnapshot',
          sessionUUID: s.sessionUUID,
          createdAt: s.createdAt,
          lastUpdated: s.lastUpdated,
          messageCount: s.totalMessageCount,
          botIndices: s.botIndices,
          layout: s.layout,
          pairName: s.pairName,
          firstMessage: firstUserMsg?.text ? String(firstUserMsg.text) : undefined,
          botResponses: botResponses.length ? botResponses : undefined,
          botNames: sessionBotNames,
          botIcons: s.botIndices?.map((idx: number) => botIcons[idx] || ''),
          _sessionKey: sessionKey,
          _searchString: searchString,
        })
      }

      // Legacy All-In-One sessions (pre sessionSnapshots)
      const legacyAllInOneSessions = await loadAllInOneSessions()
      for (const s of legacyAllInOneSessions) {
        const allMessages = Object.values(s.conversations || {}).flatMap((convs: any[]) =>
          Array.isArray(convs) ? convs.flatMap((c: any) => c.messages || []) : [],
        )
        const firstUserMsg = allMessages.find(
          (m: any) => m.author === 'user' && typeof m.text === 'string' && m.text.trim() !== '',
        )

        const sessionKey = `aio:${s.id}`
        const sessionBotNames = s.botIndices?.map((idx: number) => botNames[idx] || `Bot ${idx + 1}`) || []
        const searchString = [
          sessionBotNames.join(' '),
          firstUserMsg?.text ? String(firstUserMsg.text) : '',
          s.pairName || '',
        ].join(' ').toLowerCase()

        all.push({
          type: 'allInOneLegacy',
          sessionId: s.id,
          createdAt: s.createdAt,
          lastUpdated: s.lastUpdated,
          messageCount: s.messageCount || 0,
          botIndices: s.botIndices,
          layout: s.layout,
          pairName: s.pairName,
          firstMessage: firstUserMsg?.text ? String(firstUserMsg.text) : undefined,
          botNames: sessionBotNames,
          botIcons: s.botIndices?.map((idx: number) => botIcons[idx] || ''),
          _sessionKey: sessionKey,
          _searchString: searchString,
        })

        if (s.botIndices && s.conversations) {
          const botResponses: { botName: string; response: string; botIcon?: string }[] = []
          for (const botIndex of s.botIndices) {
            const targetConversationId = (s as any).conversationSnapshots?.[botIndex] || (s.conversations as any)[botIndex]?.[0]?.id
            const convs = (s.conversations as any)[botIndex] || []
            const target = targetConversationId ? convs.find((c: any) => c.id === targetConversationId) : convs[0]
            if (target && Array.isArray(target.messages)) {
              upsertExclude(botIndex, prefixSigOf(target.messages), target.messages.length)
              const botName = botNames[botIndex] || `Bot ${botIndex + 1}`
              const botIcon = botIcons[botIndex]
              const lastAssistant = target.messages.findLast((m: any) => m && m.author !== 'user' && typeof m.text === 'string' && m.text.trim() !== '')
              if (lastAssistant?.text) {
                botResponses.push({ botName, response: String(lastAssistant.text), botIcon })
              }
            }
          }

          if (botResponses.length) {
            const lastSession = all[all.length - 1]
            const updatedSearchString = [
              lastSession._searchString,
              ...botResponses.map((r) => r.response),
            ].join(' ').toLowerCase()

            all[all.length - 1] = {
              ...(all[all.length - 1] as any),
              botResponses,
              _searchString: updatedSearchString,
            }
          }
        }
      }

      const botCount = (config.customApiConfigs || []).length
      for (let i = 0; i < botCount; i++) {
        const conversations = await loadHistoryMessages(i)
        for (const c of conversations) {
          const pfx = prefixSigOf(c.messages)
          const minLen = excludedByBotPrefix.get(i)?.get(pfx)
          if (minLen && Array.isArray(c.messages) && c.messages.length >= minLen) {
            continue
          }
          const firstUserMsg = c.messages.find((m: any) => m.author === 'user' && typeof m.text === 'string' && m.text.trim() !== '')
          const lastAssistant = c.messages.findLast((m: any) => m && m.author !== 'user' && typeof m.text === 'string' && m.text.trim() !== '')

          const sessionKey = `single:${i}:${c.id}`
          const botName = botNames[i] || `Bot ${i + 1}`
          const searchString = [
            botName,
            firstUserMsg?.text ? String(firstUserMsg.text) : '',
            lastAssistant?.text ? String(lastAssistant.text) : '',
          ].join(' ').toLowerCase()

          all.push({
            type: 'single',
            botIndex: i,
            conversationId: c.id,
            createdAt: c.createdAt,
            lastUpdated: c.createdAt,
            messageCount: c.messages.length,
            firstMessage: firstUserMsg?.text ? String(firstUserMsg.text) : undefined,
            lastMessage: lastAssistant?.text ? String(lastAssistant.text) : undefined,
            botNames: [botName],
            botIcons: [botIcons[i] || ''],
            _sessionKey: sessionKey,
            _searchString: searchString,
          })
        }
      }

      all.sort((a, b) => b.lastUpdated - a.lastUpdated)
      setSessions(all)
    } finally {
      setLoadingSessions(false)
    }
  }, [])

  useEffect(() => {
    loadSessionsData()
  }, [loadSessionsData])

  useEffect(() => {
    setSessionVisibleCount(100)
    setSelectedSessionKey(null)
  }, [activeTab, sessionSearch])

  useEffect(() => {
    if (!selectedSessionKey) return
    const target = sessionCardRefs.current.get(selectedSessionKey)
    if (!target) return
    requestAnimationFrame(() => {
      target.scrollIntoView({ block: 'center', behavior: 'smooth' })
    })
  }, [selectedSessionKey])

  const baseSessionsByTab = useMemo(() => {
    const allInOne = sessions.filter((s) => s.type === 'sessionSnapshot' || s.type === 'allInOneLegacy')
    const individual = sessions.filter((s) => s.type === 'single')
    return activeTab === 'allInOne' ? allInOne : individual
  }, [activeTab, sessions])

  const filteredSessions = useMemo(() => {
    if (!sessionSearch.trim()) return baseSessionsByTab
    const q = sessionSearch.toLowerCase()
    return baseSessionsByTab.filter((s) => s._searchString.includes(q))
  }, [baseSessionsByTab, sessionSearch])

  const visibleSessions = useMemo(() => {
    return filteredSessions.slice(0, sessionVisibleCount)
  }, [filteredSessions, sessionVisibleCount])

  const canLoadMoreSessions = useMemo(() => {
    if (loadingSessions) return false
    return sessionVisibleCount < filteredSessions.length
  }, [filteredSessions.length, loadingSessions, sessionVisibleCount])

  const sessionStatsText = useMemo(() => {
    return t('History sessions stats', {
      loaded: baseSessionsByTab.length,
      matched: filteredSessions.length,
      shown: visibleSessions.length,
    })
  }, [baseSessionsByTab.length, filteredSessions.length, t, visibleSessions.length])

  const loadMoreSessions = useCallback(
    (count: number) => {
      setSessionVisibleCount((prev) => Math.min(prev + count, filteredSessions.length))
    },
    [filteredSessions.length],
  )

  const openAppTab = useCallback(async (hashPath: string) => {
    const url = `${Browser.runtime.getURL('app.html')}${hashPath}`
    await Browser.tabs.create({ url })
  }, [])

  const restoreSession = useCallback(
    async (item: SessionListItem) => {
      if (item.type === 'sessionSnapshot') {
        await openAppTab(`#/?restoreSessionUUID=${encodeURIComponent(item.sessionUUID)}`)
        return
      }
      if (item.type === 'allInOneLegacy') {
        await openAppTab(`#/?restoreAllInOneSessionId=${encodeURIComponent(item.sessionId)}`)
        return
      }
      await openAppTab(
        `#/chat/custom/${item.botIndex}?restoreConversationId=${encodeURIComponent(item.conversationId)}`,
      )
    },
    [openAppTab],
  )


  return (
    <PagePanel title={t('View history') as string}>
      <MigrationProgress showOnHistoryPage onMigrationComplete={loadSessionsData} />
      <div className="px-10 pb-4 h-full flex flex-col">
        <div className="flex flex-row items-center justify-between gap-3 my-2">
          <div className="flex flex-row gap-1 bg-secondary/30 p-1 rounded-xl">
            <button
              className={cx(
                'px-4 py-2 rounded-lg text-sm font-medium transition-all',
                activeTab === 'allInOne'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-primary-text/70 hover:text-primary-text hover:bg-secondary/50',
              )}
              onClick={() => setActiveTab('allInOne')}
            >
              {t('All-In-One')}
            </button>
            <button
              className={cx(
                'px-4 py-2 rounded-lg text-sm font-medium transition-all',
                activeTab === 'individual'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-primary-text/70 hover:text-primary-text hover:bg-secondary/50',
              )}
              onClick={() => setActiveTab('individual')}
            >
              {t('Individual bot')}
            </button>
          </div>
        </div>
        <div className="flex flex-row items-center gap-3 my-2">
          <SearchInput value={sessionSearch} onChange={setSessionSearch} />
        </div>
        <div className="text-xs text-primary-text opacity-85 mb-1 px-1 font-medium">{sessionStatsText}</div>

        {/* Scrollable session list container */}
        <div
          ref={sessionListRef}
          className="overflow-y-auto custom-scrollbar flex-1 min-h-0 mb-1"
        >
          {loadingSessions && (
            <div className="text-sm text-primary-text opacity-85 text-center py-8">{t('Loading sessions...')}</div>
          )}
          {!loadingSessions && filteredSessions.length === 0 && (
            <div className="text-sm text-primary-text opacity-85 text-center py-8 border border-dashed border-primary-border rounded-xl">
              {t('No sessions found.')}
            </div>
          )}
          {!loadingSessions && visibleSessions.length > 0 && (
            <div className="pr-1">
              <ViewportList
                viewportRef={sessionListRef}
                items={visibleSessions}
                initialAlignToTop={true}
              >
                {(s) => {
                  const sessionKey = s._sessionKey
                  const isSelected = selectedSessionKey === sessionKey
                  return (
                    <div
                      key={sessionKey}
                      className="mb-3"
                      ref={(node) => {
                        sessionCardRefs.current.set(sessionKey, node)
                      }}
                    >
                      <SessionCard
                        session={s}
                        isSelected={isSelected}
                        onToggleSelect={() => setSelectedSessionKey((prev) => (prev === sessionKey ? null : sessionKey))}
                        onRestore={() => restoreSession(s)}
                      />
                    </div>
                  )
                }}
              </ViewportList>
            </div>
          )}
        </div>

        {/* Load more buttons outside scrollable area */}
        {canLoadMoreSessions && (
          <div className="flex flex-row items-center justify-center gap-2 py-2">
            <button
              className="px-3 py-1.5 rounded-xl text-sm font-medium border border-primary-border hover:bg-secondary/50 transition-colors"
              onClick={() => loadMoreSessions(100)}
            >
              {t('Load 100 more')}
            </button>
            <button
              className="px-3 py-1.5 rounded-xl text-sm font-medium border border-primary-border hover:bg-secondary/50 transition-colors"
              onClick={() => loadMoreSessions(500)}
            >
              {t('Load 500 more')}
            </button>
          </div>
        )}
      </div>
    </PagePanel>
  )
}

export default HistoryPage
