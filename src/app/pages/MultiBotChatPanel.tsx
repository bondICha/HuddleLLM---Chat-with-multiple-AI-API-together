import { useAtom } from 'jotai'
import { atomWithStorage } from 'jotai/utils'
import { sample, uniqBy } from 'lodash-es'
import { FC, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { cx } from '~/utils'
import { pendingSearchQueryAtom } from '../state'
import Button from '~app/components/Button'
import ChatMessageInput from '~app/components/Chat/ChatMessageInput'
import LayoutSwitch from '~app/components/Chat/LayoutSwitch'
import { Layout } from '~app/consts'
import { useChat } from '~app/hooks/use-chat'
import ConversationPanel from '../components/Chat/ConversationPanel'
import { 
  allInOnePairsAtom, 
  activeAllInOneAtom, 
  DEFAULT_BOTS, 
  DEFAULT_PAIR_CONFIG,
  AllInOnePairConfig 
} from '~app/atoms/all-in-one'


function replaceDeprecatedBots(bots: number[]): number[] {
  // インデックスが有効かどうかを確認（0以上の整数であること）
  return bots.map((index) => (index >= 0 ? index : sample(DEFAULT_BOTS)!))
}

const GeneralChatPanel: FC<{
  chats: ReturnType<typeof useChat>[]
  setBots?: (bots: number[]) => void
  supportImageInput?: boolean
}> = ({ chats, setBots, supportImageInput }) => {
  const { t } = useTranslation()
  const generating = useMemo(() => chats.some((c) => c.generating), [chats])
  
  // 新しい二次元atom構造を使用
  const [activeAllInOne] = useAtom(activeAllInOneAtom)
  const [allInOnePairs, setAllInOnePairs] = useAtom(allInOnePairsAtom)
  
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
    (input: string, index: number) => {
      const chat = chats.find((c) => c.index === index)
      chat?.sendMessage(input)
    },
    [chats],
  )

  const sendAllMessage = useCallback(
    (input: string, images?: File[]) => {
      uniqBy(chats, (c) => c.index).forEach((c) => c.sendMessage(input, images))
    },
    [chats, layout],
  )

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
      
      // レイアウトに応じて適切なボット配列を更新
      switch (layout) {
        case 'single':
          updateCurrentPairConfig({ singlePanelBots: newBots })
          break
        case 2:
        case 'twoHorizon':
          updateCurrentPairConfig({ twoPanelBots: newBots })
          break
        case 3:
          updateCurrentPairConfig({ threePanelBots: newBots })
          break
        case 4:
          updateCurrentPairConfig({ fourPanelBots: newBots })
          break
        case 'sixGrid':
          updateCurrentPairConfig({ sixPanelBots: newBots })
          break
      }
      
      // refreshを更新して再レンダリングを促す
      setRefresh(prev => prev + 1)
    },
    [chats, setBots, setRefresh],
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
            onUserSendMessage={(input) => sendSingleMessage(input, chat.index)}
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

const SingleBotChatPanel: FC = () => {
  const [activeAllInOne] = useAtom(activeAllInOneAtom)
  const [allInOnePairs, setAllInOnePairs] = useAtom(allInOnePairsAtom)
  const currentPairConfig = allInOnePairs[activeAllInOne] || DEFAULT_PAIR_CONFIG
  const bots = currentPairConfig.singlePanelBots
  
  const setBots = (newBots: number[]) => {
    setAllInOnePairs(prev => ({
      ...prev,
      [activeAllInOne]: {
        ...currentPairConfig,
        singlePanelBots: newBots
      }
    }))
  }
  
  const multiPanelBotIndices = useMemo(() => replaceDeprecatedBots(bots), [bots])
  
  const chat = useChat(multiPanelBotIndices[0])
  
  const chats = useMemo(() => [chat], [chat])
  
  return <GeneralChatPanel
    chats={chats}
    setBots={setBots}
    supportImageInput={true}
  />
}

const TwoBotChatPanel: FC = () => {
  const [activeAllInOne] = useAtom(activeAllInOneAtom)
  const [allInOnePairs, setAllInOnePairs] = useAtom(allInOnePairsAtom)
  const currentPairConfig = allInOnePairs[activeAllInOne] || DEFAULT_PAIR_CONFIG
  const bots = currentPairConfig.twoPanelBots
  
  const setBots = (newBots: number[]) => {
    setAllInOnePairs(prev => ({
      ...prev,
      [activeAllInOne]: {
        ...currentPairConfig,
        twoPanelBots: newBots
      }
    }))
  }
  
  const multiPanelBotIndices = useMemo(() => replaceDeprecatedBots(bots), [bots])
  
  const chat1 = useChat(multiPanelBotIndices[0])
  const chat2 = useChat(multiPanelBotIndices[1])
  
  const chats = useMemo(() => [chat1, chat2], [chat1, chat2])
  
  return <GeneralChatPanel
    chats={chats}
    setBots={setBots}
    supportImageInput={true}
  />
}

