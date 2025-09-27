
import { motion } from 'framer-motion'
import { FC, ReactNode, useCallback, useMemo, useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import clearIcon from '~/assets/icons/clear.svg'
import historyIcon from '~/assets/icons/history.svg'
import shareIcon from '~/assets/icons/share.svg'
import { cx } from '~/utils'
import { ConversationContext, ConversationContextValue } from '~app/context'
import { ChatMessageModel } from '~types'
import { BotInstance } from '../../bots'
import Button from '../Button'
import BotIcon from '../BotIcon'
import HistoryDialog from '../History/Dialog'
import ShareDialog from '../Share/Dialog'
import Tooltip from '../Tooltip'
import ChatMessageInput from './ChatMessageInput'
import ChatMessageList from './ChatMessageList'
import ChatbotName from './ChatbotName'
import WebAccessCheckbox from './WebAccessCheckbox'
import { getUserConfig } from '~services/user-config'

interface Props {
  index: number
  bot: BotInstance
  messages: ChatMessageModel[]
  onUserSendMessage: (input: string, images?: File[], attachments?: { name: string; content: string }[]) => void
  resetConversation: () => void
  generating: boolean
  stopGenerating: () => void
  mode?: 'full' | 'compact'
  onSwitchBot?: (index: number) => void
  onPropaganda?: (text: string) => Promise<void>
}

const ConversationPanel: FC<Props> = (props) => {
  const { t } = useTranslation()
  const mode = props.mode || 'full'
  const marginClass = 'mx-3'
  const [showHistory, setShowHistory] = useState(false)
  const [showShareDialog, setShowShareDialog] = useState(false)
  // ボット名とアバターを保持するための状態を追加
  const [botName, setBotName] = useState<string>('Custom Bot')
  const [botAvatar, setBotAvatar] = useState<string>('OpenAI.Black')
  const [botConfig, setBotConfig] = useState<any>(null)
  const [isInputVisible, setIsInputVisible] = useState(mode !== 'compact')

  // コンポーネントマウント時に設定を取得
  useEffect(() => {
    const initializeBotInfo = async () => {
      const config = await getUserConfig();
      const customApiConfigs = config.customApiConfigs || [];

      // インデックスが有効な範囲内かどうかを確認
      if (props.index >= 0 && props.index < customApiConfigs.length) {
        const currentBotConfig = customApiConfigs[props.index];
        setBotName(currentBotConfig.name);
        setBotConfig(currentBotConfig);
        // アバター情報も設定
        if (currentBotConfig.avatar) {
          setBotAvatar(currentBotConfig.avatar);
        }
      }
    };
  
  initializeBotInfo();
  }, [props.index]); // props.index が変更されたときに再実行

  const context: ConversationContextValue = useMemo(() => {
    return {
      reset: props.resetConversation,
    }
  }, [props.resetConversation])

  const onSubmit = useCallback(
    async (input: string, images?: File[], attachments?: { name: string; content: string }[]) => {
      props.onUserSendMessage(input, images, attachments)
    },
    [props],
  )

  const resetConversation = useCallback(() => {
    if (!props.generating) {
      props.resetConversation()
    }
  }, [props])

  const openHistoryDialog = useCallback(() => {
    setShowHistory(true)
  }, [props.index])

  const openShareDialog = useCallback(() => {
    setShowShareDialog(true)
  }, [props.index])

  let inputActionButton: ReactNode = null
  if (props.generating) {
    inputActionButton = (
      <Button text={t('Stop')} color="flat" size={mode === 'full' ? 'normal' : 'tiny'} onClick={props.stopGenerating} />
    )
  } else if (mode === 'full') {
    inputActionButton = (
      <div className="flex flex-row items-center gap-[10px] shrink-0">
        <Button text={t('Send')} color="primary" type="submit" />
      </div>
    )
  }

  return (
    <ConversationContext.Provider value={context}>
      <div className={cx('flex flex-col overflow-hidden bg-primary-background h-full rounded-2xl')}>
        <div
          className={cx(
            'border-b border-solid border-primary-border flex flex-row items-center py-[10px]',
            marginClass,
          )}
        >
          {/* 左側：フレキシブル領域（アイコン + ボット名 + モデル名 + スペーサー） */}
          <div className="flex flex-row items-center min-w-0 flex-1 gap-2">
            <motion.div
              className="flex-shrink-0"
              whileHover={{ rotate: 180 }}
            >
              <BotIcon
                iconName={botAvatar}
                size={18}
                className="object-contain rounded-sm"
              />
            </motion.div>
            <ChatbotName
              index={props.index}
              name={props.bot.chatBotName ?? botName}
              fullName={props.bot.name}
              model={props.bot.modelName ?? 'Default'}
              onSwitchBot={mode === 'compact' ? (index) => props.onSwitchBot?.(index) : undefined}
              botConfig={botConfig}
            />
          </div>
          
          {/* 右側：固定領域（Web検索 + ボタン群） */}
          <div className="flex flex-row items-center gap-3 flex-shrink-0">
            <WebAccessCheckbox index={props.index} />
            <Tooltip content={t('Share conversation')}>
              <motion.img
                src={shareIcon}
                className="w-5 h-5 cursor-pointer"
                onClick={openShareDialog}
                whileHover={{ scale: 1.1 }}
              />
            </Tooltip>
            <Tooltip content={t('Clear conversation')}>
              <motion.img
                src={clearIcon}
                className={cx('w-5 h-5', props.generating ? 'cursor-not-allowed' : 'cursor-pointer')}
                onClick={resetConversation}
                whileHover={{ scale: 1.1 }}
              />
            </Tooltip>
            <Tooltip content={t('View history')}>
              <motion.img
                src={historyIcon}
                className="w-5 h-5 cursor-pointer"
                onClick={openHistoryDialog}
                whileHover={{ scale: 1.1 }}
              />
            </Tooltip>
          </div>
        </div>
        <ChatMessageList
          index={props.index}
          messages={props.messages}
          className={cx(marginClass)}
          onPropaganda={props.onPropaganda}
        />
        <div
          className={cx(
            'flex flex-col transition-all duration-300 ease-in-out',
            marginClass,
            mode === 'full' && 'mt-3 mb-3',
            mode === 'compact' && (isInputVisible ? 'mt-3 mb-[5px]' : 'mb-[5px]'),
          )}
        >
          <div
            className={cx(
              'flex flex-row items-center gap-[5px]',
              mode === 'full' ? 'mb-3' : 'mb-0',
              mode === 'compact' && !isInputVisible && 'hidden',
            )}
          >
            {mode === 'compact' && (
              <span className="font-medium text-xs text-light-text cursor-default">Send to {botName}</span>
            )}
            <hr className="grow border-primary-border" />
          </div>
          <ChatMessageInput
            mode={mode}
            disabled={props.generating}
            placeholder={
              mode === 'compact' && !isInputVisible ? `Send a message to ${botName}...` : mode === 'compact' ? '' : undefined
            }
            onSubmit={onSubmit}
            autoFocus={mode === 'full'}
            supportImageInput={true || props.bot.supportsImageInput}  // 現在画像サポート有無を設定画面で確認していないため、暫定的に常にtrue
            actionButton={inputActionButton}
            onVisibilityChange={mode === 'compact' ? setIsInputVisible : undefined}
            className={cx(
              mode === 'compact' && !isInputVisible && 'bg-transparent border-b border-primary-border rounded-none',
            )}
          />
        </div>
      </div>
      {showShareDialog && (
        <ShareDialog open={true} onClose={() => setShowShareDialog(false)} messages={props.messages} />
      )}
      {showHistory && <HistoryDialog index={props.index} open={true} onClose={() => setShowHistory(false)} />}
    </ConversationContext.Provider>
  )
}

export default ConversationPanel
