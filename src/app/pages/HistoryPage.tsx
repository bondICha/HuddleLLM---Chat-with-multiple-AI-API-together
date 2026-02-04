import { FC, Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from '@tanstack/react-router'
import Browser from 'webextension-polyfill'
import { useTranslation } from 'react-i18next'
import dayjs from 'dayjs'
import { VscClearAll } from 'react-icons/vsc'
import { FiSearch } from 'react-icons/fi'
import PagePanel from '~app/components/Page'
import Select from '~app/components/Select'
import Tooltip from '~app/components/Tooltip'
import { clearHistoryMessages, loadHistoryMessages, loadSessionSnapshots } from '~services/chat-history'
import { getUserConfig } from '~services/user-config'
import HistoryContent from '~app/components/History/Content'
import { cx } from '~utils'

type ActiveTab = 'sessions' | 'bot'

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
      botNames?: string[]
    }
  | {
      type: 'single'
      botIndex: number
      conversationId: string
      createdAt: number
      lastUpdated: number
      messageCount: number
      firstMessage?: string
      botNames?: string[]
    }

const SearchInput: FC<{ value: string; onChange: (v: string) => void }> = (props) => {
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
}

const HistoryPage: FC = () => {
  const { t } = useTranslation()
  const location = useLocation()
  const navigate = useNavigate()

  const [activeTab, setActiveTab] = useState<ActiveTab>('sessions')
  const [botIndex, setBotIndex] = useState('0')
  const [keyword, setKeyword] = useState('')
  const [selectedSessionKey, setSelectedSessionKey] = useState<string | null>(null)

  const [loadingSessions, setLoadingSessions] = useState(false)
  const [sessions, setSessions] = useState<SessionListItem[]>([])
  const [sessionSearch, setSessionSearch] = useState('')
  const [sessionVisibleCount, setSessionVisibleCount] = useState(100)

  const [botOptions, setBotOptions] = useState<{ name: string; value: string }[]>([])

  const botIndexNum = useMemo(() => {
    const n = parseInt(botIndex, 10)
    return Number.isFinite(n) ? n : 0
  }, [botIndex])

  useEffect(() => {
    const loadBotOptions = async () => {
      const config = await getUserConfig()
      const customApiConfigs = config.customApiConfigs || []
      const options = customApiConfigs.map((c, index) => ({ name: c.name || `Bot ${index + 1}`, value: index.toString() }))
      setBotOptions(options)
      const idx = parseInt(botIndex, 10)
      if (options.length > 0 && (!Number.isFinite(idx) || idx >= options.length)) {
        setBotIndex('0')
      }
    }
    loadBotOptions()
  }, [])

  useEffect(() => {
    const hash = window.location.hash
    const queryStart = hash.indexOf('?')
    if (queryStart === -1) return

    const params = new URLSearchParams(hash.substring(queryStart + 1))
    const tab = params.get('tab')
    const idx = params.get('botIndex')

    if (tab === 'bot') setActiveTab('bot')
    if (tab === 'sessions') setActiveTab('sessions')
    if (idx && /^\d+$/.test(idx)) {
      setBotIndex(idx)
      setActiveTab('bot')
    }
  }, [location.hash, location.search])

  const loadSessionsData = useCallback(async () => {
    setLoadingSessions(true)
    try {
      const config = await getUserConfig()
      const botNames = (config.customApiConfigs || []).map((c, i) => c.name || `Bot ${i + 1}`)
      const all: SessionListItem[] = []

      const snapshots = await loadSessionSnapshots()
      for (const s of snapshots) {
        const allMessages = Object.values(s.conversations || {}).flat()
        const firstUserMsg = allMessages.find((m: any) => m.author === 'user' && typeof m.text === 'string' && m.text.trim() !== '')
        all.push({
          type: 'sessionSnapshot',
          sessionUUID: s.sessionUUID,
          createdAt: s.createdAt,
          lastUpdated: s.lastUpdated,
          messageCount: s.totalMessageCount,
          botIndices: s.botIndices,
          layout: s.layout,
          pairName: s.pairName,
          firstMessage: firstUserMsg?.text ? String(firstUserMsg.text).slice(0, 120) : undefined,
          botNames: s.botIndices?.map((idx: number) => botNames[idx] || `Bot ${idx + 1}`),
        })
      }

      const botCount = (config.customApiConfigs || []).length
      for (let i = 0; i < botCount; i++) {
        const conversations = await loadHistoryMessages(i)
        for (const c of conversations) {
          const firstUserMsg = c.messages.find((m: any) => m.author === 'user' && typeof m.text === 'string' && m.text.trim() !== '')
          all.push({
            type: 'single',
            botIndex: i,
            conversationId: c.id,
            createdAt: c.createdAt,
            lastUpdated: c.createdAt,
            messageCount: c.messages.length,
            firstMessage: firstUserMsg?.text ? String(firstUserMsg.text).slice(0, 120) : undefined,
            botNames: [botNames[i] || `Bot ${i + 1}`],
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
    if (activeTab !== 'sessions') return
    loadSessionsData()
  }, [activeTab, loadSessionsData])

  useEffect(() => {
    if (activeTab !== 'sessions') return
    setSessionVisibleCount(100)
    setSelectedSessionKey(null)
  }, [activeTab, sessionSearch])

  const filteredSessions = useMemo(() => {
    if (!sessionSearch.trim()) return sessions
    const q = sessionSearch.toLowerCase()
    return sessions.filter((s) => {
      const names = (s.botNames || []).join(' ').toLowerCase()
      const firstMsg = (s.firstMessage || '').toLowerCase()
      const pairName = ('pairName' in s ? (s.pairName || '') : '').toLowerCase()
      return names.includes(q) || firstMsg.includes(q) || pairName.includes(q)
    })
  }, [sessions, sessionSearch])

  const visibleSessions = useMemo(() => {
    if (sessionSearch.trim()) return filteredSessions
    return filteredSessions.slice(0, sessionVisibleCount)
  }, [filteredSessions, sessionSearch, sessionVisibleCount])

  const canLoadMoreSessions = useMemo(() => {
    if (loadingSessions) return false
    if (sessionSearch.trim()) return false
    return sessionVisibleCount < filteredSessions.length
  }, [filteredSessions.length, loadingSessions, sessionSearch, sessionVisibleCount])

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
      await openAppTab(
        `#/chat/custom/${item.botIndex}?restoreConversationId=${encodeURIComponent(item.conversationId)}`,
      )
    },
    [openAppTab],
  )

  const clearAll = useCallback(async () => {
    if (confirm(t('Are you sure you want to clear history messages?')!)) {
      await clearHistoryMessages(botIndexNum)
    }
  }, [botIndexNum, t])

  const goToChat = useCallback(() => {
    navigate({ to: '/' })
  }, [navigate])

  const getSessionKey = useCallback((s: SessionListItem) => {
    return s.type === 'sessionSnapshot' ? `snap:${s.sessionUUID}` : `single:${s.botIndex}:${s.conversationId}`
  }, [])

  return (
    <PagePanel title={t('View history') as string}>
      <div className="mx-10 my-4 flex flex-row items-center justify-between gap-3">
        <div className="flex flex-row gap-2">
          <button
            className={cx(
              'px-3 py-1.5 rounded-xl text-sm border border-primary-border',
              activeTab === 'sessions' ? 'bg-secondary' : 'hover:bg-secondary/50',
            )}
            onClick={() => setActiveTab('sessions')}
          >
            {t('Restore Session')}
          </button>
          <button
            className={cx(
              'px-3 py-1.5 rounded-xl text-sm border border-primary-border',
              activeTab === 'bot' ? 'bg-secondary' : 'hover:bg-secondary/50',
            )}
            onClick={() => setActiveTab('bot')}
          >
            {t('View history')}
          </button>
        </div>
        <button className="text-sm underline opacity-80 hover:opacity-100" onClick={goToChat}>
          {t('Back to All-In-One')}
        </button>
      </div>

      {activeTab === 'sessions' && (
        <div className="px-10 pb-10">
          <div className="flex flex-row items-center gap-3 mb-4">
            <SearchInput value={sessionSearch} onChange={setSessionSearch} />
          </div>

          <div className="flex flex-col gap-2 overflow-y-auto custom-scrollbar max-h-[calc(100vh-220px)] pr-1">
            {loadingSessions && <div className="text-sm opacity-70">{t('Loading sessions...')}</div>}
            {!loadingSessions && filteredSessions.length === 0 && (
              <div className="text-sm opacity-70">{t('No sessions found.')}</div>
            )}
            {visibleSessions.map((s) => (
              <div
                key={getSessionKey(s)}
                className={cx(
                  'border border-primary-border rounded-2xl p-4 bg-primary-background/40 hover:bg-secondary/30 transition-colors cursor-pointer',
                  selectedSessionKey === getSessionKey(s) && 'bg-secondary/30',
                )}
                onClick={() =>
                  setSelectedSessionKey((prev) => (prev === getSessionKey(s) ? null : getSessionKey(s)))
                }
              >
                <div className="flex flex-row items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold truncate">
                      {s.type === 'sessionSnapshot'
                        ? s.pairName || (s.botNames || []).join(' / ') || s.sessionUUID
                        : (s.botNames && s.botNames[0]) || `Bot ${s.botIndex + 1}`}
                    </div>
                    <div className="text-xs opacity-70 mt-1">
                      {dayjs(s.lastUpdated).format('YYYY-MM-DD HH:mm')} · {s.messageCount} msgs
                    </div>
                    {s.firstMessage && (
                      <div className="text-xs opacity-80 mt-2 break-words whitespace-pre-wrap">
                        {selectedSessionKey === getSessionKey(s) ? s.firstMessage.slice(0, 450) : s.firstMessage.slice(0, 140)}
                        {selectedSessionKey === getSessionKey(s) && s.firstMessage.length > 450 ? '…' : ''}
                        {selectedSessionKey !== getSessionKey(s) && s.firstMessage.length > 140 ? '…' : ''}
                      </div>
                    )}
                    {selectedSessionKey === getSessionKey(s) && s.botNames && s.botNames.length > 0 && (
                      <div className="text-xs opacity-70 mt-2 break-words">
                        {s.botNames.join(' / ')}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-row items-center gap-2 shrink-0">
                    <Tooltip content={t('Restore Session')}>
                      <button
                        className={cx(
                          'rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition-all',
                          selectedSessionKey === getSessionKey(s)
                            ? 'px-4 py-2.5 text-base shadow-md'
                            : 'px-3 py-2 text-sm',
                        )}
                        onClick={(e) => {
                          e.stopPropagation()
                          restoreSession(s)
                        }}
                      >
                        {t('Restore Session')}
                      </button>
                    </Tooltip>
                  </div>
                </div>
              </div>
            ))}
            {canLoadMoreSessions && (
              <div className="flex flex-row items-center justify-center gap-3 py-4">
                <button
                  className="px-3 py-2 rounded-xl text-sm border border-primary-border hover:bg-secondary/50"
                  onClick={() => loadMoreSessions(100)}
                >
                  {t('Load 100 more')}
                </button>
                <button
                  className="px-3 py-2 rounded-xl text-sm border border-primary-border hover:bg-secondary/50"
                  onClick={() => loadMoreSessions(500)}
                >
                  {t('Load 500 more')}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'bot' && (
        <div className="px-10 pb-10 h-full">
          <div className="flex flex-row items-center gap-3 mb-4">
            {botOptions.length > 0 ? (
              <>
                <div className="w-[280px]">
                  <Select
                    options={botOptions.map((o) => ({ name: o.name, value: o.value }))}
                    value={botIndex}
                    onChange={(v) => setBotIndex(v as string)}
                  />
                </div>
                <Tooltip content={t('Clear history messages')}>
                  <button className="bg-secondary p-2 rounded-xl hover:opacity-90" onClick={clearAll}>
                    <VscClearAll size={18} className="opacity-80" />
                  </button>
                </Tooltip>
                <SearchInput value={keyword} onChange={setKeyword} />
              </>
            ) : (
              <div className="text-sm opacity-70">{t('No chatbots configured.')}</div>
            )}
          </div>

          {botOptions.length > 0 && (
            <div className="border border-primary-border rounded-2xl h-[calc(100vh-220px)] overflow-hidden">
              <Suspense fallback={<div className="p-5 text-sm opacity-70">{t('Loading sessions...')}</div>}>
                <HistoryContent index={botIndexNum} keyword={keyword} />
              </Suspense>
            </div>
          )}
        </div>
      )}
    </PagePanel>
  )
}

export default HistoryPage