const TwoHorizonBotChatPanel: FC = () => {
  const [activeAllInOne] = useAtom(activeAllInOneAtom)
  const [allInOnePairs, setAllInOnePairs] = useAtom(allInOnePairsAtom)
  const currentPairConfig = allInOnePairs[activeAllInOne] || DEFAULT_PAIR_CONFIG
  const bots = currentPairConfig.twoPanelBots
  
  const setBots = (newBots: number[]) => {
    setAllInOnePairs(prev => ({
      ...prev,
      [activeAllInOne]: {
        ...currentPairConfig,
        twoPanelBots: newBots
      }
    }))
  }
  
  const multiPanelBotIndices = useMemo(() => replaceDeprecatedBots(bots), [bots])
  
  const chat1 = useChat(multiPanelBotIndices[0])
  const chat2 = useChat(multiPanelBotIndices[1])
  
  const chats = useMemo(() => [chat1, chat2], [chat1, chat2])
  
  return <GeneralChatPanel
    chats={chats}
    setBots={setBots}
    supportImageInput={true}
  />
}

const ThreeBotChatPanel: FC = () => {
  const [activeAllInOne] = useAtom(activeAllInOneAtom)
  const [allInOnePairs, setAllInOnePairs] = useAtom(allInOnePairsAtom)
  const currentPairConfig = allInOnePairs[activeAllInOne] || DEFAULT_PAIR_CONFIG
  const bots = currentPairConfig.threePanelBots
  
  const setBots = (newBots: number[]) => {
    setAllInOnePairs(prev => ({
      ...prev,
      [activeAllInOne]: {
        ...currentPairConfig,
        threePanelBots: newBots
      }
    }))
  }
  
  const multiPanelBotIndices = useMemo(() => replaceDeprecatedBots(bots), [bots])
  
  const chat1 = useChat(multiPanelBotIndices[0])
  const chat2 = useChat(multiPanelBotIndices[1])
  const chat3 = useChat(multiPanelBotIndices[2])
  
  const chats = useMemo(() => [chat1, chat2, chat3], [chat1, chat2, chat3])
  
  return <GeneralChatPanel
    chats={chats}
    setBots={setBots}
    supportImageInput={true}
  />
}

const FourBotChatPanel: FC = () => {
  const [activeAllInOne] = useAtom(activeAllInOneAtom)
  const [allInOnePairs, setAllInOnePairs] = useAtom(allInOnePairsAtom)
  const currentPairConfig = allInOnePairs[activeAllInOne] || DEFAULT_PAIR_CONFIG
  const bots = currentPairConfig.fourPanelBots
  
  const setBots = (newBots: number[]) => {
    setAllInOnePairs(prev => ({
      ...prev,
      [activeAllInOne]: {
        ...currentPairConfig,
        fourPanelBots: newBots
      }
    }))
  }
  
  const multiPanelBotIndices = useMemo(() => replaceDeprecatedBots(bots), [bots])
  
  const chat1 = useChat(multiPanelBotIndices[0])
  const chat2 = useChat(multiPanelBotIndices[1])
  const chat3 = useChat(multiPanelBotIndices[2])
  const chat4 = useChat(multiPanelBotIndices[3])
  
  const chats = useMemo(() => [chat1, chat2, chat3, chat4], [chat1, chat2, chat3, chat4])
  
  return <GeneralChatPanel
    chats={chats}
    setBots={setBots}
    supportImageInput={true}
  />
}

const SixBotChatPanel: FC = () => {
  const [activeAllInOne] = useAtom(activeAllInOneAtom)
  const [allInOnePairs, setAllInOnePairs] = useAtom(allInOnePairsAtom)
  const currentPairConfig = allInOnePairs[activeAllInOne] || DEFAULT_PAIR_CONFIG
  const bots = currentPairConfig.sixPanelBots
  
  const setBots = (newBots: number[]) => {
    setAllInOnePairs(prev => ({
      ...prev,
      [activeAllInOne]: {
        ...currentPairConfig,
        sixPanelBots: newBots
      }
    }))
  }
  
  const multiPanelBotIndices = useMemo(() => replaceDeprecatedBots(bots), [bots])
  
  const chat1 = useChat(multiPanelBotIndices[0])
  const chat2 = useChat(multiPanelBotIndices[1])
  const chat3 = useChat(multiPanelBotIndices[2])
  const chat4 = useChat(multiPanelBotIndices[3])
  const chat5 = useChat(multiPanelBotIndices[4])
  const chat6 = useChat(multiPanelBotIndices[5])
  
  const chats = useMemo(() => [chat1, chat2, chat3, chat4, chat5, chat6], [chat1, chat2, chat3, chat4, chat5, chat6])
  
  return <GeneralChatPanel
    chats={chats}
    setBots={setBots}
    supportImageInput={true}
  />
}


const MultiBotChatPanel: FC = () => {
  const [activeAllInOne] = useAtom(activeAllInOneAtom)
  const [allInOnePairs] = useAtom(allInOnePairsAtom)
  const currentPairConfig = allInOnePairs[activeAllInOne] || DEFAULT_PAIR_CONFIG
  const layout = currentPairConfig.layout
  
  if (layout === 'sixGrid') {
    return <SixBotChatPanel />
  }
  if (layout === 4) {
    return <FourBotChatPanel />
  }
  if (layout === 3) {
    return <ThreeBotChatPanel />
  }
  if (layout === 'twoHorizon') {
    return <TwoHorizonBotChatPanel />
  }
  if (layout === 'single') {
    return <SingleBotChatPanel />
  }
  return <TwoBotChatPanel />
}

const MultiBotChatPanelPage: FC = () => {
  return (
    <Suspense>
      <MultiBotChatPanel />
    </Suspense>
  )
}

export default MultiBotChatPanelPage
