import { defaults } from 'lodash-es'
import Browser from 'webextension-polyfill'
import { BotId } from '~app/bots'
import { ALL_IN_ONE_PAGE_ID, CHATBOTS, CHATGPT_API_MODELS, DEFAULT_CHATGPT_SYSTEM_MESSAGE, DEFAULT_CLAUDE_SYSTEM_MESSAGE } from '~app/consts'
import { CHATBOTS_UPDATED_EVENT } from '~app/consts'
import defaultLogo from '~/assets/logos/CCLLM.png'

export enum BingConversationStyle {
  Creative = 'creative',
  Balanced = 'balanced',
  Precise = 'precise',
}

export enum ChatGPTMode {
  Webapp = 'webapp',
  API = 'api',
  Azure = 'azure',
  Poe = 'poe',
  OpenRouter = 'openrouter',
}

export enum ChatGPTWebModel {
  'GPT-3.5' = 'gpt-3.5',
  'GPT-4' = 'gpt-4',
}

export enum PoeGPTModel {
  'GPT-3.5' = 'chinchilla',
  'GPT-4' = 'beaver',
}

export enum PoeClaudeModel {
  'claude-instant' = 'a2',
  'claude-instant-100k' = 'a2_100k',
  'claude-2-100k' = 'a2_2',
}

export enum ClaudeMode {
  Webapp = 'webapp',
  API = 'api',
  Poe = 'poe',
  OpenRouter = 'openrouter',
}

export enum ClaudeAPIModel {
  'Claude 3.5 Haiku' = 'claude-3-5-haiku-latest',
  'Claude 3.5 Sonnet' = 'claude-3-5-sonnet-latest',
}

export enum GeminiAPIModel {
  'Gemini 1.5 Flash' = 'gemini-1.5-flash',
  'Gemini 1.5 Pro' = 'gemini-1.5-pro',
  'Gemini 2.0 Flash Experimental' = 'gemini-2.0-flash-exp',
  'Gemini 2.0 Pro Experimental' = 'gemini-2.0-pro-exp-02-05',
  'Gemini 2.0 Flash' = 'gemini-2.0-flash',
  'Gemini 2.0 Flash Thinking Mode Experimental' = 'gemini-2.0-flash-thinking-exp'
}

export enum CustomAPIModel {
  'OpenAI GPT 4o' = 'gpt-4o',
  'OpenAI GPT 4o mini' = 'gpt-4o-mini',
  'OpenAI GPT o3-mini' = 'o3-mini',
  'Gemini 2.0 Flash' = 'google/gemini-1.5-flash-001',
  'Gemini 2.0 Pro' = 'google/gemini-2.0-pro-exp-02-05',
  'Gemini 2.0 Flash Thinking' = 'google/gemini-2.0-flash-thinking-exp-01-21',
  'Gemini 1.0 Pro Vision' = 'google/gemini-1.0-pro-vision',
  'RakutenAI-7B' = 'RakutenAI-7B-chat-v1',
  'Claude 3.5 Sonnet v2' = 'anthropic.claude-3-5-sonnet-20241022-v2:0',
  'Claude 3.5 Sonnet' = 'us.anthropic.claude-3-5-sonnet-20240620-v1:0',
  'Claude 3.5 Haiku' = 'anthropic.claude-3-5-haiku-20241022-v1:0',
  'Claude 3 Haiku' = 'us.anthropic.claude-3-haiku-20240307-v1:0',
  'Starling LM 7B beta' = 'Starling-LM-7B-beta',
  'Qwen 2.5 1.5b Instruct' = 'qwen2.5-1.5b-instruct',
  'APPLEPIE-r1n4m-800' = 'APPLEPIE-r1n4m-800_dfull_tp03_1ep_1e6',
  'MANGOPIE-r1n5-800' = 'MANGOPIE-r1n5-800_dfull_tp03_1ep_1e6_1',
  'SFT' = 'v0.1-sft-v1',
  'checkpoint-9000' = 'checkpoint-9000',
  'Mixtral 8x22B Instruct' = 'Mixtral-8x22B-Instruct-v0.1',
  'Rakuten AI 7B Translate' = 'rakuten-ai-7b-translate-2410',
  '1.5b DPO ep3' = '1.5b-dpo-ep3-checkpoint-969',
}

