import { useAtom, useAtomValue, useSetAtom } from 'jotai'
import { atomWithStorage } from 'jotai/utils'
import { sample, uniqBy } from 'lodash-es'
import { FC, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { cx, uuid } from '~/utils'
import { pendingSearchQueryAtom, sessionToRestoreAtom, allInOneRestoreDataAtom } from '../state'
import { loadHistoryMessages, setAllInOneSession, saveSessionSnapshot, ChatMessageModel } from '~services/chat-history'
import Button from '~app/components/Button'
import ChatMessageInput from '~app/components/Chat/ChatMessageInput'
import LayoutSwitch from '~app/components/Chat/LayoutSwitch'
import { Layout } from '~app/consts'
import { useChat } from '~app/hooks/use-chat'
import ConversationPanel from '../components/Chat/ConversationPanel'
import { 
  allInOnePairsAtom, 
  activeAllInOneAtom,
  initializeAllInOneAtom,
  saveAllInOneConfigAtom,
  DEFAULT_BOTS, 
  DEFAULT_PAIR_CONFIG,
  AllInOnePairConfig 
} from '~app/atoms/all-in-one'


function replaceDeprecatedBots(bots: number[]): number[] {
  // インデックスが有効かどうかを確認（0以上の整数であること、undefinedやnullでないこと）
  return bots.map((index) => {
    if (typeof index === 'number' && index >= 0) {
      return index
    }
    // 無効な値の場合はDEFAULT_BOTSからランダムに選択
    return sample(DEFAULT_BOTS) || 0
  })
}

const GeneralChatPanel: FC<{
  chats: ReturnType<typeof useChat>[]
  setBots?: (bots: number[]) => void
  supportImageInput?: boolean
  currentSessionUUID?: string | null
  setCurrentSessionUUID?: (uuid: string | null) => void
}> = ({ chats, setBots, supportImageInput, currentSessionUUID, setCurrentSessionUUID }) => {
  const { t } = useTranslation()
  const generating = useMemo(() => chats.some((c) => c.generating), [chats])
  
  // タブローカルatomを使用
  const [activeAllInOne] = useAtom(activeAllInOneAtom)
  const [allInOnePairs, setAllInOnePairs] = useAtom(allInOnePairsAtom)
  const saveConfig = useSetAtom(saveAllInOneConfigAtom)
  
  // 現在のペア設定を取得
  const currentPairConfig = allInOnePairs[activeAllInOne] || DEFAULT_PAIR_CONFIG
  const layout = currentPairConfig.layout
  
  // 設定更新関数
  const updateCurrentPairConfig = (updates: Partial<AllInOnePairConfig>) => {
    setAllInOnePairs(prev => ({
      ...prev,
      [activeAllInOne]: {
        ...currentPairConfig,
        ...updates
      }
    }))
    // 設定を保存
    setTimeout(() => saveConfig(), 100)
  }
  
  const setLayout = (newLayout: Layout) => {
    updateCurrentPairConfig({ layout: newLayout })
  }
  
  const [refresh, setRefresh] = useState(0) // 更新用の state を追加
  const [pendingSearchQuery, setPendingSearchQuery] = useAtom(pendingSearchQueryAtom)
  
  // 現在のボット選択を取得
  const getCurrentBotIndices = (): number[] => {
    switch (layout) {
      case 'single':
        return currentPairConfig.singlePanelBots
      case 2:
      case 'twoHorizon':
        return currentPairConfig.twoPanelBots
      case 3:
        return currentPairConfig.threePanelBots
      case 4:
        return currentPairConfig.fourPanelBots
      case 'sixGrid':
        return currentPairConfig.sixPanelBots
      default:
        return currentPairConfig.twoPanelBots
    }
  }

  // リサイズ機能のstate
  const [gridAreaHeight, setGridAreaHeight] = useState('99%') // 初期状態では入力エリアを小さく
  const [isResizing, setIsResizing] = useState(false)
  const [hasUserResized, setHasUserResized] = useState(false) // ユーザーがリサイズしたかどうか
  
  // refs
  const mainContainerRef = useRef<HTMLDivElement>(null)
  const gridAreaRef = useRef<HTMLDivElement>(null)
  const resizerRef = useRef<HTMLDivElement>(null)
  const inputAreaRef = useRef<HTMLDivElement>(null)

  // 共通の高さ設定関数
  const updateGridAreaHeight = useCallback((newGridAreaHeight: number) => {
    if (!mainContainerRef.current) return
    
    const containerHeight = mainContainerRef.current.getBoundingClientRect().height
    const heightPercentage = (newGridAreaHeight / containerHeight) * 100
    const clampedPercentage = Math.max(10, Math.min(95, heightPercentage))
    
    setGridAreaHeight(`${clampedPercentage}%`)
  }, [])

  // マウスイベントハンドラー
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizing || !mainContainerRef.current) return
    
    const containerRect = mainContainerRef.current.getBoundingClientRect()
    const containerHeight = containerRect.height
    const mouseY = e.clientY - containerRect.top
    
    // 高さの制約
    const minHeight = 100 // チャットエリアの最小高さ（固定100px）
    const maxHeight = containerHeight - 60 // 入力エリアが最低60px確保できるよう
    const clampedHeight = Math.max(minHeight, Math.min(maxHeight, mouseY))
    
    updateGridAreaHeight(clampedHeight)
    setHasUserResized(true) // ユーザーがリサイズしたことを記録
  }, [isResizing, updateGridAreaHeight])

  const handleMouseUp = useCallback(() => {
    setIsResizing(false)
  }, [])

  // 自動拡大時の高さ変化ハンドラー
  const handleAutoHeightChange = useCallback((textareaHeight: number) => {
    if (hasUserResized || !mainContainerRef.current) return
    
    // TextAreaの高さに基づいて入力エリア全体の必要な高さを計算
    const containerHeight = mainContainerRef.current.getBoundingClientRect().height
    const inputAreaPadding = 32 // px-4 py-2 + その他のパディング
    const neededInputAreaHeight = textareaHeight + inputAreaPadding
    
    // グリッドエリアの高さを調整（共通関数を使用）
    const newGridAreaHeight = Math.max(100, containerHeight - neededInputAreaHeight)
    updateGridAreaHeight(newGridAreaHeight)
  }, [hasUserResized, updateGridAreaHeight])

  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [isResizing, handleMouseMove, handleMouseUp])

  useEffect(() => {
  }, [chats.length, supportImageInput])

  const sendSingleMessage = useCallback(
   (input: string, index: number, images?: File[], attachments?: { name: string; content: string }[]) => {
     const chat = chats.find((c) => c.index === index);
     if (chat) {
       chat.sendMessage(input, images, attachments);
     }
   },
   [chats],
 );

  const sendAllMessage = useCallback(
    (input: string, images?: File[], attachments?: { name: string; content: string }[]) => {
      if (!input?.trim() && !images?.length && !attachments?.length) return;

      // まずメッセージを送信
      uniqBy(chats, (c) => c.index).forEach((c) => c.sendMessage(input, images, attachments));
    },
    [chats],
  )

  // 生成完了時にセッション保存
  useEffect(() => {
    // すべてのチャットの生成が完了している場合にセッションを保存
    if (chats.length > 0 && !generating && chats.some(chat => chat.messages.length > 0)) {
      const currentBots = getCurrentBotIndices();
      const pairName = currentPairConfig.pairName || `All-in-One ${currentBots.length} bots`;
      
      // 既存のセッションUUIDがあればそれを使用、なければ新しいUUIDを生成
      const sessionUUID = currentSessionUUID || `session-${uuid()}`;
      
      // 新しいUUIDを生成した場合は保存
      if (!currentSessionUUID && setCurrentSessionUUID) {
        setCurrentSessionUUID(sessionUUID);
      }

      // 各チャットの現在のメッセージを取得
      const currentMessages: { [botIndex: number]: ChatMessageModel[] } = {};
      uniqBy(chats, (c) => c.index).forEach((chat) => {
        if (chat.messages.length > 0) {
          currentMessages[chat.index] = [...chat.messages];
        }
      });

      // メッセージがある場合のみ保存
      if (Object.keys(currentMessages).length > 0) {
        saveSessionSnapshot(sessionUUID, currentBots, layout.toString(), pairName, currentMessages);
      }
    }
  }, [generating, chats, getCurrentBotIndices, currentPairConfig, layout, currentSessionUUID])

  // 保存された検索クエリがあれば自動的に送信
  useEffect(() => {
    // chats配列内のすべてのchatオブジェクトが準備完了しているか確認
    // AsyncAbstractBotの場合、初期化が完了していることを確認
    const allChatsReady = chats.length > 0 && chats.every(chat => {
      if (!chat || !chat.bot) return false;
      // chatオブジェクトのisInitializedプロパティを確認
      return chat.isInitialized;
    });
    if (pendingSearchQuery && !generating && allChatsReady) {
      sendAllMessage(pendingSearchQuery)
      
      setPendingSearchQuery(null)
    }
  }, [pendingSearchQuery, generating, chats, sendAllMessage, setPendingSearchQuery])

  const modifyAllLastMessage = async(text: string) => {
    uniqBy(chats, (c) => c.index).forEach((c) => c.modifyLastMessage(text))
  }

  const onSwitchBot = useCallback(
    (newIndex: number, arrayIndex: number) => {
      if (!setBots) {
        return
      }
      
      // 現在のチャットを取得
      const currentChat = chats[arrayIndex]
      
      // 前のモデルの会話状態をリセット
      if (currentChat) {
        currentChat.resetConversation()
      }
      
      const currentBots = getCurrentBotIndices()
      const newBots = [...currentBots]
      newBots[arrayIndex] = newIndex
      
      // 各パネルから渡されたsetBots関数を使用
      setBots(newBots)
      
      // refreshを更新して再レンダリングを促す
      setRefresh(prev => prev + 1)
    },
    [chats, setBots, setRefresh, getCurrentBotIndices],
  )

  const onLayoutChange = useCallback(
    (v: Layout) => {
      setLayout(v)
    },
    [setLayout],
  )

  return (
    <div className="flex flex-col overflow-hidden h-full" ref={mainContainerRef}>
      {/* チャットパネルのグリッドエリア */}
      <div
        ref={gridAreaRef}
        style={{ height: gridAreaHeight }}
        className={cx(
          layout === 'twoHorizon'
            ? 'flex flex-col'
            : 'grid auto-rows-fr',
          'overflow-hidden',
          chats.length === 1
            ? 'grid-cols-1'
            : chats.length % 3 === 0 ? 'grid-cols-3' : 'grid-cols-2',
          'gap-1 mb-1',
        )}
      >
        {chats.map((chat, index) => (
          <ConversationPanel
            key={`${chat.index}-${index}-${refresh}`}
            index={chat.index}
            bot={chat.bot}
            messages={chat.messages}
            onUserSendMessage={(input, images, attachments) => sendSingleMessage(input, chat.index, images, attachments)}
            generating={chat.generating}
            stopGenerating={chat.stopGenerating}
            mode="compact"
            resetConversation={chat.resetConversation}
            onSwitchBot={setBots ? (newIndex) => onSwitchBot(newIndex, index) : undefined}
            onPropaganda={modifyAllLastMessage}
          />
        ))}
      </div>

      {/* リサイズハンドル（透明、判定エリア拡大） */}
      <div className="relative w-full h-px shrink-0 bg-transparent">
        <div
          ref={resizerRef}
          className="absolute inset-x-0 -top-2 -bottom-2 cursor-row-resize"
          onMouseDown={(e) => {
            setIsResizing(true)
            e.preventDefault()
          }}
        />
      </div>

      {/* 入力エリア */}
      <div className="flex flex-row gap-2 flex-grow min-h-0 overflow-hidden" ref={inputAreaRef}>
        <LayoutSwitch layout={layout} onChange={onLayoutChange} />
        <ChatMessageInput
          mode="full"
          className={`rounded-2xl bg-primary-background px-4 py-2 grow ${!hasUserResized ? 'max-h-full overflow-hidden' : ''}`}
          disabled={generating}
          onSubmit={sendAllMessage}
          actionButton={!generating && <Button text={t('Send')} color="primary" type="submit" />}
          autoFocus={true}
          supportImageInput={supportImageInput}
          fullHeight={hasUserResized}
          maxRows={hasUserResized ? undefined : 12}
          onHeightChange={handleAutoHeightChange}
        />
      </div>
    </div>
  )
}

