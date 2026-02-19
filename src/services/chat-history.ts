import { zip } from 'lodash-es'
import Browser from 'webextension-polyfill'
import { ChatMessageModel } from '~types'
export type { ChatMessageModel }

const SESSION_SNAPSHOT_LIMIT = 800
const ALL_IN_ONE_SESSION_LIMIT = 800

// Storage Schema V2 - Individual Key Storage
export const STORAGE_SCHEMA_VERSION = 'v2'
export const MIGRATION_STATUS_KEY = 'sys:migration:session:v2'

export interface MigrationState {
  status: 'idle' | 'running' | 'verifying' | 'completed' | 'error'
  startedAt: number
  updatedAt: number
  totalCount: number
  migratedCount: number
  lastProcessedId?: string
  error?: { message: string; phase: string }
}

// Entity keys (actual session data)
export const SESSION_ENTITY_KEY = (uuid: string) => `session:snap:v2:${uuid}`
export const AIO_ENTITY_KEY = (id: string) => `session:aio:v2:${id}`
export const CONV_ENTITY_KEY = (botIndex: number, cid: string) => `conv:msg:v2:${botIndex}:${cid}`

// Index keys (lightweight metadata for listing/searching)
export const SESSION_INDEX_KEY = 'session:index:v2'

export interface SessionIndexV2 {
  version: number
  lastUpdated: number
  sessions: {
    id: string
    type: 'snap' | 'aio' | 'single'
    lastUpdated: number
    messageCount: number
    searchPreview: string  // First 200 chars for preview
    botIndices?: number[]
  }[]
}

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
  const storableMessages = messages.map((m) => ({ ...m, images: undefined, audioFiles: undefined }))
  await Browser.storage.local.set({ [key]: storableMessages })
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
  // 総メッセージ数を計算
  let totalMessageCount = 0
  const conversations: { [botIndex: number]: ChatMessageModel[] } = {}

  for (const botIndex of botIndices) {
    const messages = currentMessages?.[botIndex] || []
    const storableMessages = messages.map((m) => ({ ...m, images: undefined, audioFiles: undefined }))
    conversations[botIndex] = storableMessages
    totalMessageCount += storableMessages.length
  }

  // Check if V2 migration is completed
  const migrated = await isMigrationCompleted()

  if (migrated) {
    // Use V2: Save to individual key
    // First check if session exists to preserve createdAt
    const existingKey = SESSION_ENTITY_KEY(sessionUUID)
    const existingResult = await Browser.storage.local.get(existingKey)
    const existingSession = existingResult[existingKey] as SessionSnapshot | undefined

    const snapshotData: SessionSnapshot = {
      sessionUUID,
      createdAt: existingSession?.createdAt || Date.now(),
      lastUpdated: Date.now(),
      botIndices,
      layout,
      pairName,
      conversations,
      totalMessageCount
    }

    await saveSessionSnapshotV2(snapshotData)
  } else {
    // Use V1: Save to array
    const key = 'sessionSnapshots'
    const { [key]: snapshots = [] } = await Browser.storage.local.get(key)

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

    const trimmedSnapshots = snapshots.slice(0, SESSION_SNAPSHOT_LIMIT)
    await Browser.storage.local.set({ [key]: trimmedSnapshots })
  }
}

// セッションスナップショットの読み込み
export async function loadSessionSnapshots(): Promise<SessionSnapshot[]> {
  // Check if V2 migration is completed
  const migrated = await isMigrationCompleted()

  if (migrated) {
    // Use V2: Load from index and fetch individual sessions
    const index = await loadSessionIndexV2()
    const snapIds = index.sessions.filter(s => s.type === 'snap').map(s => s.id)

    // Load all snapshot sessions (still better than loading the old array)
    return await loadSessionsByIds(snapIds)
  } else {
    // Use V1: Load old array
    const key = 'sessionSnapshots'
    const { [key]: snapshots = [] } = await Browser.storage.local.get(key)

    // 最終更新時刻でソート
    return snapshots.sort((a: SessionSnapshot, b: SessionSnapshot) => b.lastUpdated - a.lastUpdated)
  }
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
  
  const trimmedSessions = sessions.slice(0, ALL_IN_ONE_SESSION_LIMIT)
  await Browser.storage.local.set({ [key]: trimmedSessions })
}

