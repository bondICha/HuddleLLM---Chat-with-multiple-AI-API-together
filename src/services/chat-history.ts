import { zip } from 'lodash-es'
import Browser from 'webextension-polyfill'
import { ChatMessageModel } from '~types'
export type { ChatMessageModel }

/**
 * conversations:$index => Conversation[]
 * conversation:$index:$cid:messages => ChatMessageModel[]
 */

interface Conversation {
  id: string
  createdAt: number
}

type ConversationWithMessages = Conversation & { messages: ChatMessageModel[] }

async function loadHistoryConversations(index: number): Promise<Conversation[]> {
  const key = `conversations:${index}`
  const { [key]: value } = await Browser.storage.local.get(key)
  return value || []
}

async function deleteHistoryConversation(index: number, cid: string) {
  const conversations = await loadHistoryConversations(index)
  const newConversations = conversations.filter((c) => c.id !== cid)
  await Browser.storage.local.set({ [`conversations:${index}`]: newConversations })
}

async function loadConversationMessages(index: number, cid: string): Promise<ChatMessageModel[]> {
  const key = `conversation:${index}:${cid}:messages`
  const { [key]: value } = await Browser.storage.local.get(key)
  return value || []
}

export async function setConversationMessages(index: number, cid: string, messages: ChatMessageModel[]) {
  const conversations = await loadHistoryConversations(index)
  if (!conversations.some((c) => c.id === cid)) {
    conversations.unshift({ id: cid, createdAt: Date.now() })
    await Browser.storage.local.set({ [`conversations:${index}`]: conversations })
  }
  const key = `conversation:${index}:${cid}:messages`
  await Browser.storage.local.set({ [key]: messages })
}

export async function loadHistoryMessages(index: number): Promise<ConversationWithMessages[]> {
  const conversations = await loadHistoryConversations(index)
  const messagesList = await Promise.all(conversations.map((c) => loadConversationMessages(index, c.id)))
  return zip(conversations, messagesList).map(([c, messages]) => ({
    id: c!.id,
    createdAt: c!.createdAt,
    messages: messages!,
  }))
}

export async function deleteHistoryMessage(index: number, conversationId: string, messageId: string) {
  const messages = await loadConversationMessages(index, conversationId)
  const newMessages = messages.filter((m) => m.id !== messageId)
  await setConversationMessages(index, conversationId, newMessages)
  if (!newMessages.length) {
    await deleteHistoryConversation(index, conversationId)
  }
}

export async function clearHistoryMessages(index: number) {
  const conversations = await loadHistoryConversations(index)
  await Promise.all(
    conversations.map((c) => {
      return Browser.storage.local.remove(`conversation:${index}:${c.id}:messages`)
    }),
  )
  await Browser.storage.local.remove(`conversations:${index}`)
}

// セッションスナップショット用の型定義
interface SessionSnapshot {
  sessionUUID: string
  createdAt: number
  lastUpdated: number
  botIndices: number[]
  layout: string
  pairName?: string
  conversations: { [botIndex: number]: ChatMessageModel[] } // スナップショット時点の会話内容を直接保存
  totalMessageCount: number
}

// 後方互換性のための旧型定義（段階的移行用）
interface AllInOneSession {
  id: string
  createdAt: number
  lastUpdated: number
  botIndices: number[]
  layout: string
  pairName?: string
  conversationSnapshots?: { [botIndex: number]: string } // 保存時点の会話ID
}

interface AllInOneSessionWithMessages extends AllInOneSession {
  conversations: { [botIndex: number]: ConversationWithMessages[] }
  messageCount?: number
}

// セッションスナップショットの保存
export async function saveSessionSnapshot(sessionUUID: string, botIndices: number[], layout: string, pairName?: string, currentMessages?: { [botIndex: number]: ChatMessageModel[] }) {
  const key = 'sessionSnapshots'
  const { [key]: snapshots = [] } = await Browser.storage.local.get(key)
  
  // 総メッセージ数を計算
  let totalMessageCount = 0
  const conversations: { [botIndex: number]: ChatMessageModel[] } = {}
  
  for (const botIndex of botIndices) {
    const messages = currentMessages?.[botIndex] || []
    conversations[botIndex] = messages
    totalMessageCount += messages.length
  }
  
  const existingIndex = snapshots.findIndex((s: SessionSnapshot) => s.sessionUUID === sessionUUID)
  const snapshotData: SessionSnapshot = {
    sessionUUID,
    createdAt: existingIndex >= 0 ? snapshots[existingIndex].createdAt : Date.now(),
    lastUpdated: Date.now(),
    botIndices,
    layout,
    pairName,
    conversations,
    totalMessageCount
  }
  
  if (existingIndex >= 0) {
    snapshots[existingIndex] = snapshotData
  } else {
    snapshots.unshift(snapshotData)
  }
  
  // 最新30件のみ保持
  const trimmedSnapshots = snapshots.slice(0, 30)
  await Browser.storage.local.set({ [key]: trimmedSnapshots })
}