const SingleBotChatPanel: FC<{
  currentSessionUUID?: string | null
  setCurrentSessionUUID?: (uuid: string | null) => void
}> = ({ currentSessionUUID, setCurrentSessionUUID }) => {
  const [activeAllInOne] = useAtom(activeAllInOneAtom)
  const [allInOnePairs, setAllInOnePairs] = useAtom(allInOnePairsAtom)
  const saveConfig = useSetAtom(saveAllInOneConfigAtom)
  const currentPairConfig = allInOnePairs[activeAllInOne] || DEFAULT_PAIR_CONFIG
  const bots = currentPairConfig.singlePanelBots || DEFAULT_PAIR_CONFIG.singlePanelBots
  
  const setBots = (newBots: number[]) => {
    setAllInOnePairs(prev => ({
      ...prev,
      [activeAllInOne]: {
        ...currentPairConfig,
        singlePanelBots: newBots
      }
    }))
    setTimeout(() => saveConfig(), 100)
  }
  
  const multiPanelBotIndices = useMemo(() => replaceDeprecatedBots(bots), [bots])
  
  // 配列が空または最初の要素がundefinedの場合の追加チェック
  const safeIndex = multiPanelBotIndices[0] ?? 0
  const chat = useChat(safeIndex)
  
  const chats = useMemo(() => [chat], [chat])
  
  return <GeneralChatPanel
    chats={chats}
    setBots={setBots}
    supportImageInput={true}
    currentSessionUUID={currentSessionUUID}
    setCurrentSessionUUID={setCurrentSessionUUID}
  />
}

