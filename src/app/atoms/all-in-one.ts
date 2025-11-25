import { atom } from 'jotai'
import { atomWithStorage } from 'jotai/utils'
import { Layout } from '~app/consts'
import Browser from 'webextension-polyfill'

// デフォルトボット設定
export const DEFAULT_BOTS: number[] = [0, 1, 2, 3, 4, 5]

// All-In-Oneペア設定の型定義
export interface AllInOnePairConfig {
  layout: Layout
  // 共通のボット設定（インデックス0から順に使用）
  // 例：[0, 1, 2, 3, 4, 5] の場合
  // - layout 1: bots[0] (1つ目のボット)
  // - layout 2: bots[0], bots[1] (1, 2つ目のボット)
  // - layout 3: bots[0], bots[1], bots[2] (1, 2, 3つ目のボット)
  // - layout 4: bots[0], bots[1], bots[2], bots[3] (1, 2, 3, 4つ目のボット)
  // - layout 6: bots[0]～bots[5] (1～6つ目のボット)
  bots: number[]
  pairName?: string
  // 後方互換性のため保持（廃止予定）
  singlePanelBots?: number[]
  twoPanelBots?: number[]
  threePanelBots?: number[]
  fourPanelBots?: number[]
  sixPanelBots?: number[]
}

// デフォルトのペア設定
export const DEFAULT_PAIR_CONFIG: AllInOnePairConfig = {
  layout: 2,
  bots: DEFAULT_BOTS, // [0, 1, 2, 3, 4, 5]
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