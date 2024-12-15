import claudeLogo from '~/assets/logos/anthropic.png'
import baichuanLogo from '~/assets/logos/baichuan.png'
import bardLogo from '~/assets/logos/bard.svg'
import bingLogo from '~/assets/logos/bing.svg'
import chatglmLogo from '~/assets/logos/chatglm.svg'
import chatgptLogo from '~/assets/logos/chatgpt.svg'
import falconLogo from '~/assets/logos/falcon.jpeg'
import geminiLogo from '~/assets/logos/gemini.png'
import grokLogo from '~/assets/logos/grok.png'
import llamaLogo from '~/assets/logos/llama.png'
import mistralLogo from '~/assets/logos/mistral.png'
import piLogo from '~/assets/logos/pi.png'
import pplxLogo from '~/assets/logos/pplx.jpg'
import qianwenLogo from '~/assets/logos/qianwen.png'
import vicunaLogo from '~/assets/logos/vicuna.jpg'
import wizardlmLogo from '~/assets/logos/wizardlm.png'
import xunfeiLogo from '~/assets/logos/xunfei.png'
import yiLogo from '~/assets/logos/yi.svg'
import { BotId } from './bots'

export const CHATBOTS: Record<BotId, { name: string; avatar: string }> = {
  chatgpt: {
    name: 'ChatGPT',
    avatar: chatgptLogo,
  },
  claude: {
    name: 'Claude',
    avatar: claudeLogo,
  },
  gemini: {
    name: 'Gemini Advanced',
    avatar: geminiLogo,
  },
  bard: {
    name: 'Bard',
    avatar: bardLogo,
  },
  bing: {
    name: 'Bing',
    avatar: bingLogo,
  },
  perplexity: {
    name: 'Perplexity',
    avatar: pplxLogo,
  },
  llama: {
    name: 'Llama 2',
    avatar: llamaLogo,
  },
  mistral: {
    name: 'Mixtral',
    avatar: mistralLogo,
  },
  vicuna: {
    name: 'Vicuna',
    avatar: vicunaLogo,
  },
  falcon: {
    name: 'Falcon',
    avatar: falconLogo,
  },
  grok: {
    name: 'Grok',
    avatar: grokLogo,
  },
  pi: {
    name: 'Pi',
    avatar: piLogo,
  },
  wizardlm: {
    name: 'WizardLM',
    avatar: wizardlmLogo,
  },
  chatglm: {
    name: 'ChatGLM2',
    avatar: chatglmLogo,
  },
  xunfei: {
    name: 'iFlytek Spark',
    avatar: xunfeiLogo,
  },
  qianwen: {
    name: 'Qianwen',
    avatar: qianwenLogo,
  },
  baichuan: {
    name: 'Baichuan',
    avatar: baichuanLogo,
  },
  yi: {
    name: 'Yi-Chat',
    avatar: yiLogo,
  },
}

export const CHATGPT_HOME_URL = 'https://chat.openai.com'
export const CHATGPT_API_MODELS = ['gpt-4o', 'gpt-4o-mini', 'o1-mini', 'o1'] as const
export const ALL_IN_ONE_PAGE_ID = 'all'

export const DEFAULT_SYSTEM_MESSAGE = 'あなたは、ユーザーのニーズを最優先にし、彼らの質問やリクエストに迅速に対応します。あなたは、丁寧で親しみやすいトーンで、ユーモアを交えつつも専門性を保ちながら応答します。技術的・専門的な質問や、プログラムコードに関する質問であれば、常に正確で信頼性の高い情報を提供することを心がけ、出典がある場合はそれを明示します。あなたは、ユーザーとの対話を通じて学習し、知識を更新し続けます。質問に答えるために必要な情報があれば、ユーザーにそれを尋ねます。'

export const DEFAULT_CHATGPT_SYSTEM_MESSAGE =
  'You are ChatGPT, a large language model trained by OpenAI. Current date: {current_date}. ' + DEFAULT_SYSTEM_MESSAGE
export const DEFAULT_CLAUDE_SYSTEM_MESSAGE =
  'You are ChatGPT, a large language model trained by Anthropic. Current date: {current_date}' + DEFAULT_SYSTEM_MESSAGE

export type Layout = 2 | 3 | 4 | 'imageInput' | 'twoVertical' | 'sixGrid' // twoVertical is deprecated