const TwoBotChatPanel: FC<{
  currentSessionUUID?: string | null
  setCurrentSessionUUID?: (uuid: string | null) => void
}> = ({ currentSessionUUID, setCurrentSessionUUID }) => {
  const [activeAllInOne] = useAtom(activeAllInOneAtom)
  const [allInOnePairs, setAllInOnePairs] = useAtom(allInOnePairsAtom)
  const saveConfig = useSetAtom(saveAllInOneConfigAtom)
  const currentPairConfig = allInOnePairs[activeAllInOne] || DEFAULT_PAIR_CONFIG
  const bots = currentPairConfig.twoPanelBots || DEFAULT_PAIR_CONFIG.twoPanelBots
  
  const setBots = (newBots: number[]) => {
    setAllInOnePairs(prev => ({
      ...prev,
      [activeAllInOne]: {
        ...currentPairConfig,
        twoPanelBots: newBots
      }
    }))
    setTimeout(() => saveConfig(), 100)
  }
  
  const multiPanelBotIndices = useMemo(() => replaceDeprecatedBots(bots), [bots])
  
  const chat1 = useChat(multiPanelBotIndices[0] ?? 0)
  const chat2 = useChat(multiPanelBotIndices[1] ?? 1)
  
  const chats = useMemo(() => [chat1, chat2], [chat1, chat2])
  
  return <GeneralChatPanel
    chats={chats}
    setBots={setBots}
    supportImageInput={true}
    currentSessionUUID={currentSessionUUID}
    setCurrentSessionUUID={setCurrentSessionUUID}
  />
}

