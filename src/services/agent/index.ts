import { removeSlashes } from 'slashes';
import { PROMPT_TEMPLATE } from './prompts';
import { searchRelatedContext } from './web-search';
import { AnwserPayload } from '~app/bots/abstract-bot';
import Browser from 'webextension-polyfill';
import { htmlToText } from '~app/utils/html-utils';
import { getLanguage } from '~services/storage/language';

// Import i18n resources for all supported languages
import enLocale from '~app/i18n/locales/english.json';
import jaLocale from '~app/i18n/locales/japanese.json';
import zhCNLocale from '~app/i18n/locales/simplified-chinese.json';
import zhTWLocale from '~app/i18n/locales/traditional-chinese.json';

const locales = {
  'en': enLocale,
  'ja': jaLocale,
  'zh-CN': zhCNLocale,
  'zh-TW': zhTWLocale,
} as const;

function getLocalizedText(key: string, language: string = 'en', replacements?: Record<string, string>): string {
  const locale = locales[language as keyof typeof locales] || locales['en'];
  let text = (locale as any)[key] || (enLocale as any)[key] || key;
  
  if (replacements) {
    Object.entries(replacements).forEach(([placeholder, value]) => {
      text = text.replace(new RegExp(`\\{\\{${placeholder}\\}\\}`, 'g'), value);
    });
  }
  
  return text;
}

const TOOLS = {
  web_search:
    'a search engine. useful for when you need to answer questions about current events or recent information. input should be a search query. language should be decided based on user\'s query. query should be short and concise',
}

function buildToolUsingPrompt(input: string) {
  const tools = Object.entries(TOOLS).map(([name, description]) => `- ${name}: ${description}`)
  return PROMPT_TEMPLATE.replace('{{tools}}', tools.join('\n'))
    .replace('{{tool_names}}', Object.keys(TOOLS).join(', '))
    .replace('{{input}}', input)
}

function buildPromptWithContext(input: string, context: string, language?: string) {
  if (!language) {
    language = getLanguage() || 'en';
  }

  if (!context) {
    return `${getLocalizedText('agent_question_label', language)} ${input}`
  }
  
  const contextPrompt = getLocalizedText('agent_context_prompt', language);
  const questionLabel = getLocalizedText('agent_question_label', language);
  const contextLabel = getLocalizedText('agent_context_label', language);
  
  return `${contextPrompt}\n\n${contextLabel} """${context}"""\n\n${questionLabel} ${input}`
}


function extractJsonPayload(text: string): { action: string; action_input: string } | null {
  // First, try to parse the text as JSON directly
  try {
    const parsed = JSON.parse(text);
    if (parsed.action && parsed.action_input) {
      return { action: parsed.action, action_input: parsed.action_input };
    }
  } catch (e) {
    // If direct parsing fails, look for JSON in code blocks
  }

  // Look for JSON in code blocks (both ```json``` and ``` patterns)
  const codeBlockMatches = [
    text.match(/```json\s*([\s\S]*?)\s*```/),
    text.match(/```\s*([\s\S]*?)\s*```/)
  ];

  for (const match of codeBlockMatches) {
    if (match) {
      try {
        const parsed = JSON.parse(match[1]);
        if (parsed.action && parsed.action_input) {
          return { action: parsed.action, action_input: parsed.action_input };
        }
      } catch (e) {
        // Continue to next pattern
      }
    }
  }

  return null;
}

async function* execute(
  input: string,
  llm: (prompt: string, rawUserInput: string) => AsyncGenerator<AnwserPayload>,
  signal?: AbortSignal,
): AsyncGenerator<AnwserPayload> {
  // Get user's language preference
  const language = getLanguage() || 'en';
  let prompt = buildToolUsingPrompt(input)

  let llmOutputText = '';
  for await (const payload of llm(prompt, input)) {
    llmOutputText = payload.text;
  }

  const parsedJson = extractJsonPayload(llmOutputText);

  if (!parsedJson) {
    // No JSON found, treat as final answer
    yield { text: llmOutputText };
    return;
  }

  if (parsedJson.action === 'web_search') {
    const actionInput = parsedJson.action_input;
        const searchResults = await searchRelatedContext(actionInput, signal);
    const thinkingMessage = getLocalizedText('agent_search_thinking', language, { query: actionInput });
    yield { text: '', thinking: thinkingMessage, searchResults };

    // Deduplicate URLs while preserving provider information
    const uniqueUrls = new Set<string>();
    const uniqueResults = searchResults.filter(item => {
      if (uniqueUrls.has(item.link)) {
        return false;
      }
      uniqueUrls.add(item.link);
      return true;
    });

    const fullContents = await Promise.all(
      uniqueResults.map(async (item) => {
        try {
          const response = await Browser.runtime.sendMessage({
            type: 'FETCH_URL',
            url: item.link,
          }) as { success: boolean, content?: string };
          if (response.success && response.content) {
            return `Content from ${item.link}:\n\n${htmlToText(response.content)}`;
          }
          return `Could not fetch content from ${item.link}`;
        } catch (error) {
          console.error(`Error fetching content for ${item.link}:`, error);
          return `Error fetching content from ${item.link}`;
        }
      })
    );
    const context = `${fullContents.join('\n\n')}`;
    const promptWithContext = buildPromptWithContext(input, context, language);
    const finalInstruction = getLocalizedText('agent_final_instruction', language);
    prompt = `${finalInstruction}\n\n${promptWithContext}`;
    yield* llm(prompt, input);
    return;
  }

  // If we reach here, it's an unknown action
  throw new Error(`Unexpected agent action: ${parsedJson.action}`);
}

export { execute }
