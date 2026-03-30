import { useAtom } from 'jotai'
import { useEffect, useRef } from 'react'
import { currentSessionNameAtom } from '~app/atoms/all-in-one'
import { generateSessionName, resetTitleBot } from '~services/title-generator'
import { getUserConfig } from '~services/user-config'
import { ChatMessageModel } from '~types'

interface UseSessionNameOptions {
  generating: boolean
  /** All chat panels' messages (multi-bot: multiple arrays, single-bot: one array) */
  getMessages: () => ChatMessageModel[][]
  /** Optional callback after session name is generated */
  onSessionNameGenerated?: (name: string) => void
}

/**
 * Hook for automatic session name generation.
 * Triggers when generating transitions from true → false.
 * Works for both Multi-bot (All-In-One) and Single-bot panels.
 */
export function useSessionNameGenerator({ generating, getMessages, onSessionNameGenerated }: UseSessionNameOptions) {
  const [currentSessionName, setCurrentSessionName] = useAtom(currentSessionNameAtom)

  const prevGeneratingRef = useRef(false)
  const sessionNameGeneratingRef = useRef(false)

  // アンマウント時にタイトル生成Botをリセット
  useEffect(() => {
    return () => { resetTitleBot() }
  }, [])

  useEffect(() => {
    const wasGenerating = prevGeneratingRef.current
    prevGeneratingRef.current = generating

    // generating が true→false に変わった瞬間だけ発火
    if (!wasGenerating || generating) return
    if (sessionNameGeneratingRef.current) return

    sessionNameGeneratingRef.current = true
    const generateName = async () => {
      try {
        const config = await getUserConfig()
        const titleBotIndex = config.titleGenerationBotIndex
        if (titleBotIndex === undefined) return // タイトル生成がオフ

        // 毎回更新モードでなければ、既にセッション名があればスキップ
        if (!config.titleUpdateEveryTurn && currentSessionName) return

        const allMessages = getMessages()
        if (allMessages.length === 0) return

        // 少なくとも1つのチャットに応答がある
        const hasResponses = allMessages.some(msgs => msgs.length >= 2)
        if (!hasResponses) return

        const name = await generateSessionName(allMessages, titleBotIndex)
        setCurrentSessionName(name)
        onSessionNameGenerated?.(name)
      } catch (_error) {
        // Silent failure - session name generation is optional
      } finally {
        sessionNameGeneratingRef.current = false
      }
    }

    generateName()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [generating])

  // ブラウザタブタイトルをセッション名に同期
  useEffect(() => {
    if (currentSessionName) {
      document.title = `${currentSessionName} - HuddleLLM`
    } else {
      document.title = 'HuddleLLM'
    }
    return () => { document.title = 'HuddleLLM' }
  }, [currentSessionName])

  return currentSessionName
}
