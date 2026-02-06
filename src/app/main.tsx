import { RouterProvider } from '@tanstack/react-router'
import { createRoot } from 'react-dom/client'
import { useSetAtom } from 'jotai'
import { useEffect } from 'react'
import Browser from 'webextension-polyfill'
import '../services/sentry'
import './base.scss'
import './i18n'
import { router } from './router'
import { pendingSearchQueryAtom } from './state'
import { markOmniboxSearchAsUsed } from '../services/storage/open-times'
import CompanyProfileModal from './components/Modals/CompanyProfileModal'
import { useFontType } from './hooks/use-font-type'

function App() {
  const setPendingSearchQuery = useSetAtom(pendingSearchQueryAtom)
  
  // フォント設定を適用
  useFontType()

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

    loadPendingSearch()
  }, [setPendingSearchQuery])


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
