import { defaults } from 'lodash-es'
import toast from 'react-hot-toast';
import Browser from 'webextension-polyfill'
import {
  ALL_IN_ONE_PAGE_ID, CHATGPT_API_MODELS,
  CHATBOTS_UPDATED_EVENT, DEFAULT_SYSTEM_MESSAGE
} from '~app/consts'
export { MODEL_LIST } from '../../config/model-list'

// カスタムモデルの最大数
const MAX_CUSTOM_MODELS = 50;

// カスタムAPIの設定キーのプレフィックス
const CUSTOM_API_CONFIG_PREFIX = 'customApiConfig_';

/**
 * API Providerの設定インターフェース
 * 複数のProvider設定を管理する型定義
 */
export interface ProviderConfig {
  /** 安定したID（UUID形式など） */
  id: string;
  /** 表示名 */
  name: string;
  /** プロバイダ種別 */
  provider: CustomApiProvider;
  /** APIホスト */
  host: string;
  /** ホストが完全なパスかどうか */
  isHostFullPath: boolean;
  /** APIキー（空文字の場合は共通利用） */
  apiKey: string;
  /** アイコン識別子 */
  icon: string;
  /** Anthropic認証ヘッダタイプ */
  isAnthropicUsingAuthorizationHeader?: boolean;
  /** 高度な設定 */
  advancedConfig?: AdvancedConfig;
  // UI関連の項目は必要に応じて追加
}

// System prompt mode enum
export enum SystemPromptMode {
  COMMON = 'common',     // Common promptをそのまま使う
  APPEND = 'append',     // Common prompt + 個別prompt
  OVERRIDE = 'override'  // 個別promptで上書き
}

// Font type enum
export enum FontType {
  SANS = 'sans',       // Sans-serif (ゴシック体)
  SERIF = 'serif',     // Serif (明朝体)
}


// モデル情報の型定義
export interface ModelInfo {
    value: string;
    icon?: string; // 個別のアイコン（オプション）
}

// プロバイダー情報（デフォルトアイコン含む）
export const PROVIDER_INFO: Record<string, { icon: string }> = {
    "OpenAI": { icon: "openai" },
    "Anthropic": { icon: "anthropic" },
    "Google": { icon: "gemini" },
    "Grok": { icon: "grok" },
    "Deepseek": { icon: "deepseek" },
    "Perplexity": { icon: "perplexity" },
    "Rakuten": { icon: "rakuten" },
    "Custom": { icon: "openai" },
};



export enum CustomApiProvider {
  OpenAI = 'openai',
  Anthropic = 'anthropic', // Default, uses x-api-key
  Bedrock = 'bedrock',
  Anthropic_CustomAuth = 'anthropic-customauth', // Uses Authorization header
  Google = 'google', // For Gemini API
  GeminiOpenAI = 'openai-gemini', // For Gemini OpenAI Compatible API
  QwenOpenAI = 'openai-qwen', // For Qwen OpenAI Compatible API
  VertexAI_Claude = 'vertexai-claude', // For Google VertexAI Claude API
  OpenAI_Image = 'openai-image', // For OpenAI Image Generation (gpt-image-1)
  OpenAI_Responses = 'openai-responses', // For OpenAI Responses API
  Image_Agent = 'image-agent' // Hybrid: Chatbot + Image Generator (tools)
}

export interface AdvancedConfig {
  openrouterProviderOnly?: string; // Comma-separated list of providers for OpenRouter
  anthropicBetaHeaders?: string; // Semicolon-separated "key:value" pairs for Anthropic beta headers
}

/**
 * カスタムAPIの設定インターフェース
 * カスタムAPIの設定情報を保持する型定義
 */
export interface CustomApiConfig {
  id?: number // 未使用、後方互換性のため維持。
  name: string,
  shortName: string,
  host: string,
  model: string,
  temperature: number,
  systemMessage: string,
  systemPromptMode: SystemPromptMode, // System promptの使用方法
  avatar: string,
  apiKey: string,
  thinkingMode?: boolean, // thinking mode (or Reasoning)
  thinkingBudget?: number, // Anthropic thinking budget
  reasoningEffort?: 'minimal' | 'low' | 'medium' | 'high', // OpenAI reasoning effort
  provider: CustomApiProvider,
  webAccess?: boolean,
  isAnthropicUsingAuthorizationHeader?: boolean, // Anthropicの認証ヘッダータイプを指定するフラグ
  enabled?: boolean, // 各チャットボットの有効/無効状態
  isHostFullPath?: boolean; // hostが完全なパスかどうかを示すフラグ (デフォルト: false)
  advancedConfig?: AdvancedConfig;
  /** Provider参照ID */
  providerRefId?: string;

