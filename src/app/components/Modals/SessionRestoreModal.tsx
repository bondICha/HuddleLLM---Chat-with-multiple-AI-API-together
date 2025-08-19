import { FC, useEffect, useState, useCallback, useRef } from 'react'
import { Dialog, Tab } from '@headlessui/react'
import { useTranslation } from 'react-i18next'
import { useAtom, useAtomValue, useSetAtom } from 'jotai'
import { useNavigate } from '@tanstack/react-router'
import Browser from 'webextension-polyfill'
import { loadHistoryMessages, loadSessionSnapshots, deleteSessionSnapshot, clearHistoryMessages, clearAllSessionSnapshots, clearAllCustomBotHistory } from '~services/chat-history'
import { sessionRestoreModalAtom, sessionToRestoreAtom, themeColorAtom } from '~app/state'
import { getUserConfig } from '~services/user-config'
import dayjs from 'dayjs'
import { ChevronDownIcon, TrashIcon } from '@heroicons/react/24/outline'

interface SessionData {
  type: 'single' | 'sessionSnapshot'
  botIndex?: number
  conversationId?: string
  sessionUUID?: string
  botIndices?: number[]
  layout?: string
  pairName?: string
  createdAt: number
  lastUpdated: number
  messageCount: number
  lastMessage: string
  firstMessage?: string
  botNames?: string[]
  botResponses?: { botName: string; response: string }[]
  snapshotMessages?: { [botIndex: number]: any[] }
}