export enum OpenRouterClaudeModel {
  'claude-2' = 'claude-2',
  'claude-instant-v1' = 'claude-instant-v1',
}

export enum PerplexityMode {
  Webapp = 'webapp',
  API = 'api',
}


export interface customApiConfig {
  id: number
  name: string,
  shortName: string,
  host: string,
  model: string,
  temperature: number,
  systemMessage: string,
  avatar: string,
  apiKey: string 
}

const defaultCustomApiConfigs: customApiConfig[] = [
  {
    id: 1,
    name: 'Custom Ai1',
    shortName: '4o', 
    model: 'gpt-4o',
    host: '',
    temperature: 0.7,
    systemMessage: '',
    avatar: defaultLogo,
    apiKey: '' 
  },
  {
    id: 2,
    name: 'Custom Ai2',
    shortName: '4o-mi', 
    model: 'gpt-4o-mini',
    host: '',
    temperature: 1.0,
    systemMessage: '',
    avatar: defaultLogo,
    apiKey: '' 
  },
  {
    id: 3,
    name: 'Custom Ai3',
    shortName: 'LessT', 
    model: 'gpt-4o-mini',
    host: '',
    temperature: 0.2,
    systemMessage: '',
    avatar: defaultLogo,
    apiKey: '' 
  },
  {
    id: 4,
    name: 'Custom Ai4',
    shortName: 'rand', 
    model: 'gpt-4o-mini',
    host: '',
    temperature: 2.0,
    systemMessage: '',
    avatar: defaultLogo,
    apiKey: '' 
  },
  {
    id: 5,
    name: 'Custom Ai5',
    shortName: 'Claud', 
    model: 'anthropic.claude-3-5-sonnet-20241022-v2:0',
    host: 'https://XXXXXXXXXXXX.azure-api.net/aws-bedrock/',
    temperature: 0.7,
    systemMessage: '',
    avatar: defaultLogo,
    apiKey: '' 
  },
  {
    id: 6,
    name: 'Custom Ai6',
    shortName: 'ClHa', 
    model: 'us.anthropic.claude-3-5-sonnet-20240620-v1:0',
    host: 'https://XXXXXXXXX.azure-api.net/aws-bedrock/',
    temperature: 1.0,
    systemMessage: '',
    avatar: defaultLogo,
    apiKey: '' 
  },
  {
    id: 7,
    name: 'Custom Ai7',
    shortName: 'ClH', 
    model: 'anthropic.claude-3-5-haiku-20241022-v1:0',
    host: 'https://XXXXXXXXXX.azure-api.net/aws-bedrock/',
    temperature: 0.9,
    systemMessage: '',
    avatar: defaultLogo,
    apiKey: '' 
  },
  {
    id: 8,
    name: 'Custom Ai8',
    shortName: 'Cus8', 
    model: 'us.anthropic.claude-3-haiku-20240307-v1:0',
    host: 'https://XXXXXXXXXXX.azure-api.net/aws-bedrock/',
    temperature: 0.9,
    systemMessage: '',
    avatar: defaultLogo,
    apiKey: '' 
  },
  {
    id: 8,
    name: 'Custom Ai9',
    shortName: 'Cus9', 
    model: 'deepseek-chat',
    host: 'https://XXXXXXXXXXX.azure-api.net/aws-bedrock/',
    temperature: 0.9,
    systemMessage: '',
    avatar: defaultLogo,
    apiKey: '' 
  },
  {
    id: 8,
    name: 'Custom Ai10',
    shortName: 'Cus10', 
    model: 'deepseek-reasoner',
    host: 'https://XXXXXXXXXXX.azure-api.net/aws-bedrock/',
    temperature: 0.9,
    systemMessage: '',
    avatar: defaultLogo,
    apiKey: '' 
  }
]