  // Generic Image Tool binding (Chatbot x Image Generator)
  imageToolBinding?: {
    enabled: boolean;
    generatorId?: string; // references ImageGenerator.id
  };

  /** Image Agent: reference an existing chatbot config by stable id */
  imageAgentChatbotRefId?: number;
  /** Image Agent: provider-specific overrides merged with generator defaults */
  imageToolOverrides?: Record<string, any>;
}

export interface ImageGenerator {
  id: string;
  name: string;
  type: 'chutes' | 'seedream';
  host: string;
  apiKey: string;
  model: string;
  // Provider-specific defaults
  defaults?: Record<string, any>;
}

// Image API global settings
export interface ImageApiSettings {
  enabled: boolean;
}


/**
 * チャットペアの設定インターフェース
 * 保存されたチャットペアの情報を保持する型定義
 */
export interface ChatPair {
  id: string, // ユニークID
  name: string, // ペア名（デフォルトは各チャット名を|で区切ったもの）
  botIndices: number[], // 選択されたボットのインデックス配列
  createdAt: number, // 作成日時のタイムスタンプ
  updatedAt: number, // 更新日時のタイムスタンプ
}

/**
 * デフォルトのカスタムAPI設定
 */
const defaultCustomApiConfigs: CustomApiConfig[] = [

]



/**
 * デフォルトのユーザー設定
 */
const userConfigWithDefaultValue = {
  startupPage: ALL_IN_ONE_PAGE_ID,
  chatgptWebAccess: false,
  claudeWebAccess: false,
  customApiConfigs: defaultCustomApiConfigs,
  providerConfigs: [] as ProviderConfig[], // API Provider設定
  customApiKey: '',
  customApiHost: '',
  commonSystemMessage: DEFAULT_SYSTEM_MESSAGE,
  isCustomApiHostFullPath: false, // デフォルト値を設定
  savedChatPairs: [] as ChatPair[], // 保存されたチャットペア
  fontType: FontType.SERIF, // フォントタイプ（デフォルト: Sans-serif）
  imageGenerators: [] as ImageGenerator[],
  imageApi: {
    enabled: true,
  } as ImageApiSettings,
}

export type UserConfig = typeof userConfigWithDefaultValue



/**
 * ユーザー設定を取得する
 * @returns ユーザー設定
 */
// Helper function to migrate customApiConfigs from sync to local
async function _migrateCustomApiConfigsFromSyncToLocal(): Promise<CustomApiConfig[] | undefined> {
  const allSyncDataForMigration = await Browser.storage.sync.get(null);
  const oldIndividualConfigKeys = Object.keys(allSyncDataForMigration)
    .filter(key => key.startsWith(CUSTOM_API_CONFIG_PREFIX));

  if (oldIndividualConfigKeys.length > 0) {
    console.log('Migrating customApiConfigs from sync (individual keys) to local (single key)...');
    let migratedConfigs: CustomApiConfig[] = [];
    for (const key of oldIndividualConfigKeys) {
      if (allSyncDataForMigration[key] && typeof allSyncDataForMigration[key] === 'object') {
        migratedConfigs.push(allSyncDataForMigration[key] as CustomApiConfig);
      }
    }
    // Sort by index extracted from the key
    migratedConfigs.sort((a, b) => {
      const getIndexFromKey = (config: CustomApiConfig, keyPrefix: string, allData: Record<string, any>): number => {
        for (const k in allData) {
          if (allData[k] === config && k.startsWith(keyPrefix)) {
            const indexStr = k.substring(keyPrefix.length);
            const index = parseInt(indexStr, 10);
            if (!isNaN(index)) return index;
          }
        }
        return Infinity;
      };
      const indexA = getIndexFromKey(a, CUSTOM_API_CONFIG_PREFIX, allSyncDataForMigration);
      const indexB = getIndexFromKey(b, CUSTOM_API_CONFIG_PREFIX, allSyncDataForMigration);
      return indexA - indexB;
    });

    await Browser.storage.local.set({ customApiConfigs: migratedConfigs });
    await Browser.storage.sync.remove(oldIndividualConfigKeys);
    console.log('Migration complete.');
    return migratedConfigs;
  }
  return undefined;
}

