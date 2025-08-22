/**
 * System prompt template variable replacement utility
 */

export interface SystemPromptVariables {
  current_date: string
  current_time: string
  modelname: string
  chatbotname: string
  language: string
  timezone: string
  web_search_instructions?: string
}

/**
 * Replace template variables in system prompt
 * @param systemMessage - The system message with template variables
 * @param variables - The variables to replace
 * @returns The system message with variables replaced
 */
export function replaceSystemPromptVariables(
  systemMessage: string,
  variables: Partial<SystemPromptVariables>
): string {
  let result = systemMessage

  // Replace each variable if provided
  if (variables.current_date) {
    result = result.replace(/\{current_date\}/g, variables.current_date)
  }
  
  if (variables.current_time) {
    result = result.replace(/\{current_time\}/g, variables.current_time)
  }
  
  if (variables.modelname) {
    result = result.replace(/\{modelname\}/g, variables.modelname)
  }
  
  if (variables.chatbotname) {
    result = result.replace(/\{chatbotname\}/g, variables.chatbotname)
  }
  
  if (variables.language) {
    result = result.replace(/\{language\}/g, variables.language)
  }
  
  if (variables.timezone) {
    result = result.replace(/\{timezone\}/g, variables.timezone)
  }
  
  if (variables.web_search_instructions) {
    result = result.replace(/\{web_search_instructions\}/g, variables.web_search_instructions)
  }

  return result
}

/**
 * Get current date and time strings
 */
export function getCurrentDateTime() {
  const now = new Date()
  return {
    current_date: now.toISOString().split('T')[0], // YYYY-MM-DD format
    current_time: now.toTimeString().split(' ')[0], // HH:MM:SS format
  }
}

/**
 * Get user's language and timezone
 */
export function getUserLocaleInfo() {
  // First try to get app's language setting from localStorage, then fallback to browser language
  const appLanguage = localStorage.getItem('language')
  const language = appLanguage || navigator.language || 'zh-CN'  // App setting -> Browser -> Default to Chinese
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Shanghai'  // Default to China timezone
  return {
    language,
    timezone,
  }
}

/**
 * Get web search instructions if web access is enabled
 */
export function getWebSearchInstructions(webAccessEnabled: boolean, language: string = 'en'): string {
  if (!webAccessEnabled) {
    return ': (Currently turned off by user)'
  }
  
  const lang = language.toLowerCase().startsWith('zh') ? 'zh' : 
               language.toLowerCase().startsWith('ja') ? 'ja' : 'en'
  
  const instructions = {
    en: {
      title: '## 🔍 Web Search Tool',
      description: 'You have access to a web search tool with multiple providers. When you need current information, recent news, or information beyond your knowledge cutoff, respond with a JSON object in this format:',
      usage: 'Use concise search queries. Choose the language based on the user\'s query. Select the appropriate search provider based on your needs:\n- Use "google" for general web searches and comprehensive information\n- Use "bing_news" for recent news and current events\n\nYou can use this tool multiple times if needed - if the first search doesn\'t provide sufficient information, search again with different keywords or a different provider. Only use this tool when you need current or recent information that you don\'t already know.'
    },
    ja: {
      title: '## 🔍 Web検索ツール',
      description: '複数の検索プロバイダーを持つWeb検索ツールが利用できます。最新情報、最近のニュース、またはあなたの知識範囲を超える情報が必要な場合、以下の形式でJSONオブジェクトを返してください：',
      usage: '簡潔な検索クエリを使用してください。ユーザーのクエリに基づいて言語を選択してください。ニーズに応じて適切な検索プロバイダーを選択してください：\n- 一般的なWeb検索や包括的な情報には「google」を使用\n- 最近のニュースや時事問題には「bing_news」を使用\n\n必要に応じて複数回使用できます - 最初の検索で十分な情報が得られない場合は、異なるキーワードや異なるプロバイダーで再度検索してください。すでに知らない最新または最近の情報が必要な場合にのみ、このツールを使用してください。'
    },
    zh: {
      title: '## 🔍 网络搜索工具',
      description: '您可以使用具有多个提供商的网络搜索工具。当您需要当前信息、最新新闻或超出您知识范围的信息时，请以以下格式返回JSON对象：',
      usage: '使用简洁的搜索查询。根据用户的查询选择语言。根据您的需要选择合适的搜索提供商：\n- 使用"google"进行一般网络搜索和综合信息\n- 使用"bing_news"获取最新新闻和时事\n\n如果需要可以多次使用此工具 - 如果第一次搜索没有提供足够的信息，请使用不同的关键词或不同的提供商再次搜索。仅在需要您尚不知道的当前或最新信息时使用此工具。'
    }
  }
  
  const i = instructions[lang as keyof typeof instructions]
  
  return `

${i.title}

${i.description}

\`\`\`json
{
    "action": "web_search",
    "action_input": "search query here",
    "provider": "google"
}
\`\`\`

or

\`\`\`json
{
    "action": "web_search", 
    "action_input": "search query here",
    "provider": "bing_news"
}
\`\`\`

${i.usage}`
}