const userConfigWithDefaultValue = {
  openaiApiKey: '',
  openaiApiHost: 'https://api.openai.com',
  chatgptApiModel: CHATGPT_API_MODELS[0] as (typeof CHATGPT_API_MODELS)[number] | string,
  chatgptApiTemperature: 1,
  chatgptApiSystemMessage: DEFAULT_CHATGPT_SYSTEM_MESSAGE,
  chatgptMode: ChatGPTMode.API,
  chatgptWebappModelName: ChatGPTWebModel['GPT-3.5'],
  chatgptPoeModelName: PoeGPTModel['GPT-3.5'],
  startupPage: ALL_IN_ONE_PAGE_ID,
  bingConversationStyle: BingConversationStyle.Balanced,
  poeModel: PoeClaudeModel['claude-instant'],
  azureOpenAIApiKey: '',
  azureOpenAIApiInstanceName: '',
  azureOpenAIApiDeploymentName: '',
  enabledBots: Object.keys(CHATBOTS).slice(0, 3) as BotId[],
  claudeApiKey: '',
  claudeApiHost: 'https://api.anthropic.com/',
  claudeMode: ClaudeMode.API,
  claudeApiModel: ClaudeAPIModel['Claude 3.5 Haiku'] as string,
  claudeApiSystemMessage: DEFAULT_CLAUDE_SYSTEM_MESSAGE,
  claudeApiTemperature: 1.0,
  chatgptWebAccess: false,
  claudeWebAccess: false,
  openrouterOpenAIModel: CHATGPT_API_MODELS[0] as (typeof CHATGPT_API_MODELS)[number],
  openrouterClaudeModel: OpenRouterClaudeModel['claude-2'],
  openrouterApiKey: '',
  perplexityMode: PerplexityMode.Webapp,
  perplexityApiKey: '',
  perplexityModel: 'sonar-pro',
  geminiApiKey: '',
  geminiApiModel: GeminiAPIModel['Gemini 2.0 Flash Experimental'],
  geminiApiSystemMessage: DEFAULT_CHATGPT_SYSTEM_MESSAGE,
  geminiApiTemperature: 1.0,
  customApiConfigs: defaultCustomApiConfigs,
  customApiKey: '',
  customApiHost: '',
  useCustomChatbotOnly: null as null | boolean,
}

export type UserConfig = typeof userConfigWithDefaultValue

export async function getUserConfig(): Promise<UserConfig> {
  const result = await Browser.storage.sync.get(null) // 全ての設定を取得
  
  // rakutenApiConfigsの復元
  const configCount = result.customApiConfigCount || defaultCustomApiConfigs.length
  const configs: customApiConfig[] = []
  
  for (let i = 0; i < configCount; i++) {
    const config = result[`customApiConfig_${i}`]
    if (config) {
      configs.push(config)
    } else {
      // 設定が見つからない場合はデフォルト値を使用
      configs.push(defaultCustomApiConfigs[i])
    }
  }
  
  result.customApiConfigs = configs
  delete result.customApiConfigCount 
  if (!result.chatgptMode && result.openaiApiKey) {
    result.chatgptMode = ChatGPTMode.API
  }
  if (result.chatgptWebappModelName === 'default') {
    result.chatgptWebappModelName = ChatGPTWebModel['GPT-3.5']
  } else if (result.chatgptWebappModelName === 'gpt-4-browsing') {
    result.chatgptWebappModelName = ChatGPTWebModel['GPT-4']
  } else if (result.chatgptWebappModelName === 'gpt-3.5-mobile') {
    result.chatgptWebappModelName = ChatGPTWebModel['GPT-3.5']
  } else if (result.chatgptWebappModelName === 'gpt-4-mobile') {
    result.chatgptWebappModelName = ChatGPTWebModel['GPT-4']
  }
  if (result.chatgptApiModel === 'gpt-3.5-turbo-16k') {
    result.chatgptApiModel = 'gpt-3.5-turbo'
  } else if (result.chatgptApiModel === 'gpt-4-32k') {
    result.chatgptApiModel = 'gpt-4'
  }
  if (
    result.claudeApiModel !== ClaudeAPIModel['Claude 3.5 Sonnet'] &&
    result.claudeApiModel !== ClaudeAPIModel['Claude 3.5 Haiku']
  ) {
    result.claudeApiModel = ClaudeAPIModel['Claude 3.5 Haiku']
  }
  if (!Object.values(GeminiAPIModel).includes(result.geminiApiModel as GeminiAPIModel)) {
    result.geminiApiModel = GeminiAPIModel['Gemini 2.0 Flash Experimental']
  }

  // customApiConfigsの不足をデフォルト値で補う
  if (result.customApiConfigs) {
    const defaultCount = defaultCustomApiConfigs.length;
    const currentCount = result.customApiConfigs.length;

    if (currentCount < defaultCount) {
      const configsToAdd = defaultCustomApiConfigs.slice(currentCount, defaultCount);
      result.customApiConfigs.push(...configsToAdd);
    }
  } else {
    result.customApiConfigs = [...defaultCustomApiConfigs]; // 初めて設定されている場合
  }

  
  return defaults(result, userConfigWithDefaultValue)
}

