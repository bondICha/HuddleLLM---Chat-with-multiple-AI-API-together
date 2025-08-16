import { atomWithStorage } from 'jotai/utils'
import { Layout } from '~app/consts'

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

// All-In-Oneペア管理Atom（二次元構造）
export const allInOnePairsAtom = atomWithStorage<Record<string, AllInOnePairConfig>>(
  'allInOnePairs',
  { default: DEFAULT_PAIR_CONFIG },
  undefined,
  { getOnInit: true }
)

// アクティブなAll-In-Oneを管理するatom
export const activeAllInOneAtom = atomWithStorage<string>('activeAllInOne', 'default')