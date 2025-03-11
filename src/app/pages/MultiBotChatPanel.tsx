import { useAtom, useAtomValue, useSetAtom } from 'jotai'
import { atomWithStorage } from 'jotai/utils'
import { sample, uniqBy } from 'lodash-es'
import { FC, Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { cx } from '~/utils'
import Button from '~app/components/Button'
import ChatMessageInput from '~app/components/Chat/ChatMessageInput'
import LayoutSwitch from '~app/components/Chat/LayoutSwitch'
import { CHATBOTS, Layout } from '~app/consts'
import { useChat } from '~app/hooks/use-chat'
import { BotId } from '../bots'
import ConversationPanel from '../components/Chat/ConversationPanel'
import { ChatMessageModel } from '~types'
import { inheritHistoryAtom } from '../components/SwitchBotDropdown'

const DEFAULT_BOTS: BotId[] = Object.keys(CHATBOTS).slice(0, 6) as BotId[]



const layoutAtom = atomWithStorage<Layout>('multiPanelLayout', 2, undefined, { getOnInit: true })

const singlePanelBotAtom = atomWithStorage<BotId[]>('singlePanelBot', DEFAULT_BOTS.slice(0, 1))
const twoPanelBotsAtom = atomWithStorage<BotId[]>('multiPanelBots:2', DEFAULT_BOTS.slice(0, 2))
const threePanelBotsAtom = atomWithStorage<BotId[]>('multiPanelBots:3', DEFAULT_BOTS.slice(0, 3))
const fourPanelBotsAtom = atomWithStorage<BotId[]>('multiPanelBots:4', DEFAULT_BOTS.slice(0, 4))
const sixPanelBotsAtom = atomWithStorage<BotId[]>('multiPanelBots:6', DEFAULT_BOTS.slice(0, 6))

// 共有のpreviousMessagesステートをatomで管理
const previousMessagesAtom = atomWithStorage<Record<string, ChatMessageModel[]>>('previousMessages', {}, undefined, { getOnInit: true })

function replaceDeprecatedBots(bots: BotId[]): BotId[] {
  return bots.map((bot) => (CHATBOTS[bot] ? bot : sample(DEFAULT_BOTS)!))
}

const GeneralChatPanel: FC<{
  chats: ReturnType<typeof useChat>[]
  setBots?: ReturnType<typeof useSetAtom<typeof twoPanelBotsAtom>>
  supportImageInput?: boolean
  previousMessages: Record<string, ChatMessageModel[]>
  setPreviousMessages: (value: Record<string, ChatMessageModel[]>) => void
}> = ({ chats, setBots, supportImageInput, previousMessages, setPreviousMessages }) => {
  const { t } = useTranslation()
  const generating = useMemo(() => chats.some((c) => c.generating), [chats])
  const [layout, setLayout] = useAtom(layoutAtom)
  const [inheritHistory] = useAtom(inheritHistoryAtom)
  const [refresh, setRefresh] = useState(0) // 更新用の state を追加

  useEffect(() => {
  }, [chats.length, supportImageInput])

  const sendSingleMessage = useCallback(
    (input: string, botId: BotId) => {
      const chat = chats.find((c) => c.botId === botId)
      chat?.sendMessage(input)
    },
    [chats],
  )

  const sendAllMessage = useCallback(
    (input: string, image?: File) => {
      uniqBy(chats, (c) => c.botId).forEach((c) => c.sendMessage(input, image))
    },
    [chats, layout],
  )

  const modifyAllLastMessage = async(text: string) => {
    uniqBy(chats, (c) => c.botId).forEach((c) => c.modifyLastMessage(text))
  }

  const onSwitchBot = useCallback(
    (botId: BotId, index: number, messages?: ChatMessageModel[]) => {
      if (!setBots) {
        return
      }
      
      console.log('onSwitchBot called:', { botId, index, messages });
      
      // 現在のチャットを取得
      const currentChat = chats[index]
      const currentMessages = messages || []
      
      // 前のモデルの会話状態をリセット
      if (currentChat) {
        currentChat.resetConversation()
      }
      
      // 履歴を引き継ぐ場合は、現在のメッセージを保存
      if (inheritHistory && currentMessages.length > 0) {
        console.log('Saving messages for index', index, currentMessages);
        
        // コンテキスト長の制限を考慮（必要に応じて調整）
        const maxMessagesToKeep = 20
        const messagesToKeep = currentMessages.length > maxMessagesToKeep 
          ? currentMessages.slice(-maxMessagesToKeep) 
          : currentMessages
          
        setPreviousMessages({
          ...previousMessages,
          [`${index}`]: messagesToKeep
        })
      }
      
      setBots((bots) => {
        const newBots = [...bots]
        newBots[index] = botId
        return newBots
      })
      
      // refreshを更新して再レンダリングを促す
      setRefresh(prev => prev + 1)
    },
    [chats, setBots, inheritHistory, setRefresh, previousMessages, setPreviousMessages],
  )

  const onLayoutChange = useCallback(
    (v: Layout) => {
      setLayout(v)
    },
    [setLayout],
  )

  return (
    <div className="flex flex-col overflow-hidden h-full">
      <div
        className={cx(
        layout === 'twoHorizon' 
          ? 'flex flex-col'
          : 'grid auto-rows-fr',
          'overflow-hidden grow',
          chats.length === 1 
            ? 'grid-cols-1' // 1つのモデルだけを表示する場合
            : chats.length % 3 === 0 ? 'grid-cols-3' : 'grid-cols-2',
          // chats.length > 3 ? 'gap-1 mb-1' : 'gap-2 mb-2',
          'gap-1 mb-1',
        )}
      >
        {chats.map((chat, index) => (
          <ConversationPanel
            key={`${chat.botId}-${index}-${refresh}`} // refresh を key に含めることで再レンダリング
            botId={chat.botId}
            bot={chat.bot}
            messages={chat.messages}
            onUserSendMessage={(input) => sendSingleMessage(input, chat.botId)}
            generating={chat.generating}
            stopGenerating={chat.stopGenerating}
            mode="compact"
            resetConversation={chat.resetConversation}
            onSwitchBot={setBots ? (botId, messages) => {
              console.log('MultiBotChatPanel onSwitchBot wrapper called with:', { botId, index, messages });
              return onSwitchBot(botId, index, messages);
            } : undefined}
            onPropaganda={modifyAllLastMessage}
          />
        ))}
      </div>
      <div className="flex flex-row gap-3">
        <LayoutSwitch layout={layout} onChange={onLayoutChange} />
        <ChatMessageInput
          mode="full"
          className="rounded-2xl bg-primary-background px-4 py-2 grow"
          disabled={generating}
          onSubmit={sendAllMessage}
          actionButton={!generating && <Button text={t('Send')} color="primary" type="submit" />}
          autoFocus={true}
          supportImageInput={supportImageInput}
        />
      </div>
    </div>
  )
}

interface PanelProps {
  previousMessages: Record<string, ChatMessageModel[]>;
  setPreviousMessages: (value: Record<string, ChatMessageModel[]>) => void;
}

const SingleBotChatPanel: FC<PanelProps> = ({ previousMessages, setPreviousMessages }) => {
  const [bots, setBots] = useAtom(singlePanelBotAtom)
  const [inheritHistory] = useAtom(inheritHistoryAtom)
  const multiPanelBotIds = useMemo(() => replaceDeprecatedBots(bots), [bots])

  const chat = useChat(multiPanelBotIds[0], inheritHistory ? previousMessages["0"] : undefined)
  
  const chats = useMemo(() => [chat], [chat])
  
  return <GeneralChatPanel 
    chats={chats} 
    setBots={setBots}
    supportImageInput={true}
    previousMessages={previousMessages}
    setPreviousMessages={setPreviousMessages}
  />
}

const TwoBotChatPanel: FC<PanelProps> = ({ previousMessages, setPreviousMessages }) => {
  const [bots, setBots] = useAtom(twoPanelBotsAtom)
  const [inheritHistory] = useAtom(inheritHistoryAtom)
  const multiPanelBotIds = useMemo(() => replaceDeprecatedBots(bots), [bots])
  
  
  const chat1 = useChat(multiPanelBotIds[0], inheritHistory ? previousMessages["0"] : undefined)
  const chat2 = useChat(multiPanelBotIds[1], inheritHistory ? previousMessages["1"] : undefined)
  
  const chats = useMemo(() => [chat1, chat2], [chat1, chat2])
  
  return <GeneralChatPanel 
    chats={chats} 
    setBots={setBots} 
    supportImageInput={true}
    previousMessages={previousMessages}
    setPreviousMessages={setPreviousMessages}
  />
}


const TwoHorizonBotChatPanel: FC<PanelProps> = ({ previousMessages, setPreviousMessages }) => {
  const [bots, setBots] = useAtom(twoPanelBotsAtom)
  const [inheritHistory] = useAtom(inheritHistoryAtom)
  const multiPanelBotIds = useMemo(() => replaceDeprecatedBots(bots), [bots])
  
  const chat1 = useChat(multiPanelBotIds[0], inheritHistory ? previousMessages["0"] : undefined)
  const chat2 = useChat(multiPanelBotIds[1], inheritHistory ? previousMessages["1"] : undefined)
  
  const chats = useMemo(() => [chat1, chat2], [chat1, chat2])
  
  return <GeneralChatPanel 
    chats={chats} 
    setBots={setBots} 
    supportImageInput={true}
    previousMessages={previousMessages}
    setPreviousMessages={setPreviousMessages}
  />
}

const ThreeBotChatPanel: FC<PanelProps> = ({ previousMessages, setPreviousMessages }) => {
  const [bots, setBots] = useAtom(threePanelBotsAtom)
  const [inheritHistory] = useAtom(inheritHistoryAtom)
  const multiPanelBotIds = useMemo(() => replaceDeprecatedBots(bots), [bots])
  
  const chat1 = useChat(multiPanelBotIds[0], inheritHistory ? previousMessages["0"] : undefined)
  const chat2 = useChat(multiPanelBotIds[1], inheritHistory ? previousMessages["1"] : undefined)
  const chat3 = useChat(multiPanelBotIds[2], inheritHistory ? previousMessages["2"] : undefined)
  
  const chats = useMemo(() => [chat1, chat2, chat3], [chat1, chat2, chat3])
  
  return <GeneralChatPanel 
    chats={chats} 
    setBots={setBots} 
    supportImageInput={true}
    previousMessages={previousMessages}
    setPreviousMessages={setPreviousMessages}
  />
}

const FourBotChatPanel: FC<PanelProps> = ({ previousMessages, setPreviousMessages }) => {
  const [bots, setBots] = useAtom(fourPanelBotsAtom)
  const [inheritHistory] = useAtom(inheritHistoryAtom)
  const multiPanelBotIds = useMemo(() => replaceDeprecatedBots(bots), [bots])
  
  const chat1 = useChat(multiPanelBotIds[0], inheritHistory ? previousMessages["0"] : undefined)
  const chat2 = useChat(multiPanelBotIds[1], inheritHistory ? previousMessages["1"] : undefined)
  const chat3 = useChat(multiPanelBotIds[2], inheritHistory ? previousMessages["2"] : undefined)
  const chat4 = useChat(multiPanelBotIds[3], inheritHistory ? previousMessages["3"] : undefined)
  
  const chats = useMemo(() => [chat1, chat2, chat3, chat4], [chat1, chat2, chat3, chat4])
  
  return <GeneralChatPanel 
    chats={chats} 
    setBots={setBots} 
    supportImageInput={true}
    previousMessages={previousMessages}
    setPreviousMessages={setPreviousMessages}
  />
}

const SixBotChatPanel: FC<PanelProps> = ({ previousMessages, setPreviousMessages }) => {
  const [bots, setBots] = useAtom(sixPanelBotsAtom)
  const [inheritHistory] = useAtom(inheritHistoryAtom)
  const multiPanelBotIds = useMemo(() => replaceDeprecatedBots(bots), [bots])
  
  const chat1 = useChat(multiPanelBotIds[0], inheritHistory ? previousMessages["0"] : undefined)
  const chat2 = useChat(multiPanelBotIds[1], inheritHistory ? previousMessages["1"] : undefined)
  const chat3 = useChat(multiPanelBotIds[2], inheritHistory ? previousMessages["2"] : undefined)
  const chat4 = useChat(multiPanelBotIds[3], inheritHistory ? previousMessages["3"] : undefined)
  const chat5 = useChat(multiPanelBotIds[4], inheritHistory ? previousMessages["4"] : undefined)
  const chat6 = useChat(multiPanelBotIds[5], inheritHistory ? previousMessages["5"] : undefined)
  
  const chats = useMemo(() => [chat1, chat2, chat3, chat4, chat5, chat6], [chat1, chat2, chat3, chat4, chat5, chat6])
  
  return <GeneralChatPanel 
    chats={chats} 
    setBots={setBots} 
    supportImageInput={true}
    previousMessages={previousMessages}
    setPreviousMessages={setPreviousMessages}
  />
}

const ImageInputPanel: FC<PanelProps> = ({ previousMessages, setPreviousMessages }) => {
  const [inheritHistory] = useAtom(inheritHistoryAtom)
  
  const chat1 = useChat('chatgpt', inheritHistory ? previousMessages["0"] : undefined)
  const chat2 = useChat('bing', inheritHistory ? previousMessages["1"] : undefined)
  const chat3 = useChat('bard', inheritHistory ? previousMessages["2"] : undefined)
  
  const chats = useMemo(() => [chat1, chat2, chat3], [chat1, chat2, chat3])
  
  return <GeneralChatPanel 
    chats={chats} 
    supportImageInput={true}
    previousMessages={previousMessages}
    setPreviousMessages={setPreviousMessages}
  />
}

const MultiBotChatPanel: FC = () => {
  const layout = useAtomValue(layoutAtom)
  const [previousMessages, setPreviousMessages] = useAtom(previousMessagesAtom)
  
  if (layout === 'sixGrid') {
    return <SixBotChatPanel previousMessages={previousMessages} setPreviousMessages={setPreviousMessages} />
  }
  if (layout === 4) {
    return <FourBotChatPanel previousMessages={previousMessages} setPreviousMessages={setPreviousMessages} />
  }
  if (layout === 3) {
    return <ThreeBotChatPanel previousMessages={previousMessages} setPreviousMessages={setPreviousMessages} />
  }
  if (layout === 'imageInput') {
    return <ImageInputPanel previousMessages={previousMessages} setPreviousMessages={setPreviousMessages} />
  }
  if (layout === 'twoHorizon') {
    return <TwoHorizonBotChatPanel previousMessages={previousMessages} setPreviousMessages={setPreviousMessages} />
  }
  if (layout === 'single') {
    return <SingleBotChatPanel previousMessages={previousMessages} setPreviousMessages={setPreviousMessages} />
  }
  return <TwoBotChatPanel previousMessages={previousMessages} setPreviousMessages={setPreviousMessages} />
}

const MultiBotChatPanelPage: FC = () => {
  return (
    <Suspense>
      <MultiBotChatPanel />
    </Suspense>
  )
}

export default MultiBotChatPanelPage