const TwoHorizonBotChatPanel: FC<{
  currentSessionUUID?: string | null
  setCurrentSessionUUID?: (uuid: string | null) => void
}> = ({ currentSessionUUID, setCurrentSessionUUID }) => {
  const [activeAllInOne] = useAtom(activeAllInOneAtom)
  const [allInOnePairs, setAllInOnePairs] = useAtom(allInOnePairsAtom)
  const saveConfig = useSetAtom(saveAllInOneConfigAtom)
  const currentPairConfig = allInOnePairs[activeAllInOne] || DEFAULT_PAIR_CONFIG
  const bots = currentPairConfig.twoPanelBots || DEFAULT_PAIR_CONFIG.twoPanelBots
  
  const setBots = (newBots: number[]) => {
    setAllInOnePairs(prev => ({
      ...prev,
      [activeAllInOne]: {
        ...currentPairConfig,
        twoPanelBots: newBots
      }
    }))
    setTimeout(() => saveConfig(), 100)
  }
  
  const multiPanelBotIndices = useMemo(() => replaceDeprecatedBots(bots), [bots])
  
  const chat1 = useChat(multiPanelBotIndices[0] ?? 0)
  const chat2 = useChat(multiPanelBotIndices[1] ?? 1)
  
  const chats = useMemo(() => [chat1, chat2], [chat1, chat2])
  
  return <GeneralChatPanel
    chats={chats}
    setBots={setBots}
    supportImageInput={true}
    currentSessionUUID={currentSessionUUID}
    setCurrentSessionUUID={setCurrentSessionUUID}
  />
}

