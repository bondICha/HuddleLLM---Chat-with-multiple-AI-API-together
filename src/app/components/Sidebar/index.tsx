import { Link, LinkOptions, useLocation } from '@tanstack/react-router'
import { motion } from 'framer-motion'
import { useAtom, useSetAtom, useAtomValue } from 'jotai'
import { atomWithStorage } from 'jotai/utils'
import { useEffect, useState, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { PencilIcon, ArrowPathIcon, TrashIcon, PlusIcon } from '@heroicons/react/24/outline'
import allInOneIcon from '~/assets/all-in-one.svg'
import collapseIcon from '~/assets/icons/collapse.svg'
import feedbackIcon from '~/assets/icons/feedback.svg'
import githubIcon from '~/assets/icons/github.svg'
import settingIcon from '~/assets/icons/setting.svg'
import themeIcon from '~/assets/icons/theme.svg'
import minimalLogo from '~/assets/icon.png'
import logo from '~/assets/logo.png'
import BotIcon from '../BotIcon'
import { cx } from '~/utils'
import { useEnabledBots } from '~app/hooks/use-enabled-bots'
import { releaseNotesAtom, showDiscountModalAtom, sidebarCollapsedAtom } from '~app/state'
import { checkReleaseNotes } from '~services/release-notes'
import * as api from '~services/server-api'
import { getAppOpenTimes, getPremiumModalOpenTimes } from '~services/storage/open-times'
import GuideModal from '../GuideModal'
import ThemeSettingModal from '../ThemeSettingModal'
import Tooltip from '../Tooltip'
import NavLink from './NavLink'
import PremiumEntry from './PremiumEntry'
import { Layout } from '~app/consts'
import { 
  allInOnePairsAtom, 
  activeAllInOneAtom, 
  DEFAULT_PAIR_CONFIG, 
  AllInOnePairConfig 
} from '~app/atoms/all-in-one'
import { getUserConfig, saveChatPair, getSavedChatPairs, deleteChatPair, updateChatPair, ChatPair } from '~services/user-config'


function IconButton(props: { icon: string; onClick?: () => void }) {
  return (
    <div
      className="p-[6px] rounded-[10px] w-fit cursor-pointer hover:opacity-80 bg-secondary bg-opacity-20"
      onClick={props.onClick}
    >
      <img src={props.icon} className="w-6 h-6" />
    </div>
  )
}

function Sidebar() {
  const { t } = useTranslation()
  const [collapsed, setCollapsed] = useAtom(sidebarCollapsedAtom)
  const [themeSettingModalOpen, setThemeSettingModalOpen] = useState(false)
  const enabledBots = useEnabledBots()
  const setReleaseNotes = useSetAtom(releaseNotesAtom)
  // ボットの情報を保持するための状態（インデックスベース）
  const [botNames, setBotNames] = useState<Record<number, string>>({})
  const [botShortNames, setBotShortNames] = useState<Record<number, string>>({})
  const [botAvatars, setBotAvatars] = useState<Record<number, string>>({})
  const [savedPairs, setSavedPairs] = useState<ChatPair[]>([])
  const [showSaveButton, setShowSaveButton] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [editingPairId, setEditingPairId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const [hasInitialized, setHasInitialized] = useState(false)

  // アクティブなAll-In-Oneを管理
  const [activeAllInOne, setActiveAllInOne] = useAtom(activeAllInOneAtom)
  const [allInOnePairs, setAllInOnePairs] = useAtom(allInOnePairsAtom)
  
  // 現在のペア設定を取得
  const currentPairConfig = allInOnePairs[activeAllInOne] || DEFAULT_PAIR_CONFIG
  
  // 現在の設定値
  const layout = currentPairConfig.layout
  const singlePanelBots = currentPairConfig.singlePanelBots
  const twoPanelBots = currentPairConfig.twoPanelBots
  const threePanelBots = currentPairConfig.threePanelBots
  const fourPanelBots = currentPairConfig.fourPanelBots
  const sixPanelBots = currentPairConfig.sixPanelBots
  
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

// コンポーネントマウント時にアバター情報を含めて設定を取得
useEffect(() => {
  const initializeConfig = async () => {
    const config = await getUserConfig();
    if (config.customApiConfigs) {
      const newBotNames: Record<number, string> = {};
      const newBotShortNames: Record<number, string> = {};
      const newBotAvatars: Record<number, string> = {};

      config.customApiConfigs.forEach((apiConfig, index) => {
        newBotNames[index] = apiConfig.name;
        newBotShortNames[index] = apiConfig.shortName;
        newBotAvatars[index] = apiConfig.avatar;
      });

      setBotNames(newBotNames);
      setBotShortNames(newBotShortNames);
      setBotAvatars(newBotAvatars); // ステートを更新
      console.log('Sidebar useEffect: Updated bot states', { newBotNames, newBotShortNames, newBotAvatars }); // ログ追加
    }
  };

  initializeConfig();

}, []);

  // 保存されたPairを読み込む
  useEffect(() => {
    const loadSavedPairs = async () => {
      try {
        const pairs = await getSavedChatPairs()
        setSavedPairs(pairs)
      } catch (error) {
        console.error('Failed to load saved pairs:', error)
      }
    }
    loadSavedPairs()
  }, [])

  // 現在のボット選択を取得
  const getCurrentBotIndices = (): number[] => {
    switch (layout) {
      case 'single':
        return singlePanelBots
      case 2:
        return twoPanelBots
      case 3:
        return threePanelBots
      case 4:
        return fourPanelBots
      case 'sixGrid':
        return sixPanelBots
      case 'twoHorizon':
        return twoPanelBots
      default:
        return twoPanelBots
    }
  }

  // 新しいAll-In-Oneを作成（現在の設定を保存）
  const handleCreateNewAllInOne = async () => {
    if (isSaving) return
    setIsSaving(true)
    try {
      const botIndices = getCurrentBotIndices()
      const newPair = await saveChatPair(botIndices)
      const pairs = await getSavedChatPairs()
      setSavedPairs(pairs)
      
      // 新しいペアの設定を作成
      setAllInOnePairs(prev => ({
        ...prev,
        [newPair.id]: { ...currentPairConfig }
      }))
      
      // 新しく作成したAll-In-Oneをアクティブにする
      setActiveAllInOne(newPair.id)
    } catch (error) {
      console.error('Failed to create new All-In-One:', error)
    } finally {
      setIsSaving(false)
    }
  }

  // All-In-Oneを削除
  const handleDeleteAllInOne = async (pairId: string) => {
    try {
      await deleteChatPair(pairId)
      setSavedPairs(pairs => pairs.filter(pair => pair.id !== pairId))
      
      // ペア設定からも削除
      setAllInOnePairs(prev => {
        const { [pairId]: removed, ...rest } = prev
        return rest
      })
      
      // 削除したAll-In-OneがアクティブだったらDefaultに戻す
      if (activeAllInOne === pairId) {
        setActiveAllInOne('default')
      }
    } catch (error) {
      console.error('Failed to delete All-In-One:', error)
    }
  }

  // All-In-Oneを切り替え
  const handleSwitchAllInOne = (pairId: string, pair?: ChatPair) => {
    if (pair && pairId !== 'default') {
      // 新しいペアの設定を初期化（まだ存在しない場合）
      if (!allInOnePairs[pairId]) {
        const botCount = pair.botIndices.length
        let newLayout: Layout = 2
        const newConfig: AllInOnePairConfig = { ...DEFAULT_PAIR_CONFIG }
        
        if (botCount === 1) {
          newLayout = 'single'
          newConfig.singlePanelBots = pair.botIndices
        } else if (botCount === 2) {
          newLayout = 2
          newConfig.twoPanelBots = pair.botIndices
        } else if (botCount === 3) {
          newLayout = 3
          newConfig.threePanelBots = pair.botIndices
        } else if (botCount === 4) {
          newLayout = 4
          newConfig.fourPanelBots = pair.botIndices
        } else if (botCount >= 6) {
          newLayout = 'sixGrid'
          newConfig.sixPanelBots = pair.botIndices.slice(0, 6)
        }
        
        newConfig.layout = newLayout
        
        setAllInOnePairs(prev => ({
          ...prev,
          [pairId]: newConfig
        }))
      }
    }
    
    // アクティブなAll-In-Oneを切り替え
    setActiveAllInOne(pairId)
  }

  // 名前変更を開始
  const handleStartEditName = (pairId: string, currentName: string) => {
    setEditingPairId(pairId)
    setEditingName(currentName)
  }

  // 名前変更を保存
  const handleSaveEditName = async (pairId: string) => {
    if (!editingName.trim()) return
    
    try {
      await updateChatPair(pairId, { name: editingName.trim() })
      setSavedPairs(pairs => pairs.map(pair => 
        pair.id === pairId 
          ? { ...pair, name: editingName.trim() }
          : pair
      ))
      setEditingPairId(null)
      setEditingName('')
    } catch (error) {
      console.error('Failed to update pair name:', error)
    }
  }

  // 名前変更をキャンセル
  const handleCancelEditName = () => {
    setEditingPairId(null)
    setEditingName('')
  }

  // アイコンを現在の選択ボットに更新
  const handleUpdateIcon = async (pairId: string) => {
    const pair = savedPairs.find(p => p.id === pairId)
    if (!pair) return
    
    try {
      // 現在のペア設定から最新のボット選択を取得
      const currentConfig = allInOnePairs[pairId]
      if (!currentConfig) return
      
      // 現在のレイアウトに応じたボット選択を取得
      let currentBots: number[] = []
      switch (currentConfig.layout) {
        case 'single':
          currentBots = currentConfig.singlePanelBots
          break
        case 2:
        case 'twoHorizon':
          currentBots = currentConfig.twoPanelBots
          break
        case 3:
          currentBots = currentConfig.threePanelBots
          break
        case 4:
          currentBots = currentConfig.fourPanelBots
          break
        case 'sixGrid':
          currentBots = currentConfig.sixPanelBots
          break
        default:
          currentBots = currentConfig.twoPanelBots
      }
      
      // ボットインデックスを更新
      await updateChatPair(pairId, { botIndices: currentBots })
      setSavedPairs(pairs => pairs.map(p => 
        p.id === pairId 
          ? { ...p, botIndices: currentBots }
          : p
      ))
    } catch (error) {
      console.error('Failed to update pair icon:', error)
    }
  }


  // ルートの変更を監視してAll-in-oneハイライトを制御
  const location = useLocation()
  const previousPathRef = useRef(location.pathname)
  
  // 初回アクセス時の初期化
  useEffect(() => {
    if (!hasInitialized && location.pathname === '/') {
      // 初回All-in-oneページアクセス時のみデフォルトを設定
      if (activeAllInOne === '' || activeAllInOne === 'none') {
        setActiveAllInOne('default')
      }
      setHasInitialized(true)
    }
  }, [location.pathname, activeAllInOne, hasInitialized, setActiveAllInOne])

  useEffect(() => {
    const currentPath = location.pathname
    const previousPath = previousPathRef.current
    
    // パスが変更された場合のみ処理
    if (currentPath !== previousPath) {
      if (currentPath !== '/') {
        // All-in-oneページから離れる場合
        setActiveAllInOne('none')
      }
      // All-in-oneページに戻る場合は自動復帰せず、ユーザーの明示的な選択に委ねる
      // パスを更新
      previousPathRef.current = currentPath
    }
  }, [location.pathname, setActiveAllInOne])

  useEffect(() => {
    Promise.all([getAppOpenTimes(), getPremiumModalOpenTimes(), checkReleaseNotes()]).then(
      async ([appOpenTimes, premiumModalOpenTimes, releaseNotes]) => {
        setReleaseNotes(releaseNotes)
      },
    )
  }, [])

  // ボット名を取得する関数（インデックスベース）
  const getBotDisplayName = (index: number) => {
    return botNames[index] ?? `Custom Bot ${index + 1}`;
  }

  // ボット略称を取得する関数（インデックスベース）
  const getBotShortDisplayName = (index: number) => {
    return botShortNames[index] ?? undefined;
  }
  
  // ボットアバターを取得する関数（インデックスベース）
  const getBotAvatar = (index: number) => {
    return botAvatars[index] ?? 'OpenAI.Black';
  }


  return (
    <motion.aside
      className={cx(
        'flex flex-col bg-primary-background bg-opacity-40 overflow-hidden',
        collapsed ? 'items-center px-[2px]' : 'w-[230px] px-4',
      )}
    >
      <div className={cx('flex mt-8 gap-3 items-center', collapsed ? 'flex-col-reverse' : 'flex-row justify-between')}>
        {collapsed ? <img src={minimalLogo} className="w-[30px]" /> : <img src={logo} className="w-[140px] ml-2" />}
        <motion.img
          src={collapseIcon}
          className={cx('w-10 h-10 cursor-pointer')}
          animate={{ rotate: collapsed ? 180 : 0 }}
          onClick={() => setCollapsed((c) => !c)}
        />
      </div>
      {/* All-In-One Section */}
      <div className="mt-10 flex flex-col flex-shrink-0 max-h-[50%]">
        {/* All-in-one pairs container with scrolling */}
        <div className="flex flex-col gap-2 overflow-y-auto scrollbar-none">
        
        {/* Default All-In-One */}
        <div className="relative group">
          <Link
            to="/"
            onClick={() => handleSwitchAllInOne('default')}
            className={cx(
              'rounded-[10px] w-full pl-3 flex items-center shrink-0',
              activeAllInOne === 'default' 
                ? 'bg-white text-primary-text dark:bg-primary-blue'
                : 'bg-secondary bg-opacity-20 text-primary-text opacity-80 hover:opacity-100',
              collapsed 
                ? 'flex-col justify-center items-center gap-1 px-1 py-[5px]' 
                : 'flex-row gap-3 py-[11px]'
            )}
          >
            <img src={allInOneIcon} className="w-5 h-5" />
            <span className={cx(
              'font-medium text-sm',
              collapsed && 'overflow-hidden text-ellipsis leading-tight text-center break-words w-full'
            )}>
              {collapsed ? 'A-One' : 'All-In-One'}
            </span>
          </Link>
          
          {/* Create new All-In-One button */}
          {!collapsed && activeAllInOne === 'default' && (
            <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-primary-background bg-opacity-90 rounded px-1">
              <Tooltip content={t('create_new_all_in_one')}>
                <button
                  onClick={handleCreateNewAllInOne}
                  disabled={isSaving}
                  className={cx(
                    'p-1 rounded hover:bg-secondary hover:bg-opacity-20 transition-all',
                    isSaving ? 'opacity-50 cursor-not-allowed' : 'hover:scale-110'
                  )}
                >
                  {isSaving ? (
                    <div className="animate-spin w-4 h-4 border border-current border-t-transparent rounded-full" />
                  ) : (
                    <PlusIcon className="w-4 h-4" />
                  )}
                </button>
              </Tooltip>
            </div>
          )}
        </div>

        {/* Saved All-In-Ones */}
        {savedPairs.map((pair) => (
          <div key={pair.id} className="relative group mt-2">
            <Link
              to="/"
              onClick={() => handleSwitchAllInOne(pair.id, pair)}
              className={cx(
                'rounded-[10px] w-full pl-3 flex items-center shrink-0',
                activeAllInOne === pair.id 
                  ? 'bg-white text-primary-text dark:bg-primary-blue'
                  : 'bg-secondary bg-opacity-20 text-primary-text opacity-80 hover:opacity-100',
                collapsed 
                  ? 'flex-col justify-center items-center gap-1 px-1 py-[5px]' 
                  : 'flex-row gap-3 py-[11px]'
              )}
            >
              <div className="flex -space-x-1">
                {pair.botIndices.slice(0, Math.min(4, collapsed ? 2 : 4)).map((botIndex, i) => (
                  <div key={i} className={cx(
                    "rounded-full border border-white overflow-hidden",
                    collapsed ? "w-4 h-4" : "w-4 h-4"
                  )}>
                    <BotIcon iconName={getBotAvatar(botIndex)} size={16} />
                  </div>
                ))}
                {pair.botIndices.length > (collapsed ? 2 : 4) && (
                  <div className={cx(
                    "rounded-full bg-secondary text-xs flex items-center justify-center border border-white",
                    collapsed ? "w-4 h-4" : "w-4 h-4"
                  )}>
                    +{pair.botIndices.length - (collapsed ? 2 : 4)}
                  </div>
                )}
              </div>
              {!collapsed && (
                <div className="flex-1 min-w-0">
                  {editingPairId === pair.id ? (
                    <input
                      type="text"
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleSaveEditName(pair.id)
                        } else if (e.key === 'Escape') {
                          handleCancelEditName()
                        }
                      }}
                      onBlur={() => handleSaveEditName(pair.id)}
                      className="w-full bg-transparent border-b border-gray-300 text-sm font-medium focus:outline-none focus:border-blue-500"
                      autoFocus
                    />
                  ) : (
                    <span className="font-medium text-sm truncate block">
                      {pair.name}
                    </span>
                  )}
                </div>
              )}
            </Link>

            {/* Action buttons */}
            {!collapsed && (
              <div className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-primary-background bg-opacity-90 rounded px-1 flex gap-1">
                <Tooltip content={t('rename')}>
                  <button
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      handleStartEditName(pair.id, pair.name)
                    }}
                    className="p-1 hover:bg-blue-500 hover:bg-opacity-20 rounded"
                  >
                    <PencilIcon className="w-4 h-4" />
                  </button>
                </Tooltip>
                
                <Tooltip content={t('update_icon')}>
                  <button
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      handleUpdateIcon(pair.id)
                    }}
                    className="p-1 hover:bg-green-500 hover:bg-opacity-20 rounded"
                  >
                    <ArrowPathIcon className="w-4 h-4" />
                  </button>
                </Tooltip>
                
                <Tooltip content={t('delete')}>
                  <button
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      handleDeleteAllInOne(pair.id)
                    }}
                    className="p-1 hover:bg-red-500 hover:bg-opacity-20 rounded"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </Tooltip>
              </div>
            )}
          </div>
        ))}
        </div>
      </div>
      
      {/* Separator line */}
      {!collapsed && <div className="border-t border-gray-400 dark:border-gray-500 mx-2 my-2" />}
      
      {/* Scrollable area for enabled bots */}
      <div className="flex flex-col gap-[13px] mt-2 overflow-y-auto scrollbar-none flex-grow"> {/* 個別チャットエリアは残り空間を使用 */}
        {/* enabledBots の内容をログで確認  */}
        {(() => { console.log('Sidebar render: enabledBots', enabledBots); return null; })()}
        {enabledBots.map(({ index, bot }) => {
          return (
            <NavLink
              key={`custom-${index}`}
              to="/chat/custom/$index"
              params={{ index: index.toString() }}
              text={getBotDisplayName(index)}
              shortText={getBotShortDisplayName(index)}
              icon={getBotAvatar(index)}
              iconOnly={collapsed}
            />
          )
        })}
      </div>
      <div className="mt-auto pt-2">
        {!collapsed && <hr className="border-[#ffffff4d]" />}
        <div className={cx('flex mt-5 gap-[10px] mb-4', collapsed ? 'flex-col' : 'flex-row ')}>
          {!collapsed && (
            <Tooltip content={t('GitHub')}>
              <a href="https://github.com/bondICha/chathub-OSS" target="_blank" rel="noreferrer">
                <IconButton icon={githubIcon} />
              </a>
            </Tooltip>
          )}
          {!collapsed && (
            <Tooltip content={t('Feedback')}>
              <a href="https://github.com/bondICha/chathub-OSS/issues" target="_blank" rel="noreferrer">
                <IconButton icon={feedbackIcon} />
              </a>
            </Tooltip>
          )}
          {!collapsed && (
            <Tooltip content={t('Display')}>
              <a onClick={() => setThemeSettingModalOpen(true)}>
                <IconButton icon={themeIcon} />
              </a>
            </Tooltip>
          )}
          <Tooltip content={t('Settings')}>
            <Link to="/setting">
              <IconButton icon={settingIcon} />
            </Link>
          </Tooltip>
        </div>
      </div>
      <GuideModal />
      <ThemeSettingModal open={themeSettingModalOpen} onClose={() => setThemeSettingModalOpen(false)} />
    </motion.aside>
  )
}

export default Sidebar
