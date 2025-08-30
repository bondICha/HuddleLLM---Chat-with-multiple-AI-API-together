import Browser from 'webextension-polyfill'
import { ALL_IN_ONE_PAGE_ID } from '~app/consts'
import { getUserConfig } from '~services/user-config'
import { readTwitterCsrfToken } from './twitter-cookie'
import { setupProxyExecutor } from '~services/proxy-fetch'
import { isPDFBuffer } from '~utils/pdf-utils'

// PDF処理キューとセマフォ管理
interface PDFProcessingRequest {
  url: string
  buffer: ArrayBuffer
  resolve: (result: any) => void
  reject: (error: any) => void
}

let pdfProcessingQueue: PDFProcessingRequest[] = []
let isProcessingPDF = false
let isOffscreenDocumentCreated = false

async function ensureOffscreenDocument() {
  if (isOffscreenDocumentCreated) return
  
  try {
    // Chrome APIを直接使用 (webextension-polyfillにoffscreenがないため)
    await chrome.offscreen.createDocument({
      url: 'src/offscreen/pdf-processor.html',
      reasons: ['WORKERS' as chrome.offscreen.Reason],
      justification: 'PDF text extraction using pdfjs-dist library'
    })
    isOffscreenDocumentCreated = true
    console.log('📄 Background: Offscreen document created for PDF processing')
  } catch (error) {
    if (error instanceof Error && error.message.includes('Only a single offscreen')) {
      // すでにオフスクリーンドキュメントが存在する場合
      isOffscreenDocumentCreated = true
      console.log('📄 Background: Offscreen document already exists')
    } else {
      console.error('❌ Background: Failed to create offscreen document:', error)
      throw error
    }
  }
}

async function processPDFQueue() {
  if (isProcessingPDF || pdfProcessingQueue.length === 0) return
  
  isProcessingPDF = true
  console.log(`📋 Background: Processing PDF queue, ${pdfProcessingQueue.length} items`)
  
  while (pdfProcessingQueue.length > 0) {
    const request = pdfProcessingQueue.shift()!
    
    try {
      console.log(`🔍 Background: Processing PDF: ${request.url}`)
      
      // オフスクリーンドキュメントを確保
      await ensureOffscreenDocument()
      
      // 少し待ってからメッセージ送信（オフスクリーンドキュメントの初期化待ち）
      await new Promise(resolve => setTimeout(resolve, 100))
      
      // PDF処理をオフスクリーンドキュメントに委譲
      const result = await Browser.runtime.sendMessage({
        type: 'EXTRACT_PDF_TEXT',
        pdfData: Array.from(new Uint8Array(request.buffer))
      })
      
      request.resolve(result)
      console.log(`✅ Background: PDF processing completed for: ${request.url}`)
      
    } catch (error) {
      console.error(`❌ Background: PDF processing failed for: ${request.url}`, error)
      request.reject(error)
    }
    
    // 次の処理まで少し待機（リソース競合回避）
    await new Promise(resolve => setTimeout(resolve, 50))
  }
  
  isProcessingPDF = false
  console.log('📋 Background: PDF queue processing completed')
}

function queuePDFProcessing(url: string, buffer: ArrayBuffer): Promise<any> {
  return new Promise((resolve, reject) => {
    pdfProcessingQueue.push({ url, buffer, resolve, reject })
    console.log(`📋 Background: Queued PDF processing for: ${url}, queue length: ${pdfProcessingQueue.length}`)
    
    // キュー処理を開始（非同期）
    processPDFQueue().catch(error => {
      console.error('❌ Background: PDF queue processing error:', error)
    })
  })
}

