import { atom } from 'jotai'
import { atomWithStorage } from 'jotai/utils'
import { Layout } from '~app/consts'
import Browser from 'webextension-polyfill'

// デフォルトボット設定
export const DEFAULT_BOTS: number[] = [0, 1, 2, 3, 4, 5]

// All-In-Oneペア設定の型定義
export interface AllInOnePairConfig {
  layout: Layout
  singlePanelBots: number[]
  twoPanelBots: number[]
  threePanelBots: number[]
  fourPanelBots: number[]
  sixPanelBots: number[]
  pairName?: string
}

// デフォルトのペア設定
export const DEFAULT_PAIR_CONFIG: AllInOnePairConfig = {
  layout: 2,
  singlePanelBots: DEFAULT_BOTS.slice(0, 1),
  twoPanelBots: DEFAULT_BOTS.slice(0, 2),
  threePanelBots: DEFAULT_BOTS.slice(0, 3),
  fourPanelBots: DEFAULT_BOTS.slice(0, 4),
  sixPanelBots: DEFAULT_BOTS.slice(0, 6),
}

// 初期値を取得する関数（前回のAll-in-One設定を復旧）
const getInitialPairConfig = async (): Promise<AllInOnePairConfig> => {
  try {
    const result = await Browser.storage.local.get('allInOnePairs')
    const saved = result.allInOnePairs
    if (saved && saved.default) {
      return saved.default
    }
  } catch (error) {
    console.error('Failed to load initial pair config:', error)
  }
  return DEFAULT_PAIR_CONFIG
}

// All-In-Oneペア管理Atom（タブローカル、メモリ上のみ）
export const allInOnePairsAtom = atom<Record<string, AllInOnePairConfig>>(
  { default: DEFAULT_PAIR_CONFIG }
)

// アクティブなAll-In-Oneを管理するatom（タブローカル、メモリ上のみ）
export const activeAllInOneAtom = atom<string>('default')

// 初期化用のatom（前回の設定を復旧）
export const initializeAllInOneAtom = atom(null, async (get, set) => {
  const initialConfig = await getInitialPairConfig()
  set(allInOnePairsAtom, { default: initialConfig })
})

// 設定保存用のatom
export const saveAllInOneConfigAtom = atom(null, async (get, set) => {
  const pairs = get(allInOnePairsAtom)
  try {
    await Browser.storage.local.set({ allInOnePairs: pairs })
  } catch (error) {
    console.error('Failed to save all-in-one config:', error)
  }
})