// All-in-oneセッションの読み込み
export async function loadAllInOneSessions(): Promise<AllInOneSessionWithMessages[]> {
  // Check if V2 migration is completed
  const migrated = await isMigrationCompleted()

  if (migrated) {
    // Use V2: Load from index and fetch individual sessions
    const index = await loadSessionIndexV2()
    const aioIds = index.sessions.filter(s => s.type === 'aio').map(s => s.id)

    // Load AIO session entities
    const keys = aioIds.map(id => AIO_ENTITY_KEY(id))
    const result = await Browser.storage.local.get(keys)
    const sessions = keys.map(key => result[key]).filter(Boolean) as AllInOneSession[]

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
  } else {
    // Use V1: Load old array
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
}

// セッションスナップショットの削除
export async function deleteSessionSnapshot(sessionUUID: string) {
  // Check if V2 migration is completed
  const migrated = await isMigrationCompleted()

  if (migrated) {
    // Use V2: Delete individual key and update index
    await deleteSessionSnapshotV2(sessionUUID)
  } else {
    // Use V1: Remove from array
    const key = 'sessionSnapshots'
    const { [key]: snapshots = [] } = await Browser.storage.local.get(key)

    const filteredSnapshots = snapshots.filter((s: SessionSnapshot) => s.sessionUUID !== sessionUUID)
    await Browser.storage.local.set({ [key]: filteredSnapshots })
  }
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

// 軽量なセッション存在チェック関数群
export async function quickCheckSessionSnapshots(): Promise<boolean> {
  const { sessionSnapshots } = await Browser.storage.local.get('sessionSnapshots')
  return Array.isArray(sessionSnapshots) && sessionSnapshots.length > 0
}

export async function quickCheckIndividualSessions(): Promise<boolean> {
  // 個別ボットセッション用のキーをチェック
  const keys = []
  for (let i = 0; i < 10; i++) {
    keys.push(`conversations:${i}`)
  }
  
  const results = await Browser.storage.local.get(keys)
  
  for (const key of keys) {
    const conversations = results[key]
    if (Array.isArray(conversations) && conversations.length > 0) {
      return true
    }
  }
  
  return false
}

export async function quickCheckAnySession(): Promise<boolean> {
  // セッションスナップショットをチェック
  const hasSnapshots = await quickCheckSessionSnapshots()
  if (hasSnapshots) return true
  
  // 個別ボットセッションをチェック
  return await quickCheckIndividualSessions()
}

// 最新のセッション1つのみを読み込み
export async function loadLatestSession(): Promise<SessionSnapshot | ConversationWithMessages | null> {
  // まずセッションスナップショットから最新を取得
  const { sessionSnapshots = [] } = await Browser.storage.local.get('sessionSnapshots')
  
  if (sessionSnapshots.length > 0) {
    // 最新のセッションスナップショットを返す
    const sorted = sessionSnapshots.sort((a: SessionSnapshot, b: SessionSnapshot) => b.lastUpdated - a.lastUpdated)
    return sorted[0]
  }
  
  // セッションスナップショットがない場合、個別ボットセッションから最新を取得
  let latestConversation: ConversationWithMessages | null = null
  let latestTime = 0
  
  for (let botIndex = 0; botIndex < 10; botIndex++) {
    const conversations = await loadHistoryConversations(botIndex)
    if (conversations.length > 0) {
      const latest = conversations[0] // 最新の会話
      if (latest.createdAt > latestTime) {
        const messages = await loadConversationMessages(botIndex, latest.id)
        latestConversation = {
          ...latest,
          messages
        }
        latestTime = latest.createdAt
      }
    }
  }
  
  return latestConversation
}

// 最新3つのセッションを読み込み
export async function loadLatest3Sessions(): Promise<(SessionSnapshot | ConversationWithMessages)[]> {
  const allSessions: (SessionSnapshot | ConversationWithMessages & { lastUpdated: number })[] = []

  // セッションスナップショットを取得
  const { sessionSnapshots = [] } = await Browser.storage.local.get('sessionSnapshots')
  for (const snapshot of sessionSnapshots) {
    allSessions.push(snapshot)
  }

  // 個別ボットセッションを取得
  for (let botIndex = 0; botIndex < 10; botIndex++) {
    const conversations = await loadHistoryConversations(botIndex)
    for (const conversation of conversations) {
      const messages = await loadConversationMessages(botIndex, conversation.id)
      allSessions.push({
        ...conversation,
        messages,
        lastUpdated: conversation.createdAt // 個別セッションの場合はcreatedAtをlastUpdatedとして使用
      })
    }
  }

  // lastUpdatedで降順ソートして最新3つを返す
  allSessions.sort((a, b) => b.lastUpdated - a.lastUpdated)
  return allSessions.slice(0, 3)
}

// All-in-Oneセッションの2-4件目を読み込み（1件目をスキップ）
export async function loadNext3Sessions(): Promise<SessionSnapshot[]> {
  // セッションスナップショット（All-in-One）のみ取得
  const { sessionSnapshots = [] } = await Browser.storage.local.get('sessionSnapshots')

  // lastUpdatedで降順ソートして2-4件目を返す（1件目をスキップ）
  const sortedSnapshots = sessionSnapshots.sort((a: SessionSnapshot, b: SessionSnapshot) => b.lastUpdated - a.lastUpdated)
  return sortedSnapshots.slice(1, 4) // インデックス1-3 = 2-4件目
}

// ============================================================================
// Storage V2 API - Individual Key Storage (Post-Migration)
// ============================================================================

// Load specific sessions by IDs (NEW - FAST)
export async function loadSessionsByIds(sessionIds: string[]): Promise<SessionSnapshot[]> {
  if (!sessionIds || sessionIds.length === 0) return []

  const keys = sessionIds.map(id => SESSION_ENTITY_KEY(id))
  const result = await Browser.storage.local.get(keys)

  return keys.map(key => result[key]).filter(Boolean)
}

// Load session index (lightweight)
export async function loadSessionIndexV2(): Promise<SessionIndexV2> {
  const result = await Browser.storage.local.get(SESSION_INDEX_KEY)
  return result[SESSION_INDEX_KEY] || { version: 2, sessions: [], lastUpdated: 0 }
}

// Save single session (updates both entity and index)
export async function saveSessionSnapshotV2(session: SessionSnapshot): Promise<void> {
  const key = SESSION_ENTITY_KEY(session.sessionUUID)

  // Write entity
  await Browser.storage.local.set({ [key]: session })

  // Update index
  const index = await loadSessionIndexV2()
  const existingIndex = index.sessions.findIndex(s => s.id === session.sessionUUID && s.type === 'snap')

  const indexEntry = {
    id: session.sessionUUID,
    type: 'snap' as const,
    lastUpdated: session.lastUpdated,
    messageCount: session.totalMessageCount,
    searchPreview: buildSearchPreview(session),
    botIndices: session.botIndices
  }

  if (existingIndex >= 0) {
    index.sessions[existingIndex] = indexEntry
  } else {
    index.sessions.unshift(indexEntry)
  }

  // Re-sort
  index.sessions.sort((a, b) => b.lastUpdated - a.lastUpdated)
  index.lastUpdated = Date.now()

  await Browser.storage.local.set({ [SESSION_INDEX_KEY]: index })
}

// Delete session snapshot V2
export async function deleteSessionSnapshotV2(sessionUUID: string): Promise<void> {
  // Delete entity
  const key = SESSION_ENTITY_KEY(sessionUUID)
  await Browser.storage.local.remove(key)

  // Update index
  const index = await loadSessionIndexV2()
  index.sessions = index.sessions.filter(s => !(s.id === sessionUUID && s.type === 'snap'))
  index.lastUpdated = Date.now()

  await Browser.storage.local.set({ [SESSION_INDEX_KEY]: index })
}

// Helper: Build search preview from session
function buildSearchPreview(session: SessionSnapshot): string {
  const allMessages = Object.values(session.conversations || {}).flat()
  const firstUserMsg = allMessages.find((m: any) =>
    m && m.author === 'user' && typeof m.text === 'string' && m.text.trim() !== ''
  )

  const preview = firstUserMsg?.text || session.pairName || ''
  return preview.substring(0, 200)
}

// Check if migration is completed
export async function isMigrationCompleted(): Promise<boolean> {
  const result = await Browser.storage.local.get(MIGRATION_STATUS_KEY)
  const status = result[MIGRATION_STATUS_KEY] as MigrationState | undefined
  return status?.status === 'completed'
}
