import Browser from 'webextension-polyfill'
import { ALL_IN_ONE_PAGE_ID } from '~app/consts'
import { getUserConfig } from '~services/user-config'
import { readTwitterCsrfToken } from './twitter-cookie'
import { setupProxyExecutor } from '~services/proxy-fetch'

// expose storage.session to content scripts
// using `chrome.*` API because `setAccessLevel` is not supported by `Browser.*` API
chrome.storage.session.setAccessLevel({ accessLevel: 'TRUSTED_AND_UNTRUSTED_CONTEXTS' })

// Setup proxy fetch executor for URL fetching
setupProxyExecutor()

async function openAppPage() {
  const tabs = await Browser.tabs.query({})
  const url = Browser.runtime.getURL('app.html')
  const tab = tabs.find((tab) => tab.url?.startsWith(url))
  if (tab) {
    await Browser.tabs.update(tab.id, { active: true })
    return
  }
  const { startupPage } = await getUserConfig()
  const hash = startupPage === ALL_IN_ONE_PAGE_ID ? '' : `#/chat/${startupPage}`
  await Browser.tabs.create({ url: `app.html${hash}` })
}

Browser.action.onClicked.addListener(() => {
  openAppPage()
})

Browser.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    Browser.tabs.create({ url: 'app.html#/setting' })
  }
})

Browser.commands.onCommand.addListener(async (command) => {
  console.debug(`Command: ${command}`)
  if (command === 'open-app') {
    openAppPage()
  }
})

Browser.runtime.onMessage.addListener(async (message, sender) => {
  console.debug('onMessage', message, sender)
  if (message.target && message.target !== 'background') {
    return
  }
  if (message.type === 'read-twitter-csrf-token') {
    return readTwitterCsrfToken(message.data)
  }
  if (message.type === 'FETCH_URL') {
    console.log('🚀 Background: Fetching URL:', message.url)
    
    try {
      // Check if user has all-hosts permission
      const allHostsPermissions = { origins: ['https://*/*', 'http://*/*'] }
      const hasAllHosts = await Browser.permissions.contains(allHostsPermissions)
      
      if (!hasAllHosts) {
        console.log('🔒 Background: All-hosts permission required')
        return {
          success: false,
          error: 'Web access permission required. Please enable "Allow access to all websites" in settings.',
        }
      }
      
      console.log('✅ Background: All-hosts permission verified')
      
      const response = await fetch(message.url)
      console.log('📡 Background: Fetch response status:', response.status)
      if (!response.ok) {
        console.log('❌ Background: Fetch failed:', response.status, response.statusText)
        return {
          success: false,
          error: `HTTP ${response.status}: ${response.statusText}`,
        }
      }
      
      const contentType = response.headers.get('content-type') || ''
      
      if (message.responseType === 'arraybuffer') {
        const buffer = await response.arrayBuffer()
        console.log('✅ Background: Fetch success (ArrayBuffer), content length:', buffer.byteLength)
        return {
          success: true,
          content: Array.from(new Uint8Array(buffer)),
          contentType: contentType,
        }
      } else {
        const content = await response.text()
        console.log('✅ Background: Fetch success (text), content length:', content.length)
        return {
          success: true,
          content: content,
          contentType: contentType,
        }
      }
    } catch (error) {
      console.log('💥 Background: Fetch error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }
});

// Omnibox APIのイベントリスナー
chrome.omnibox.onInputEntered.addListener(async (text, disposition) => {
  console.log('[background] Omnibox input entered:', text, 'Disposition:', disposition)
  // 検索キーワードをchrome.storage.localに保存
  await Browser.storage.local.set({ pendingOmniboxSearch: text })

  const appUrl = Browser.runtime.getURL('app.html')

  if (disposition === 'currentTab') {
    // 現在アクティブなタブを取得して更新
    const [currentTab] = await Browser.tabs.query({ active: true, currentWindow: true })
    if (currentTab && currentTab.id) {
      await Browser.tabs.update(currentTab.id, { url: appUrl })
    } else {
      // アクティブなタブが見つからない場合は新しいタブで開く（フォールバック）
      await Browser.tabs.create({ url: appUrl })
    }
  } else {
    // 新しいフォアグラウンドタブ、または新しいバックグラウンドタブで開く場合
    // (またはその他の disposition の場合も新しいタブで開く)
    await Browser.tabs.create({ url: appUrl, active: (disposition === 'newForegroundTab') })
  }
})