// セッションスナップショットの読み込み
export async function loadSessionSnapshots(): Promise<SessionSnapshot[]> {
  const key = 'sessionSnapshots'
  const { [key]: snapshots = [] } = await Browser.storage.local.get(key)
  
  // 最終更新時刻でソート
  return snapshots.sort((a: SessionSnapshot, b: SessionSnapshot) => b.lastUpdated - a.lastUpdated)
}

// 特定のセッションスナップショットを取得
export async function getSessionSnapshot(sessionUUID: string): Promise<SessionSnapshot | null> {
  const snapshots = await loadSessionSnapshots()
  return snapshots.find(s => s.sessionUUID === sessionUUID) || null
}

// All-in-oneセッションの保存（旧版・後方互換性用）
export async function setAllInOneSession(sessionId: string, botIndices: number[], layout: string, pairName?: string, currentConversations?: { [botIndex: number]: string }) {
  const key = 'allInOneSessions'
  const { [key]: sessions = [] } = await Browser.storage.local.get(key)
  
  const existingIndex = sessions.findIndex((s: AllInOneSession) => s.id === sessionId)
  const sessionData: AllInOneSession = {
    id: sessionId,
    createdAt: existingIndex >= 0 ? sessions[existingIndex].createdAt : Date.now(),
    lastUpdated: Date.now(),
    botIndices,
    layout,
    pairName,
    conversationSnapshots: currentConversations
  }
  
  if (existingIndex >= 0) {
    sessions[existingIndex] = sessionData
  } else {
    sessions.unshift(sessionData)
  }
  
  // 最新20件のみ保持
  const trimmedSessions = sessions.slice(0, 20)
  await Browser.storage.local.set({ [key]: trimmedSessions })
}

// All-in-oneセッションの読み込み
export async function loadAllInOneSessions(): Promise<AllInOneSessionWithMessages[]> {
  const key = 'allInOneSessions'
  const { [key]: sessions = [] } = await Browser.storage.local.get(key)
  
  const sessionsWithMessages: AllInOneSessionWithMessages[] = []
  
  for (const session of sessions) {
    const conversations: { [botIndex: number]: ConversationWithMessages[] } = {}
    let totalMessageCount = 0
    
    // 各ボットの会話履歴を読み込み
    for (const botIndex of session.botIndices) {
      const allConversations = await loadHistoryMessages(botIndex)
      conversations[botIndex] = allConversations
      
      // conversationSnapshotsがある場合は、その特定の会話のメッセージ数のみカウント
      if (session.conversationSnapshots && session.conversationSnapshots[botIndex]) {
        const targetConversationId = session.conversationSnapshots[botIndex]
        const targetConversation = allConversations.find(c => c.id === targetConversationId)
        if (targetConversation) {
          totalMessageCount += targetConversation.messages.length
        }
      } else {
        // スナップショットがない場合は最新の会話のメッセージ数をカウント
        if (allConversations.length > 0) {
          totalMessageCount += allConversations[0].messages.length
        }
      }
    }
    
    // メッセージがあるセッションのみ追加
    if (totalMessageCount > 0) {
      sessionsWithMessages.push({
        ...session,
        conversations,
        messageCount: totalMessageCount
      })
    }
  }
  
  // 最終更新時刻でソート
  return sessionsWithMessages.sort((a, b) => b.lastUpdated - a.lastUpdated)
}

// セッションスナップショットの削除
export async function deleteSessionSnapshot(sessionUUID: string) {
  const key = 'sessionSnapshots'
  const { [key]: snapshots = [] } = await Browser.storage.local.get(key)
  
  const filteredSnapshots = snapshots.filter((s: SessionSnapshot) => s.sessionUUID !== sessionUUID)
  await Browser.storage.local.set({ [key]: filteredSnapshots })
}

// All-in-oneセッションの削除
export async function deleteAllInOneSession(sessionId: string) {
  const key = 'allInOneSessions'
  const { [key]: sessions = [] } = await Browser.storage.local.get(key)
  
  const filteredSessions = sessions.filter((s: AllInOneSession) => s.id !== sessionId)
  await Browser.storage.local.set({ [key]: filteredSessions })
}

// 全てのセッションスナップショットを削除
export async function clearAllSessionSnapshots() {
  const key = 'sessionSnapshots'
  await Browser.storage.local.set({ [key]: [] })
}

// 全てのAll-in-oneセッションを削除
export async function clearAllInOneSessions() {
  const key = 'allInOneSessions'
  await Browser.storage.local.set({ [key]: [] })
}

// 全てのカスタムボット履歴を削除
export async function clearAllCustomBotHistory() {
  for (let botIndex = 0; botIndex < 10; botIndex++) {
    await clearHistoryMessages(botIndex)
  }
}