export async function getUserConfig(): Promise<UserConfig> {
  try {
    // 1. customApiConfigs を local から取得
    const localData = await Browser.storage.local.get('customApiConfigs');
    let customConfigsInLocal: CustomApiConfig[] | undefined = localData.customApiConfigs;

    // 2. その他の設定を sync から取得 (customApiConfigs を除く)
    const syncKeysToGet = Object.keys(userConfigWithDefaultValue).filter(k => k !== 'customApiConfigs');
    const syncData = await Browser.storage.sync.get(syncKeysToGet);

    let finalConfig = defaults({}, syncData, userConfigWithDefaultValue);

    // 3. マイグレーション処理 (必要な場合)
    if (customConfigsInLocal === undefined || (Array.isArray(customConfigsInLocal) && customConfigsInLocal.length === 0)) {
      const migrated = await _migrateCustomApiConfigsFromSyncToLocal();
      if (migrated) {
        customConfigsInLocal = migrated;
      }
    }

    finalConfig.customApiConfigs = customConfigsInLocal || [...defaultCustomApiConfigs];
    finalConfig.providerConfigs = syncData.providerConfigs || [];
    
    if (finalConfig.customApiConfigs) {
      finalConfig.customApiConfigs.forEach((config: CustomApiConfig) => {
        if (config.provider === undefined) {
          config.provider = CustomApiProvider.OpenAI;
        }
        if (config.isHostFullPath === undefined) {
          config.isHostFullPath = false; // マイグレーション: 既存設定にデフォルト値を設定
        }
        if (config.systemPromptMode === undefined) {
          config.systemPromptMode = SystemPromptMode.OVERRIDE; // マイグレーション: 既存設定にデフォルト値を設定
        }
      });
    }
    
    if (syncData.enabledBots && Array.isArray(syncData.enabledBots) && finalConfig.customApiConfigs) {
        finalConfig.customApiConfigs.forEach((config: CustomApiConfig, index: number) => {
        if (config.enabled === undefined) {
          config.enabled = syncData.enabledBots.includes(index);
        }
      });
      await Browser.storage.sync.remove('enabledBots');
    }

    // Migration for providerConfigs
    if ((!finalConfig.providerConfigs || finalConfig.providerConfigs.length === 0) && finalConfig.customApiKey) {
      const defaultProvider: ProviderConfig = {
        id: 'default-provider',
        name: 'Default Provider',
        provider: CustomApiProvider.OpenAI,
        host: finalConfig.customApiHost || 'https://api.openai.com',
        isHostFullPath: finalConfig.isCustomApiHostFullPath || false,
        apiKey: finalConfig.customApiKey,
        icon: 'openai',
      };
      finalConfig.providerConfigs = [defaultProvider];
      finalConfig.customApiConfigs.forEach(config => {
        if (!config.host && !config.apiKey) {
          config.providerRefId = defaultProvider.id;
        }
      });
      // Clean up old common settings
      finalConfig.customApiKey = '';
      finalConfig.customApiHost = '';
      finalConfig.isCustomApiHostFullPath = false;
      
      await updateUserConfig({
        providerConfigs: finalConfig.providerConfigs,
        customApiConfigs: finalConfig.customApiConfigs,
        customApiKey: finalConfig.customApiKey,
        customApiHost: finalConfig.customApiHost,
        isCustomApiHostFullPath: finalConfig.isCustomApiHostFullPath,
      });
    }
    
    if (finalConfig.hasOwnProperty('useCustomChatbotOnly')) {
        delete (finalConfig as any).useCustomChatbotOnly;
        await Browser.storage.sync.remove('useCustomChatbotOnly');
    }

    return finalConfig;
  } catch (error) {
    console.error('Failed to get user config:', error);
    toast.error('設定の読み込みに失敗しました。デフォルト設定を使用します。');
    return { ...userConfigWithDefaultValue };
  }
}