const ThreeBotChatPanel: FC<{
  currentSessionUUID?: string | null
  setCurrentSessionUUID?: (uuid: string | null) => void
}> = ({ currentSessionUUID, setCurrentSessionUUID }) => {
  const [activeAllInOne] = useAtom(activeAllInOneAtom)
  const [allInOnePairs, setAllInOnePairs] = useAtom(allInOnePairsAtom)
  const saveConfig = useSetAtom(saveAllInOneConfigAtom)
  const currentPairConfig = allInOnePairs[activeAllInOne] || DEFAULT_PAIR_CONFIG
  const bots = currentPairConfig.threePanelBots || DEFAULT_PAIR_CONFIG.threePanelBots
  
  const setBots = (newBots: number[]) => {
    setAllInOnePairs(prev => ({
      ...prev,
      [activeAllInOne]: {
        ...currentPairConfig,
        threePanelBots: newBots
      }
    }))
    setTimeout(() => saveConfig(), 100)
  }
  
  const multiPanelBotIndices = useMemo(() => replaceDeprecatedBots(bots), [bots])
  
  const chat1 = useChat(multiPanelBotIndices[0] ?? 0)
  const chat2 = useChat(multiPanelBotIndices[1] ?? 1)
  const chat3 = useChat(multiPanelBotIndices[2] ?? 2)
  
  const chats = useMemo(() => [chat1, chat2, chat3], [chat1, chat2, chat3])
  
  return <GeneralChatPanel
    chats={chats}
    setBots={setBots}
    supportImageInput={true}
    currentSessionUUID={currentSessionUUID}
    setCurrentSessionUUID={setCurrentSessionUUID}
  />
}

