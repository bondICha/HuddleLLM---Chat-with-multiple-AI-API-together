import Browser from 'webextension-polyfill'
import { extractTextFromPDF } from '~utils/pdf-utils'

console.log('📄 Offscreen PDF processor loaded')

// バックグラウンドスクリプトからのメッセージを処理
Browser.runtime.onMessage.addListener(async (message, sender) => {
  console.log('📨 Offscreen: Message received', message.type)
  
  if (message.type === 'EXTRACT_PDF_TEXT') {
    try {
      console.log('🔍 Offscreen: Starting PDF text extraction')
      const { pdfData } = message
      const buffer = new Uint8Array(pdfData).buffer
      
      const extractedText = await extractTextFromPDF(buffer)
      console.log('✅ Offscreen: PDF text extraction successful, length:', extractedText.length)
      
      return {
        success: true,
        text: extractedText
      }
    } catch (error) {
      console.error('❌ Offscreen: PDF text extraction failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }
  
  if (message.type === 'PING_OFFSCREEN') {
    console.log('🏓 Offscreen: Ping received')
    return { ready: true }
  }
})