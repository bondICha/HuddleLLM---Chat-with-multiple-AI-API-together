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

function buildToolUsingPrompt(input: string) {
  // Web search指示はsystem promptに移行
  return `${input}`
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


function extractJsonPayload(text: string): { action: string; action_input: string; provider?: string } | null {
  // First, try to parse the text as JSON directly
  try {
    const parsed = JSON.parse(text);
    if (parsed.action && parsed.action_input) {
      return { 
        action: parsed.action, 
        action_input: parsed.action_input,
        provider: parsed.provider 
      };
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
          return { 
            action: parsed.action, 
            action_input: parsed.action_input,
            provider: parsed.provider
          };
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
  let searchCount = 0;
  const maxSearches = 3; // 最大検索回数
  let allSearchResults: any[] = [];
  let allContents: string[] = [];

  while (searchCount < maxSearches) {
    let llmOutputText = '';
    let hasYieldedContent = false;
    
    for await (const payload of llm(prompt, input)) {
      llmOutputText = payload.text;
      // Stream the content as it comes in
      if (payload.text && payload.text.length > 0) {
        yield payload;
        hasYieldedContent = true;
      }
    }

    const parsedJson = extractJsonPayload(llmOutputText);

    if (!parsedJson) {
      // No JSON found, treat as final answer - content already streamed
      if (!hasYieldedContent) {
        yield { text: llmOutputText };
      }
      return;
    }

    if (parsedJson.action === 'web_search') {
      searchCount++;
      const actionInput = parsedJson.action_input;
      const provider = parsedJson.provider || 'google'; // デフォルトはgoogle
      
      let searchResults: any[] = [];
      
      try {
        searchResults = await searchRelatedContext(actionInput, signal, provider);
        
        if (searchResults.length === 0) {
          yield { text: `⚠️ 検索結果が見つかりませんでした。\nクエリ: "${actionInput}"\nプロバイダー: ${provider}\n\n検索エンジンから結果が返されていない可能性があります。別のキーワードで試してみてください。` };
        } else {
          const thinkingMessage = getLocalizedText('agent_search_thinking', language, { query: actionInput });
          yield { text: '', thinking: thinkingMessage, searchResults };
        }
      } catch (error) {
        const errorMessage = `❌ 検索エラーが発生しました\nクエリ: "${actionInput}"\nプロバイダー: ${provider}\nエラー: ${error instanceof Error ? error.message : '不明なエラー'}\n\nネットワーク接続や検索プロバイダーの問題の可能性があります。`;
        yield { text: errorMessage };
        searchResults = []; // エラー時は空配列
      }

      const actualResults = searchResults;
      allSearchResults.push(...actualResults);

      // Deduplicate URLs while preserving provider information
      const uniqueUrls = new Set<string>();
      const uniqueResults = actualResults.filter((item: any) => {
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
      
      allContents.push(...fullContents);
      
      // 次の検索のために、これまでの検索結果を含めたプロンプトを構築
      const context = `${allContents.join('\n\n')}`;
      const promptWithContext = buildPromptWithContext(input, context, language);
      
      if (searchCount < maxSearches) {
        // まだ検索可能な場合は、継続検索の指示を追加
        const continueSearchInstruction = getLocalizedText('agent_continue_search_instruction', language);
        prompt = `${continueSearchInstruction}\n\n${promptWithContext}`;
      } else {
        // 最大検索回数に達した場合は最終回答を生成
        const finalInstruction = getLocalizedText('agent_final_instruction', language);
        prompt = `${finalInstruction}\n\n${promptWithContext}`;
        yield* llm(prompt, input);
        return;
      }
    } else {
      // 検索以外のアクション、または未知のアクション
      if (parsedJson.action !== 'web_search') {
        throw new Error(`Unexpected agent action: ${parsedJson.action}`);
      }
    }
  }

  // ここに到達することは通常ありませんが、安全のため
  const context = `${allContents.join('\n\n')}`;
  const promptWithContext = buildPromptWithContext(input, context, language);
  const finalInstruction = getLocalizedText('agent_final_instruction', language);
  prompt = `${finalInstruction}\n\n${promptWithContext}`;
  yield* llm(prompt, input);
}

export { execute }