export async function updateUserConfig(updates: Partial<UserConfig>) {
  console.debug('update configs', updates)
  
  // customApiConfigsが含まれている場合は、別々のキーとして保存
  if ('customApiConfigs' in updates) {
    const configs = updates.customApiConfigs
    delete updates.customApiConfigs // 元の配列は削除

    if (configs) {
      // 各設定を個別のキーとして保存
      for (let i = 0; i < configs.length; i++) {
        await Browser.storage.sync.set({ [`customApiConfig_${i}`]: configs[i] })
      }
      // 設定の数を保存
      await Browser.storage.sync.set({ customApiConfigCount: configs.length })
      updateLocalCustomChatbotsVariable(configs)
    }
  }

  // その他の更新
  await Browser.storage.sync.set(updates)
  for (const [key, value] of Object.entries(updates)) {
    if (value === undefined) {
      await Browser.storage.sync.remove(key)
    }
  }
 
  // もしキーにcustomApiConfigsが含まれていたら
  if ('customApiConfigs' in updates) {
    updateLocalCustomChatbotsVariable(updates.customApiConfigs ?? [])
  }
}

// どうやったら動的に更新できるか分からないから取りあえずべた書き。
export let localChatBotsInfo: Partial<Record<BotId, { name: string }>> = {
  'customchat1': {
    name: 'GPT-4o',
  },
  'customchat2': {
    name: 'GPT-4o mini',
  },
  'customchat3': {
    name: 'Gemini 1.5 Pro',
  },
  'customchat4': {
    name: 'Rakuten AI 7B',
  },
  'customchat5': {
    name: 'Claude 3.5 Sonnet v2',
  },
  'customchat6': {
    name: 'Claude 3.5 Sonnet',
  },
  'customchat7': {
    name: 'Claude 3.5 Haiku',
  },
  'customchat8': {
    name: '自定义',
  },
}

export async function updateLocalCustomChatbotsVariable(customApiConfigs: customApiConfig[]) {
  for (let i = 0; i < customApiConfigs.length; i++) {
    const config = customApiConfigs[i]
    const botId = `customchat${i + 1}` as BotId
    if (localChatBotsInfo[botId]) {
      localChatBotsInfo[botId] = {
        ...localChatBotsInfo[botId],
        name: config.name
      }
    } else {
      localChatBotsInfo[botId] = { name: config.name }
    }
  }
}

// Custom ChatGPT の設定を更新する関数
export function getChatbotName(botId: BotId) {
  const chatbotName = localChatBotsInfo[botId]?.name ?? CHATBOTS[botId].name
  console.log('Return following chatname: ' + chatbotName)
  return chatbotName
  
}
