import { removeSlashes } from 'slashes';
import { PROMPT_TEMPLATE } from './prompts';
import { searchRelatedContext } from './web-search';
import { AnwserPayload } from '~app/bots/abstract-bot';
import Browser from 'webextension-polyfill';
import { htmlToText } from '~app/utils/html-utils';

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

function buildPromptWithContext(input: string, context: string) {
  if (!context) {
    return `Question: ${input}`
  }
  const currentDate = new Date().toISOString().split('T')[0]
  return `Current date: ${currentDate}. Use the provided context delimited by triple quotes to answer questions. The answer should use the same language as the user question instead of context.\n\nContext: """${context}"""\n\nQuestion: ${input}`
}

const FINAL_ANSWER_KEYWORD_REGEX = /"action":\s*"Final Answer"/
const WEB_SEARCH_KEYWORD_REGEX = /"action":\s*"web_search"/
const ACTION_INPUT_REGEX = /"action_input":\s*"((?:\\.|[^"])+)(?:"\s*(```)?)?/

function extractJsonPayload(text: string): { action: string; action_input: string } | null {
  const match = text.match(/```json\s*([\s\S]*?)\s*```/);
  const jsonString = match ? match[1] : text;
  try {
    const parsed = JSON.parse(jsonString);
    if (parsed.action && parsed.action_input) {
      return { action: parsed.action, action_input: parsed.action_input };
    }
  } catch (e) {
    // Not a valid JSON, maybe the LLM is still typing.
  }
  return null;
}

async function* execute(
  input: string,
  llm: (prompt: string, rawUserInput: string) => AsyncGenerator<AnwserPayload>,
  signal?: AbortSignal,
): AsyncGenerator<AnwserPayload> {
  let prompt = buildToolUsingPrompt(input)

  let llmOutputText = '';
  for await (const payload of llm(prompt, input)) {
    llmOutputText = payload.text;
  }

  const parsedJson = extractJsonPayload(llmOutputText);

  if (!parsedJson) {
    yield { text: llmOutputText };
    return;
  }

  if (parsedJson.action === 'web_search') {
    const actionInput = parsedJson.action_input;
        const searchResults = await searchRelatedContext(actionInput, signal);
    yield { text: '', thinking: `Searching the web for "${actionInput}"`, searchResults };

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
    const promptWithContext = buildPromptWithContext(input, context);
    prompt = `Now forget about the previous JSON format instructions. Answer the following question based on the provided context in a natural, conversational way. Do NOT use JSON format in your response.\n\n${promptWithContext}`;
    yield* llm(prompt, input);
    return;
  }

  if (parsedJson.action === 'Final Answer') {
    yield { text: parsedJson.action_input };
    return;
  }

  throw new Error(`Unexpected agent action: ${parsedJson.action}`);
}

export { execute }