/**
 * ユーザー設定を更新する
 * @param updates 更新する設定
 */
export async function updateUserConfig(updates: Partial<UserConfig>) {
  try {
    const { customApiConfigs, providerConfigs, ...otherUpdates } = updates;

    // 1. customApiConfigs を local に保存 (存在する場合)
    if (customApiConfigs !== undefined) { // null や空配列も保存対象とするため、undefined のみチェック
      if (Array.isArray(customApiConfigs)) {
        const limitedConfigs = customApiConfigs.slice(0, MAX_CUSTOM_MODELS);
        await Browser.storage.local.set({ customApiConfigs: limitedConfigs });
      } else {
        // customApiConfigs が配列でない不正なケース (例: null)
        await Browser.storage.local.set({ customApiConfigs: [] }); // 空配列として保存
      }
    }

    // 2. providerConfigs を sync に保存 (存在する場合)
    if (providerConfigs !== undefined) {
      if (Array.isArray(providerConfigs)) {
        await Browser.storage.sync.set({ providerConfigs });
      } else {
        await Browser.storage.sync.set({ providerConfigs: [] });
      }
    }

    // 3. その他の設定を sync に保存 (存在する場合)
    if (Object.keys(otherUpdates).length > 0) {
      const updatesForSync: Record<string, any> = {};
      const keysToRemoveFromSync: string[] = [];

      for (const [key, value] of Object.entries(otherUpdates)) {
        if (value === undefined) {
          keysToRemoveFromSync.push(key);
        } else {
          updatesForSync[key] = value;
        }
      }
      if (Object.keys(updatesForSync).length > 0) {
        await Browser.storage.sync.set(updatesForSync);
      }
      if (keysToRemoveFromSync.length > 0) {
        await Browser.storage.sync.remove(keysToRemoveFromSync);
      }
    }
    

    const event = new CustomEvent(CHATBOTS_UPDATED_EVENT);
    window.dispatchEvent(event);
  } catch (error) {
    console.error('Failed to update user config:', error);
    let errorMessage = '設定の保存に失敗しました';
    if (error instanceof Error) {
      errorMessage += `: ${error.message}`;
    }
    toast.error(errorMessage);
  }
}

/**
 * チャットペアを保存する
 * @param botIndices 保存するボットのインデックス配列
 * @param customName カスタム名（省略時は自動生成）
 * @returns 保存されたチャットペア
 */
export async function saveChatPair(botIndices: number[], customName?: string): Promise<ChatPair> {
  const config = await getUserConfig();
  const allBots = config.customApiConfigs || [];

  // デフォルト名を生成（各ショートネームを|で区切る）
  const defaultName = botIndices
    .map(index => {
      const bot = allBots[index];
      return bot?.shortName || bot?.name || `Bot ${index + 1}`;
    })
    .join(' | ');

  const newPair: ChatPair = {
    id: `pair_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    name: customName || defaultName,
    botIndices: [...botIndices],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  const updatedPairs = [...(config.savedChatPairs || []), newPair];
  await updateUserConfig({ savedChatPairs: updatedPairs });

  return newPair;
}

/**
 * チャットペアを更新する
 * @param pairId 更新するペアのID
 * @param updates 更新内容
 */
export async function updateChatPair(pairId: string, updates: Partial<Omit<ChatPair, 'id' | 'createdAt'>>) {
  const config = await getUserConfig();
  const pairs = config.savedChatPairs || [];
  
  const updatedPairs = pairs.map(pair => 
    pair.id === pairId 
      ? { ...pair, ...updates, updatedAt: Date.now() }
      : pair
  );

  await updateUserConfig({ savedChatPairs: updatedPairs });
}

/**
 * チャットペアを削除する
 * @param pairId 削除するペアのID
 */
export async function deleteChatPair(pairId: string) {
  const config = await getUserConfig();
  const pairs = config.savedChatPairs || [];
  
  const updatedPairs = pairs.filter(pair => pair.id !== pairId);
  await updateUserConfig({ savedChatPairs: updatedPairs });
}

/**
 * 保存されたチャットペアを取得する
 * @returns 保存されたチャットペアの配列
 */
export async function getSavedChatPairs(): Promise<ChatPair[]> {
  const config = await getUserConfig();
  return config.savedChatPairs || [];
}