const SessionRestoreModal: FC = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [open, setOpen] = useAtom(sessionRestoreModalAtom)
  const setSessionToRestore = useSetAtom(sessionToRestoreAtom)
  const themeColor = useAtomValue(themeColorAtom)
  const [sessions, setSessions] = useState<SessionData[]>([])
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [activeTab, setActiveTab] = useState(0)
  const [loading, setLoading] = useState(true)
  const [lastKeyPressed, setLastKeyPressed] = useState<string>('')
  const [debugInfo, setDebugInfo] = useState<string>('')
  const [showDebug, setShowDebug] = useState(false)
  const listRef = useRef<HTMLDivElement>(null)

  const scrollToSelectedItem = useCallback(() => {
    if (listRef.current) {
      const selectedElement = listRef.current.querySelector('.bg-blue-600') as HTMLElement
      if (selectedElement) {
        selectedElement.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
        })
      }
    }
  }, [])

  const getBotName = useCallback(async (botIndex: number): Promise<string> => {
    try {
      const { customApiConfigs } = await getUserConfig()
      const config = customApiConfigs[botIndex]
      if (config && config.name) {
        return config.name
      }
    } catch (error) {
      console.error('Failed to get bot name:', error)
    }
    return `Custom Bot ${botIndex + 1}`
  }, [])

  useEffect(() => {
    scrollToSelectedItem()
  }, [selectedIndex, activeTab, scrollToSelectedItem])

  const loadSessions = useCallback(async () => {
    setLoading(true)
    try {
      const allSessions: SessionData[] = []
      
      const sessionSnapshots = await loadSessionSnapshots()
      for (const snapshot of sessionSnapshots) {
        let lastMessage = ''
        let firstMessage = ''
        const botNames: string[] = []
        
        // ボット名を取得
        if (snapshot.botIndices) {
          for (const botIndex of snapshot.botIndices) {
            const name = await getBotName(botIndex)
            botNames.push(name)
          }
        }
        
        // 最初のメッセージと各AIの返答を取得
        const botResponses: { botName: string; response: string }[] = []
        
        // 全メッセージから最初のユーザーメッセージを取得
        const allMessages = Object.values(snapshot.conversations).flat()
        if (allMessages.length > 0) {
          const firstUserMsg = allMessages.find(msg => msg.author === 'user')
          if (firstUserMsg && firstUserMsg.text) {
            firstMessage = firstUserMsg.text.slice(0, 100) + (firstUserMsg.text.length > 100 ? '...' : '')
          }
        }
        
        // 各AIの最後の返答を個別に取得
        if (snapshot.botIndices) {
          for (let i = 0; i < snapshot.botIndices.length; i++) {
            const botIndex = snapshot.botIndices[i]
            const botName = botNames[i] || `Bot ${botIndex + 1}`
            const botMessages = snapshot.conversations[botIndex]?.filter(msg => msg.author !== 'user') || []
            
            if (botMessages.length > 0) {
              const lastBotMsg = botMessages[botMessages.length - 1]
              if (lastBotMsg && lastBotMsg.text) {
                const response = lastBotMsg.text.slice(0, 100) + (lastBotMsg.text.length > 100 ? '...' : '')
                botResponses.push({ botName, response })
              }
            } else {
              botResponses.push({ botName, response: 'No response' })
            }
          }
        }
        
        // 従来のlastMessageは最初のボットの応答または統合メッセージ
        lastMessage = botResponses.length > 0 ? botResponses[0].response : 'No messages'
        
        allSessions.push({
          type: 'sessionSnapshot',
          sessionUUID: snapshot.sessionUUID,
          botIndices: snapshot.botIndices,
          layout: snapshot.layout,
          pairName: snapshot.pairName,
          createdAt: snapshot.createdAt,
          lastUpdated: snapshot.lastUpdated,
          messageCount: snapshot.totalMessageCount,
          lastMessage: lastMessage || 'No messages',
          firstMessage: firstMessage || 'No messages',
          botNames,
          botResponses,
          snapshotMessages: snapshot.conversations,
        })
      }
      
      for (let botIndex = 0; botIndex < 10; botIndex++) {
        const conversations = await loadHistoryMessages(botIndex)
        for (const conversation of conversations) {
          if (conversation.messages.length > 0) {
            const botName = await getBotName(botIndex)
            const firstMessage = conversation.messages.find(msg => msg.author === 'user')
            const lastBotMessage = conversation.messages.filter(msg => msg.author !== 'user').pop()
            
            allSessions.push({
              type: 'single',
              botIndex,
              conversationId: conversation.id,
              createdAt: conversation.createdAt,
              lastUpdated: conversation.createdAt,
              messageCount: conversation.messages.length,
              lastMessage: lastBotMessage?.text ? (lastBotMessage.text.slice(0, 100) + (lastBotMessage.text.length > 100 ? '...' : '')) : 'No messages',
              firstMessage: firstMessage?.text ? (firstMessage.text.slice(0, 100) + (firstMessage.text.length > 100 ? '...' : '')) : 'No messages',
              botNames: [botName],
            })
          }
        }
      }
      
      allSessions.sort((a, b) => b.lastUpdated - a.lastUpdated)
      setSessions(allSessions.slice(0, 50))
    } catch (error) {
      console.error('Failed to load sessions:', error)
      setSessions([])
    } finally {
      setLoading(false)
    }
  }, [getBotName])

  useEffect(() => {
    if (open) {
      loadSessions()
      setSelectedIndex(-1) // -1 means "Start new session" is selected
      setActiveTab(0) // All-in-One tab (index 0) as default
      
      // フォーカスを設定
      setTimeout(() => {
        const panel = document.querySelector('[role="dialog"]') as HTMLElement
        if (panel) {
          panel.focus()
        }
      }, 100)
    }
  }, [open, loadSessions])

  const handleRestore = useCallback((session: SessionData) => {
    setOpen(false)
    setSessionToRestore(session)
    if (session.type === 'single') {
      navigate({ to: `/chat/custom/${session.botIndex}` })
    } else {
      navigate({ to: '/' })
    }
  }, [setOpen, setSessionToRestore, navigate])

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!open) return
    
    setLastKeyPressed(e.key)
    
    const currentSessions = activeTab === 0
      ? sessions.filter(s => s.type === 'sessionSnapshot')
      : sessions.filter(s => s.type === 'single')

    if (showDebug) setDebugInfo(`Key received: ${e.key}, currentSessions: ${currentSessions.length}`)

    switch (e.key) {
      case 'ArrowUp':
        e.preventDefault()
        e.stopPropagation()
        setSelectedIndex(prev => {
          const newIndex = Math.max(-1, prev - 1)
          if (showDebug) setDebugInfo(`ArrowUp: ${prev} → ${newIndex}`)
          return newIndex
        })
        break
      case 'ArrowDown':
        e.preventDefault()
        e.stopPropagation()
        setSelectedIndex(prev => {
          const maxIndex = currentSessions.length - 1
          const newIndex = Math.min(maxIndex, prev + 1)
          if (showDebug) setDebugInfo(`ArrowDown: ${prev} → ${newIndex} (max: ${maxIndex})`)
          return newIndex
        })
        break
      case 'Enter':
        e.preventDefault()
        e.stopPropagation()
        if (showDebug) setDebugInfo(`Enter pressed! Index: ${selectedIndex}, Sessions: ${currentSessions.length}`)
        setTimeout(() => {
          if (selectedIndex === -1) {
            if (showDebug) setDebugInfo(`Enter: Starting new session`)
            setOpen(false)
            navigate({ to: '/' })
          } else if (selectedIndex >= 0 && selectedIndex < currentSessions.length) {
            const session = currentSessions[selectedIndex]
            if (showDebug) setDebugInfo(`Enter: Restoring session type: ${session.type}`)
            handleRestore(session)
          } else {
            if (showDebug) setDebugInfo(`Enter: Index out of range (${selectedIndex} >= ${currentSessions.length})`)
            setOpen(false)
            navigate({ to: '/' })
          }
        }, 10)
        break
      case 'Escape':
        e.preventDefault()
        e.stopPropagation()
        if (showDebug) setDebugInfo(`Escape: Closing modal`)
        setOpen(false)
        break
      default:
        if (showDebug) setDebugInfo(`Key: ${e.key} (not handled)`)
    }
  }, [open, sessions, selectedIndex, activeTab, navigate, handleRestore, showDebug])

  useEffect(() => {
    if (open) {
      document.addEventListener('keydown', handleKeyDown, { capture: true })
      return () => document.removeEventListener('keydown', handleKeyDown, { capture: true })
    }
  }, [handleKeyDown, open])

  const handleItemClick = (session: SessionData) => {
    handleRestore(session)
  }

  const handleDeleteSession = async (session: SessionData, e: React.MouseEvent) => {
    e.stopPropagation() // セッションをクリックしてRestoreしないように
    
    if (!confirm('このセッションを削除しますか？')) {
      return
    }

    try {
      if (session.type === 'sessionSnapshot' && session.sessionUUID) {
        await deleteSessionSnapshot(session.sessionUUID)
      } else if (session.type === 'single' && session.botIndex !== undefined) {
        await clearHistoryMessages(session.botIndex)
      }
      
      // セッションリストを再読み込み
      await loadSessions()
    } catch (error) {
      console.error('Failed to delete session:', error)
    }
  }

  const handleDeleteAllSessions = async () => {
    const currentSessions = activeTab === 0 
      ? sessions.filter(s => s.type === 'sessionSnapshot') 
      : sessions.filter(s => s.type === 'single')

    if (currentSessions.length === 0) {
      return
    }

    const sessionType = activeTab === 0 ? 'All-in-One' : 'Custom Bot'
    if (!confirm(`すべての${sessionType}セッションを削除しますか？\n${currentSessions.length}個のセッションが削除されます。`)) {
      return
    }

    try {
      if (activeTab === 0) {
        // All-in-Oneセッションを全て削除
        await clearAllSessionSnapshots()
      } else {
        // Custom Botセッションを全て削除
        await clearAllCustomBotHistory()
      }
      
      // セッションリストを再読み込み
      await loadSessions()
    } catch (error) {
      console.error('Failed to delete all sessions:', error)
    }
  }

  const renderSessionItem = (session: SessionData, index: number, isSelected: boolean) => (
    <div
      key={session.sessionUUID || `${session.botIndex}-${session.conversationId}`}
      className={`p-3 rounded cursor-pointer transition-colors ${
        isSelected ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
      }`}
      onClick={() => handleItemClick(session)}
    >
      <div className="flex items-center">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium">
              {session.botNames && session.botNames.length > 0
                ? session.botNames.join(', ')
                : (session.type === 'sessionSnapshot'
                    ? (session.pairName || `All-in-One (${session.botIndices?.length} bots)`)
                    : `Custom Bot ${session.botIndex! + 1}`
                  )
              }
            </span>
            <span className="text-xs opacity-75">{session.messageCount} messages</span>
          </div>
          <div className="text-sm opacity-75 mb-1">
            {dayjs(session.createdAt).format('YYYY/MM/DD HH:mm')}
          </div>
          {session.firstMessage && (
            <div className="text-xs opacity-50 mb-1">
              <span className="font-medium">Q:</span> {session.firstMessage}
            </div>
          )}
          {session.botResponses && session.botResponses.length > 0 ? (
            session.botResponses.map((response, idx) => (
              <div key={idx} className="text-xs opacity-50 mb-1">
                <span className="font-medium">{response.botName}:</span> {response.response}
              </div>
            ))
          ) : (
            <div className="text-xs opacity-50">
              <span className="font-medium">A:</span> {session.lastMessage}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => handleDeleteSession(session, e)}
            className="p-1 rounded hover:bg-red-600 hover:bg-opacity-20 transition-colors"
            title="Delete session"
          >
            <TrashIcon className="w-4 h-4 text-red-400 hover:text-red-300" />
          </button>
          {isSelected && <ChevronDownIcon className="w-5 h-5 ml-2" />}
        </div>
      </div>
    </div>
  )

  const handleStartNewSession = () => {
    setOpen(false)
    navigate({ to: '/' })
  }

  return (
    <Dialog open={open} onClose={() => setOpen(false)} className="relative z-50">
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel
          className="mx-auto max-w-2xl w-full backdrop-blur-md rounded-lg shadow-2xl border"
          style={{
            backgroundColor: themeColor ? `${themeColor}40` : 'rgba(17, 24, 39, 0.25)', // 25% opacity for more transparency
            borderColor: themeColor ? `${themeColor}66` : 'rgba(75, 85, 99, 0.4)' // 40% opacity
          }}
          tabIndex={-1}
          onKeyDown={(e) => handleKeyDown(e.nativeEvent)}
        >
          <div className="p-6">
            <Dialog.Title className="text-xl font-semibold text-white mb-4 text-center">
              {t('Restore Session')}
            </Dialog.Title>
            <div className="text-sm text-white mb-4 text-center">
              {t('Use ↑↓ keys to navigate, Enter to select, Esc to close')}
              <div className="mt-2">
                <button
                  onClick={() => setShowDebug(!showDebug)}
                  className="text-xs text-gray-400 hover:text-gray-300 underline"
                >
                  {showDebug ? 'Hide Debug' : 'Show Debug'}
                </button>
                {showDebug && (
                  <div className="text-xs text-yellow-300 mt-1 bg-black/50 p-2 rounded">
                    <div>Debug: selectedIndex={selectedIndex}, activeTab={activeTab}</div>
                    <div>Sessions total: {sessions.length}</div>
                    <div>All-in-One sessions: {sessions.filter(s => s.type === 'sessionSnapshot').length}</div>
                    <div>Custom Bot sessions: {sessions.filter(s => s.type === 'single').length}</div>
                    <div>Current tab sessions: {activeTab === 0 ? sessions.filter(s => s.type === 'sessionSnapshot').length : sessions.filter(s => s.type === 'single').length}</div>
                    <div>Max index: {(activeTab === 0 ? sessions.filter(s => s.type === 'sessionSnapshot').length : sessions.filter(s => s.type === 'single').length) - 1}</div>
                    <div>Last key: {lastKeyPressed}</div>
                    <div className="text-cyan-300">{debugInfo}</div>
                  </div>
                )}
              </div>
            </div>

            <Tab.Group selectedIndex={activeTab} onChange={(index) => { 
              setActiveTab(index)
              setSelectedIndex(-1) // Always start with "Start new session"
            }}>
              <div className="flex justify-between items-center mb-4">
                <Tab.List className="flex space-x-4">
                  <Tab className="px-4 py-2 text-sm font-medium leading-5 rounded-lg focus:outline-none transition-colors ui-selected:bg-blue-600 ui-selected:text-white ui-not-selected:bg-gray-600 ui-not-selected:text-gray-100 ui-not-selected:hover:bg-gray-500">
                    All-in-One
                  </Tab>
                  <Tab className="px-4 py-2 text-sm font-medium leading-5 rounded-lg focus:outline-none transition-colors ui-selected:bg-blue-600 ui-selected:text-white ui-not-selected:bg-gray-600 ui-not-selected:text-gray-100 ui-not-selected:hover:bg-gray-500">
                    Custom Bots
                  </Tab>
                </Tab.List>
                <button
                  onClick={handleDeleteAllSessions}
                  className="px-3 py-1 text-xs font-medium text-red-400 hover:text-red-300 hover:bg-red-600/30 rounded-md transition-colors"
                  title="Delete all sessions in current tab"
                >
                  Remove All
                </button>
              </div>
              <Tab.Panels>
                <Tab.Panel>
                  <div ref={listRef} className="space-y-1 max-h-96 overflow-y-auto">
                    {/* Start new session option */}
                    <div
                      className={`p-3 rounded cursor-pointer transition-colors ${
                        selectedIndex === -1 && activeTab === 0 ? 'bg-green-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                      }`}
                      onClick={handleStartNewSession}
                    >
                      <div className="flex items-center">
                        <div className="flex-1">
                          <div className="font-medium">Start new session</div>
                          <div className="text-sm opacity-75">Begin a fresh conversation</div>
                        </div>
                        {selectedIndex === -1 && activeTab === 0 && <ChevronDownIcon className="w-5 h-5 ml-2" />}
                      </div>
                    </div>
                    {loading ? (
                      <div className="text-center py-8 text-gray-400">{t('Loading sessions...')}</div>
                    ) : sessions.filter(s => s.type === 'sessionSnapshot').length === 0 ? (
                      <div className="text-center py-8 text-gray-400">{t('No previous sessions found')}</div>
                    ) : (
                      sessions.filter(s => s.type === 'sessionSnapshot').map((s, i) => renderSessionItem(s, i, activeTab === 0 && selectedIndex === i))
                    )}
                  </div>
                </Tab.Panel>
                <Tab.Panel>
                  <div ref={listRef} className="space-y-1 max-h-96 overflow-y-auto">
                    {/* Start new session option */}
                    <div
                      className={`p-3 rounded cursor-pointer transition-colors ${
                        selectedIndex === -1 && activeTab === 1 ? 'bg-green-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                      }`}
                      onClick={handleStartNewSession}
                    >
                      <div className="flex items-center">
                        <div className="flex-1">
                          <div className="font-medium">Start new session</div>
                          <div className="text-sm opacity-75">Begin a fresh conversation</div>
                        </div>
                        {selectedIndex === -1 && activeTab === 1 && <ChevronDownIcon className="w-5 h-5 ml-2" />}
                      </div>
                    </div>
                    {loading ? (
                      <div className="text-center py-8 text-gray-400">{t('Loading sessions...')}</div>
                    ) : sessions.filter(s => s.type === 'single').length === 0 ? (
                      <div className="text-center py-8 text-gray-400">{t('No previous sessions found')}</div>
                    ) : (
                      sessions.filter(s => s.type === 'single').map((s, i) => renderSessionItem(s, i, activeTab === 1 && selectedIndex === i))
                    )}
                  </div>
                </Tab.Panel>
              </Tab.Panels>
            </Tab.Group>

            <div className="mt-6 text-xs text-gray-500 text-center">
              {t('Click outside or press Esc to close')}
            </div>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  )
}

export default SessionRestoreModal
