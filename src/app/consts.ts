import { BotId } from './bots'

export let CHATBOTS: Record<BotId, { name: string; avatar: string }> = {
  chatgpt: {
    name: 'ChatGPT',
    avatar: 'OpenAI.Black',
  },
  claude: {
    name: 'Claude',
    avatar: 'Claude.simple',
  },
  'claude-think': {
    name: 'Claude Think',
    avatar: 'Claude.orange',
  },
  gemini: {
    name: 'Gemini Advanced',
    avatar: 'Gemini.Color',
  },
  bard: {
    name: 'Bard',
    avatar: 'Gemini.Color',
  },
  bing: {
    name: 'Bing',
    avatar: 'Bing.Color',
  },
  perplexity: {
    name: 'Perplexity',
    avatar: 'Perplexity.Turquoise',
  },
  'perplexity-reasoning': {
    name: 'Perplexity Reasoning',
    avatar: 'Perplexity.sonar',
  },
  llama: {
    name: 'Llama 2',
    avatar: 'Ollama.Color',
  },
  mistral: {
    name: 'Mixtral',
    avatar: 'Mistral.Color',
  },
  vicuna: {
    name: 'Vicuna',
    avatar: 'Ollama.Color',
  },
  falcon: {
    name: 'Falcon',
    avatar: 'Ollama.Color',
  },
  grok: {
    name: 'Grok',
    avatar: 'Grok.Color',
  },
  pi: {
    name: 'Pi',
    avatar: 'Anthropic.Color',
  },
  wizardlm: {
    name: 'WizardLM',
    avatar: 'Ollama.Color',
  },
  chatglm: {
    name: 'ChatGLM2',
    avatar: 'Ollama.Color',
  },
  xunfei: {
    name: 'iFlytek Spark',
    avatar: 'Anthropic.Color',
  },
  qianwen: {
    name: 'Qianwen',
    avatar: 'Anthropic.Color',
  },
  baichuan: {
    name: 'Baichuan',
    avatar: 'Anthropic.Color',
  },
  yi: {
    name: 'Yi-Chat',
    avatar: 'Anthropic.Color',
  },
  'customchat1': {
    name: 'customchat1',
    avatar: 'OpenAI.Black',
  },
  'customchat2': {
    name: 'customchat2',
    avatar: 'OpenAI.Black',
  },
  'customchat3': {
    name: 'customchat3',
    avatar: 'OpenAI.Black',
  },
  'customchat4': {
    name: 'customchat4',
    avatar: 'OpenAI.Black',
  },
  'customchat5': {
    name: 'customchat5',
    avatar: 'OpenAI.Black',
  },
  'customchat6': {
    name: 'customchat6',
    avatar: 'OpenAI.Black',
  },
  'customchat7': {
    name: 'customchat7',
    avatar: 'OpenAI.Black',
  },
  'customchat8': {
    name: 'customchat8',
    avatar: 'OpenAI.Black',
  },
  'customchat9': {
    name: 'customchat9',
    avatar: 'OpenAI.Black',
  },
  'customchat10': {
    name: 'customchat10',
    avatar: 'OpenAI.Black',
  },
}



export const CHATBOTS_UPDATED_EVENT = 'chatbotsUpdated'


export const CHATGPT_HOME_URL = 'https://chat.openai.com'
export const CHATGPT_API_MODELS = ['gpt-4o', 'gpt-4o-mini', 'o1-mini','o3-mini', 'o1']
export const ALL_IN_ONE_PAGE_ID = 'all'

export const DEFAULT_SYSTEM_MESSAGE = "Current date: {current_date}. \n\nYou prioritize the needs of the user and respond promptly to their questions and requests. You reply in a polite and approachable tone, maintaining professionalism while incorporating humor. For technical or specialized questions, especially those involving programming code, you strive to provide accurate and reliable information, clearly indicating sources when available. You continuously learn and update your knowledge through interactions with users. \nIf additional information is needed to answer a question, you ask the user for it. Think through your response step-by-step before answering.\n\nAdditionally, ensure that your responses are in the language of the user's prompt, or follow any language specifications provided within the prompt."

export const DEFAULT_CHATGPT_SYSTEM_MESSAGE =
  'You are ChatGPT, a large language model trained by OpenAI. Current date: {current_date}. ' + DEFAULT_SYSTEM_MESSAGE
export const DEFAULT_CLAUDE_SYSTEM_MESSAGE =
  'You are ChatGPT, a large language model trained by Anthropic. Current date: {current_date}' + DEFAULT_SYSTEM_MESSAGE

export type Layout = 'single' | 2 | 3 | 4 | 'imageInput' | 'twoVertical' | 'twoHorizon' | 'sixGrid' // twoVertical is deprecated