const FourBotChatPanel: FC<{
  currentSessionUUID?: string | null
  setCurrentSessionUUID?: (uuid: string | null) => void
}> = ({ currentSessionUUID, setCurrentSessionUUID }) => {
  const [activeAllInOne] = useAtom(activeAllInOneAtom)
  const [allInOnePairs, setAllInOnePairs] = useAtom(allInOnePairsAtom)
  const saveConfig = useSetAtom(saveAllInOneConfigAtom)
  const currentPairConfig = allInOnePairs[activeAllInOne] || DEFAULT_PAIR_CONFIG
  const bots = currentPairConfig.fourPanelBots || DEFAULT_PAIR_CONFIG.fourPanelBots
  
  const setBots = (newBots: number[]) => {
    setAllInOnePairs(prev => ({
      ...prev,
      [activeAllInOne]: {
        ...currentPairConfig,
        fourPanelBots: newBots
      }
    }))
    setTimeout(() => saveConfig(), 100)
  }
  
  const multiPanelBotIndices = useMemo(() => replaceDeprecatedBots(bots), [bots])
  
  const chat1 = useChat(multiPanelBotIndices[0] ?? 0)
  const chat2 = useChat(multiPanelBotIndices[1] ?? 1)
  const chat3 = useChat(multiPanelBotIndices[2] ?? 2)
  const chat4 = useChat(multiPanelBotIndices[3] ?? 3)
  
  const chats = useMemo(() => [chat1, chat2, chat3, chat4], [chat1, chat2, chat3, chat4])
  
  return <GeneralChatPanel
    chats={chats}
    setBots={setBots}
    supportImageInput={true}
    currentSessionUUID={currentSessionUUID}
    setCurrentSessionUUID={setCurrentSessionUUID}
  />
}

const SixBotChatPanel: FC<{
  currentSessionUUID?: string | null
  setCurrentSessionUUID?: (uuid: string | null) => void
}> = ({ currentSessionUUID, setCurrentSessionUUID }) => {
  const [activeAllInOne] = useAtom(activeAllInOneAtom)
  const [allInOnePairs, setAllInOnePairs] = useAtom(allInOnePairsAtom)
  const saveConfig = useSetAtom(saveAllInOneConfigAtom)
  const currentPairConfig = allInOnePairs[activeAllInOne] || DEFAULT_PAIR_CONFIG
  const bots = currentPairConfig.sixPanelBots || DEFAULT_PAIR_CONFIG.sixPanelBots
  
  const setBots = (newBots: number[]) => {
    setAllInOnePairs(prev => ({
      ...prev,
      [activeAllInOne]: {
        ...currentPairConfig,
        sixPanelBots: newBots
      }
    }))
    setTimeout(() => saveConfig(), 100)
  }
  
  const multiPanelBotIndices = useMemo(() => replaceDeprecatedBots(bots), [bots])
  
  const chat1 = useChat(multiPanelBotIndices[0] ?? 0)
  const chat2 = useChat(multiPanelBotIndices[1] ?? 1)
  const chat3 = useChat(multiPanelBotIndices[2] ?? 2)
  const chat4 = useChat(multiPanelBotIndices[3] ?? 3)
  const chat5 = useChat(multiPanelBotIndices[4] ?? 4)
  const chat6 = useChat(multiPanelBotIndices[5] ?? 5)
  
  const chats = useMemo(() => [chat1, chat2, chat3, chat4, chat5, chat6], [chat1, chat2, chat3, chat4, chat5, chat6])
  
  return <GeneralChatPanel
    chats={chats}
    setBots={setBots}
    supportImageInput={true}
    currentSessionUUID={currentSessionUUID}
    setCurrentSessionUUID={setCurrentSessionUUID}
  />
}