// Helper function to decode URL-encoded content in text
function decodeUrlEncodedContent(content: string): string {
  try {
    // Decode URL encoded sequences like %E3%82%B7 etc.
    // Handle both standalone encoded sequences and those within URLs
    return content.replace(/(?:%[0-9A-F]{2})+/gi, (match) => {
      try {
        return decodeURIComponent(match)
      } catch {
        // If decoding fails, return the original match
        return match
      }
    })
  } catch (error) {
    console.warn('Failed to decode URL-encoded content:', error)
    return content
  }
}

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
      
      // Check if this is a PDF file
      if (contentType.includes('application/pdf') || message.url.toLowerCase().endsWith('.pdf')) {
        console.log('📄 Background: PDF detected, processing with offscreen document')
        const buffer = await response.arrayBuffer()
        if (isPDFBuffer(buffer)) {
          try {
            // PDF処理をキューに追加
            const result = await queuePDFProcessing(message.url, buffer)
            
            if (result.success) {
              return {
                success: true,
                content: `PDF Document: ${message.url}\n\n${result.text}`,
                contentType: contentType,
                isPdf: true
              }
            } else {
              throw new Error(result.error)
            }
          } catch (error) {
            console.error('PDF processing failed:', error)
            const fileSizeKB = Math.round(buffer.byteLength / 1024)
            return {
              success: true,
              content: `PDF Document: ${message.url}\n\nFile Size: ${fileSizeKB} KB\n\nNote: PDF text extraction failed (${error instanceof Error ? error.message : 'Unknown error'}). The AI can provide insights about this document based on the URL, title, and known content if it recognizes this academic paper or document.`,
              contentType: contentType,
              isPdf: true
            }
          }
        } else {
          return {
            success: false,
            error: 'File appears to be corrupted or is not a valid PDF format.'
          }
        }
      }
      
      if (message.responseType === 'arraybuffer') {
        const buffer = await response.arrayBuffer()
        console.log('✅ Background: Fetch success (ArrayBuffer), content length:', buffer.byteLength)
        return {
          success: true,
          content: Array.from(new Uint8Array(buffer)),
          contentType: contentType,
        }
      } else {
        // Get response as ArrayBuffer first to properly handle encoding
        const buffer = await response.arrayBuffer()
        const uint8Array = new Uint8Array(buffer)
        
        // Check if content looks like binary data (PDF, images, etc.)
        const possibleBinary = uint8Array.slice(0, 100).some(byte => byte === 0)
        if (possibleBinary) {
          console.log('⚠️ Background: Binary content detected, returning error')
          return {
            success: false,
            error: 'Binary content detected (PDF, image, or other non-text format). Cannot process as text.',
          }
        }
        
        // Detect charset from multiple sources
        let charset = 'utf-8'
        
        // 1. Check Content-Type header
        const charsetMatch = contentType.match(/charset=([^;]+)/i)
        if (charsetMatch) {
          charset = charsetMatch[1].toLowerCase()
        }
        
        // 2. Try UTF-8 first and check for common encoding issues
        let content: string
        try {
          const decoder = new TextDecoder('utf-8')
          content = decoder.decode(uint8Array)
          
          // 3. Detect if content has meta charset tag with different encoding
          const metaCharsetMatch = content.match(/<meta[^>]*charset\s*=\s*['"]*([^'">]+)/i)
          if (metaCharsetMatch && metaCharsetMatch[1].toLowerCase() !== 'utf-8') {
            const metaCharset = metaCharsetMatch[1].toLowerCase()
            console.log('🔍 Background: Meta charset detected:', metaCharset)
            
            try {
              const metaDecoder = new TextDecoder(metaCharset)
              content = metaDecoder.decode(uint8Array)
              charset = metaCharset
            } catch (metaError) {
              console.warn('Failed to decode with meta charset:', metaCharset)
            }
          }
          
          // 4. Check for mojibake patterns (common encoding mistakes)
          const hasMojibake = /[��]|[\u00C0-\u00FF]{2,}|[\uFFFD]/.test(content.substring(0, 1000))
          if (hasMojibake && charset === 'utf-8') {
            console.log('🔍 Background: Mojibake detected, trying alternative encodings')
            
            // Try common encodings for different regions
            const alternativeEncodings = ['shift_jis', 'euc-jp', 'iso-2022-jp', 'windows-1252', 'iso-8859-1']
            
            for (const encoding of alternativeEncodings) {
              try {
                const altDecoder = new TextDecoder(encoding)
                const altContent = altDecoder.decode(uint8Array)
                const altHasMojibake = /[��]|[\uFFFD]/.test(altContent.substring(0, 1000))
                
                if (!altHasMojibake) {
                  console.log('✅ Background: Fixed encoding with:', encoding)
                  content = altContent
                  charset = encoding
                  break
                }
              } catch (altError) {
                // Continue trying other encodings
              }
            }
          }
          
        } catch (error) {
          // Fallback to UTF-8 if all else fails
          console.warn('Failed to decode, falling back to UTF-8:', error)
          const decoder = new TextDecoder('utf-8')
          content = decoder.decode(uint8Array)
        }
        
        // Check if content looks like PDF (starts with %PDF)
        if (content.startsWith('%PDF')) {
          console.log('📄 Background: PDF content detected in text response, processing with offscreen document')
          try {
            // PDF処理をキューに追加
            const result = await queuePDFProcessing(message.url, buffer)
            
            if (result.success) {
              return {
                success: true,
                content: `PDF Document: ${message.url}\n\n${result.text}`,
                contentType: contentType,
                isPdf: true
              }
            } else {
              throw new Error(result.error)
            }
          } catch (error) {
            console.error('PDF text extraction failed:', error)
            const fileSizeKB = Math.round(buffer.byteLength / 1024)
            return {
              success: true,
              content: `PDF Document: ${message.url}\n\nFile Size: ${fileSizeKB} KB\n\nNote: PDF text extraction failed (${error instanceof Error ? error.message : 'Unknown error'}). The AI can provide insights about this document based on the URL, title, and known content if it recognizes this academic paper or document.`,
              contentType: contentType,
              isPdf: true
            }
          }
        }
        
        // URL decode common encoded content in the text
        content = decodeUrlEncodedContent(content)
        
        console.log('✅ Background: Fetch success (text), content length:', content.length, 'charset:', charset)
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
