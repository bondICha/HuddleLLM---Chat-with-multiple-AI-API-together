import { RouterProvider } from '@tanstack/react-router'
import { createRoot } from 'react-dom/client'
import { useSetAtom } from 'jotai'
import { useEffect } from 'react'
import Browser from 'webextension-polyfill'
import '../services/sentry'
import './base.scss'
import './i18n'
import { router } from './router'
import { pendingSearchQueryAtom, sessionRestoreModalAtom } from './state'
import { markOmniboxSearchAsUsed } from '../services/storage/open-times'
import { loadHistoryMessages, loadAllInOneSessions } from '../services/chat-history'

function App() {
  const setPendingSearchQuery = useSetAtom(pendingSearchQueryAtom)
  const setSessionRestoreModal = useSetAtom(sessionRestoreModalAtom)

  useEffect(() => {
    const loadPendingSearch = async () => {
      try {
        const result = await Browser.storage.local.get('pendingOmniboxSearch')
        const query = result.pendingOmniboxSearch
        if (typeof query === 'string' && query.trim() !== '') {
          console.log('[main.tsx] Found pending omnibox search:', query)
          setPendingSearchQuery(query)
          // Omnibox検索が使用されたことをマーク
          await markOmniboxSearchAsUsed()
          // 読み込んだらストレージから削除
          await Browser.storage.local.remove('pendingOmniboxSearch')
        }
      } catch (error) {
        console.error('Error loading pending omnibox search:', error)
      }
    }

    const checkSessionRestore = async () => {
      try {
        // @hlから始まった場合（pendingOmniboxSearchがある場合）はSession復旧画面を表示しない
        const result = await Browser.storage.local.get('pendingOmniboxSearch')
        const hasPendingSearch = result.pendingOmniboxSearch && typeof result.pendingOmniboxSearch === 'string' && result.pendingOmniboxSearch.trim() !== ''
        
        if (hasPendingSearch) {
          console.log('[main.tsx] Skipping session restore modal due to pending omnibox search')
          return
        }
        
        // 過去のセッションがあるかチェック
        let hasAnySessions = false
        
        // All-in-oneセッションのチェック
        const allInOneSessions = await loadAllInOneSessions()
        if (allInOneSessions.length > 0) {
          hasAnySessions = true
        }
        
        // 個別ボットセッションをチェック
        if (!hasAnySessions) {
          for (let botIndex = 0; botIndex < 10; botIndex++) {
            const conversations = await loadHistoryMessages(botIndex)
            if (conversations.length > 0) {
              hasAnySessions = true
              break
            }
          }
        }
        
        // 過去のセッションがある場合のみモーダルを表示
        if (hasAnySessions) {
          setSessionRestoreModal(true)
        }
      } catch (error) {
        console.error('Error checking session restore:', error)
      }
    }

    loadPendingSearch()
    checkSessionRestore()
  }, [setPendingSearchQuery, setSessionRestoreModal]) // 初回マウント時のみ実行

  return <RouterProvider router={router} />
}

const container = document.getElementById('app')!
const root = createRoot(container)
root.render(<App />)