const MultiBotChatPanel: FC = () => {
  const [activeAllInOne] = useAtom(activeAllInOneAtom)
  const [allInOnePairs, setAllInOnePairs] = useAtom(allInOnePairsAtom)
  const initializeConfig = useSetAtom(initializeAllInOneAtom)
  const currentPairConfig = allInOnePairs[activeAllInOne] || DEFAULT_PAIR_CONFIG
  const layout = currentPairConfig.layout
  const sessionToRestore = useAtomValue(sessionToRestoreAtom)
  const setSessionToRestore = useSetAtom(sessionToRestoreAtom)
  const setAllInOneRestoreData = useSetAtom(allInOneRestoreDataAtom)
  
  // 現在のセッションUUIDを保持（復元された場合はそのUUID、新規の場合はnull）
  const [currentSessionUUID, setCurrentSessionUUID] = useState<string | null>(null)
  
  // 初期化（前回の設定を復旧）
  useEffect(() => {
    initializeConfig()
  }, [])
  
  // セッションスナップショット復元の処理
  useEffect(() => {
    const restoreSessionSnapshot = async () => {
      if (sessionToRestore && sessionToRestore.type === 'sessionSnapshot') {
        try {
          const { botIndices, layout: sessionLayout, pairName, snapshotMessages, sessionUUID } = sessionToRestore
          
          // 復元されたセッションのUUIDを保持
          setCurrentSessionUUID(sessionUUID || null)
          
          // セッションからlayoutを復元（文字列から適切な型に変換）
          let restoredLayout: Layout;
          if (sessionLayout === 'single' || sessionLayout === 'twoHorizon' || sessionLayout === 'sixGrid') {
            restoredLayout = sessionLayout;
          } else {
            const layoutNum = typeof sessionLayout === 'string' ? parseInt(sessionLayout) : sessionLayout;
            if (layoutNum === 2) restoredLayout = 2;
            else if (layoutNum === 3) restoredLayout = 3;
            else if (layoutNum === 4) restoredLayout = 4;
            else restoredLayout = 2; // デフォルト
          }
          
          // Session復元時の設定を直接適用
          const sessionRestoreKey = `session-${sessionUUID}`
          const newPairConfig: AllInOnePairConfig = {
            ...DEFAULT_PAIR_CONFIG, // まずデフォルトでリセット
            layout: restoredLayout,
            pairName: pairName,
          };

          if (botIndices) {
            if (restoredLayout === 'single') newPairConfig.singlePanelBots = botIndices;
            else if (restoredLayout === 2 || restoredLayout === 'twoHorizon') newPairConfig.twoPanelBots = botIndices;
            else if (restoredLayout === 3) newPairConfig.threePanelBots = botIndices;
            else if (restoredLayout === 4) newPairConfig.fourPanelBots = botIndices;
            else if (restoredLayout === 'sixGrid') newPairConfig.sixPanelBots = botIndices;
          }

          // Session復元設定を適用（タブローカルのみ）
          setAllInOnePairs({
            [sessionRestoreKey]: newPairConfig
          });
          // アクティブキーを変更せず、defaultを更新
          setAllInOnePairs(prev => ({
            ...prev,
            default: newPairConfig
          }));
          
          // スナップショットメッセージを各ボットに直接復元
          setTimeout(() => {
            if (snapshotMessages && botIndices) {
              const restoreData: { [botIndex: number]: { conversationId: string; messages: any[] } } = {}
              
              for (const botIndex of botIndices) {
                const messages = snapshotMessages[botIndex]
                if (messages && messages.length > 0) {
                  // 新しい会話IDを生成してスナップショットメッセージを復元
                  restoreData[botIndex] = {
                    conversationId: `snapshot-${sessionToRestore.sessionUUID}-${botIndex}`,
                    messages: messages
                  }
                }
              }
              
              console.log('Setting session snapshot restore data:', restoreData)
              setAllInOneRestoreData(restoreData)
              
              // 復元データクリア
              setTimeout(() => {
                setAllInOneRestoreData(null)
              }, 2000)
            }
          }, 300)
          
          setSessionToRestore(null)
        } catch (error) {
          console.error('Failed to restore session snapshot:', error)
          setSessionToRestore(null)
        }
      }
    }
    
    restoreSessionSnapshot()
  }, [sessionToRestore, activeAllInOne, currentPairConfig, setAllInOnePairs, setSessionToRestore, setAllInOneRestoreData])

  // All-in-oneセッション復元の処理（旧版・後方互換性用）
  useEffect(() => {
    const restoreAllInOneSession = async () => {
      if (sessionToRestore && sessionToRestore.type === 'allInOne') {
        try {
          const { botIndices, layout: sessionLayout, pairName, conversations } = sessionToRestore
          
          // All-in-oneセッションの場合は新しいUUIDを生成（後方互換性のため）
          setCurrentSessionUUID(null)
          
          // セッションからlayoutを復元（文字列から適切な型に変換）
          let restoredLayout: Layout;
          if (sessionLayout === 'single' || sessionLayout === 'twoHorizon' || sessionLayout === 'sixGrid') {
            restoredLayout = sessionLayout;
          } else {
            const layoutNum = typeof sessionLayout === 'string' ? parseInt(sessionLayout) : sessionLayout;
            if (layoutNum === 2) restoredLayout = 2;
            else if (layoutNum === 3) restoredLayout = 3;
            else if (layoutNum === 4) restoredLayout = 4;
            else restoredLayout = 2; // デフォルト
          }
          setAllInOnePairs(prev => {
            const newPairConfig: AllInOnePairConfig = {
              ...DEFAULT_PAIR_CONFIG, // まずデフォルトでリセット
              layout: restoredLayout,
              pairName: pairName,
            };

            if (botIndices) {
              if (restoredLayout === 'single') newPairConfig.singlePanelBots = botIndices;
              else if (restoredLayout === 2 || restoredLayout === 'twoHorizon') newPairConfig.twoPanelBots = botIndices;
              else if (restoredLayout === 3) newPairConfig.threePanelBots = botIndices;
              else if (restoredLayout === 4) newPairConfig.fourPanelBots = botIndices;
              else if (restoredLayout === 'sixGrid') newPairConfig.sixPanelBots = botIndices;
            }

            return {
              ...prev,
              [activeAllInOne]: newPairConfig
            };
          });
          
          setTimeout(async () => {
            try {
              if (conversations && botIndices) {
                const restoreData: { [botIndex: number]: { conversationId: string; messages: any[] } } = {}
                
                for (const botIndex of botIndices) {
                  const botConversations = conversations[botIndex]
                  if (botConversations && botConversations.length > 0) {
                    const latestConversation = botConversations[0]
                    restoreData[botIndex] = {
                      conversationId: latestConversation.id,
                      messages: latestConversation.messages
                    }
                  }
                }
                
                console.log('Setting All-in-one restore data:', restoreData)
                setAllInOneRestoreData(restoreData)
                
                setTimeout(() => {
                  setAllInOneRestoreData(null)
                }, 2000)
              }
            } catch (error) {
              console.error('Failed to restore All-in-one conversations:', error)
            }
          }, 300)
          
          setSessionToRestore(null)
        } catch (error) {
          console.error('Failed to restore All-in-one session:', error)
          setSessionToRestore(null)
        }
      }
    }
    
    restoreAllInOneSession()
  }, [sessionToRestore, activeAllInOne, currentPairConfig, setAllInOnePairs, setSessionToRestore, setAllInOneRestoreData])
  
  if (layout === 'sixGrid') {
    return <SixBotChatPanel currentSessionUUID={currentSessionUUID} setCurrentSessionUUID={setCurrentSessionUUID} />
  }
  if (layout === 4) {
    return <FourBotChatPanel currentSessionUUID={currentSessionUUID} setCurrentSessionUUID={setCurrentSessionUUID} />
  }
  if (layout === 3) {
    return <ThreeBotChatPanel currentSessionUUID={currentSessionUUID} setCurrentSessionUUID={setCurrentSessionUUID} />
  }
  if (layout === 'twoHorizon') {
    return <TwoHorizonBotChatPanel currentSessionUUID={currentSessionUUID} setCurrentSessionUUID={setCurrentSessionUUID} />
  }
  if (layout === 'single') {
    return <SingleBotChatPanel currentSessionUUID={currentSessionUUID} setCurrentSessionUUID={setCurrentSessionUUID} />
  }
  return <TwoBotChatPanel currentSessionUUID={currentSessionUUID} setCurrentSessionUUID={setCurrentSessionUUID} />
}

const MultiBotChatPanelPage: FC = () => {
  return (
    <Suspense>
      <MultiBotChatPanel />
    </Suspense>
  )
}

export default MultiBotChatPanelPage
