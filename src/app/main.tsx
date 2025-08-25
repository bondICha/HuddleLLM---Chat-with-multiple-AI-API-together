import { RouterProvider } from '@tanstack/react-router'
import { createRoot } from 'react-dom/client'
import { useSetAtom } from 'jotai'
import { useEffect, useState } from 'react'
import Browser from 'webextension-polyfill'
import '../services/sentry'
import './base.scss'
import './i18n'
import { router } from './router'
import { pendingSearchQueryAtom, sessionRestoreModalAtom, companyProfileModalAtom, detectedCompanyAtom } from './state'
import { markOmniboxSearchAsUsed } from '../services/storage/open-times'
import { loadHistoryMessages, loadAllInOneSessions } from '../services/chat-history'
import { checkCompanyProfile, getCompanyProfileConfigs, shouldShowProfilePrompt } from '../services/company-profile'
import CompanyProfileModal from './components/Modals/CompanyProfileModal'

function App() {
  const setPendingSearchQuery = useSetAtom(pendingSearchQueryAtom)
  const setSessionRestoreModal = useSetAtom(sessionRestoreModalAtom)
  const setCompanyProfileModal = useSetAtom(companyProfileModalAtom)
  const setDetectedCompany = useSetAtom(detectedCompanyAtom)

  useEffect(() => {
    const checkCompanyEnvironment = async () => {
      try {
        const configs = await getCompanyProfileConfigs()
        for (const preset of configs) {
          const isCompanyEnvironment = await checkCompanyProfile(preset.checkUrl)
          if (isCompanyEnvironment) {
            const shouldShow = await shouldShowProfilePrompt(preset)
            if (shouldShow) {
              setDetectedCompany(preset)
              setCompanyProfileModal(true)
              break
            }
          }
        }
      } catch (error) {
        console.error('Error checking company environment:', error)
      }
    }

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
        // 検索バーから呼び出された場合（pendingOmniboxSearchがある場合）はSession復旧画面を表示しない
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
    checkCompanyEnvironment()
  }, [setPendingSearchQuery, setSessionRestoreModal])


  return (
    <>
      <RouterProvider router={router} />
      <CompanyProfileModal />
    </>
  )
}

const container = document.getElementById('app')!
const root = createRoot(container)
root.render(<App />)
