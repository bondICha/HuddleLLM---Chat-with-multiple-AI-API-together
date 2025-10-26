import { isArray } from 'lodash-es'
import { requestHostPermission } from '~app/utils/permissions'
import { ChatError, ErrorCode } from '~utils/errors'
import { parseSSEResponse } from '~utils/sse'
import { AbstractBot, SendMessageParams, ConversationHistory } from '../abstract-bot'
import { file2base64 } from '~app/utils/file-utils'
import { ChatMessageModel } from '~types'
import { uuid } from '~utils'
import { getUserLocaleInfo } from '~utils/system-prompt-variables'
import { sanitizeMessagesForClaude, ensureNonEmptyText } from '../claude-message-sanitizer'

interface ChatMessage {
  role: string
  content: string | { type: string; [key: string]: any }[]
}

interface ConversationContext {
  messages: ChatMessage[]
}

const CONTEXT_SIZE = 120

export abstract class AbstractClaudeApiBot extends AbstractBot {
  private conversationContext?: ConversationContext

  // ConversationHistoryインターフェースの実装
  public setConversationHistory(history: ConversationHistory): void {
    if (history.messages && Array.isArray(history.messages)) {
      // ChatMessageModelからChatMessageへの変換
      const messages: ChatMessage[] = history.messages.map(msg => {
        if (msg.author === 'user') {
          return {
            role: 'user',
            content: msg.text
          };
        } else {
          return {
            role: 'assistant',
            content: msg.text
          };
        }
      });
      
      this.conversationContext = {
        messages: messages
      };
    }
  }

  public getConversationHistory(): ConversationHistory | undefined {
    if (!this.conversationContext) {
      return undefined;
    }
    
    // ChatMessageからChatMessageModelへの変換
    const messages = this.conversationContext.messages.map(msg => {
      const role = msg.role === 'user' ? 'user' : 'assistant';
      let content = '';
      
      if (typeof msg.content === 'string') {
        content = msg.content;
      } else if (Array.isArray(msg.content)) {
        // contentが配列の場合、typeがtextの要素からテキストを抽出
        const textContent = msg.content.find(part => part.type === 'text');
        if (textContent && 'text' in textContent) {
          content = textContent.text || '';
        }
      }
      
      return {
        id: uuid(),
        author: role,
        text: content
      };
    });
    
    return { messages };
  }

  private async buildUserMessage(prompt: string, images?: File[]): Promise<ChatMessage> {
    if (!images || images.length === 0) {
      return { role: 'user', content: ensureNonEmptyText(prompt) }
    }

    const imageContents = await Promise.all(images.map(async (image) => {
      const dataUrl = await file2base64(image, true) // keepHeader = true
      const match = dataUrl.match(/^data:(.+);base64,(.+)$/)
      if (match) {
        return {
          type: 'image',
          source: {
            type: 'base64',
            media_type: match[1],
            data: match[2]
          }
        }
      }
      console.error('Could not parse data URL for image:', dataUrl)
      return null
    }))

    const validImageContents = imageContents.filter(content => content !== null)

    return {
      role: 'user',
      content: [
        { type: 'text', text: ensureNonEmptyText(prompt) },
        ...validImageContents
      ],
    }
  }

  private async buildMessages(prompt: string, images?: File[]): Promise<ChatMessage[]> {
    const userMessage = await this.buildUserMessage(prompt, images);
    return [
      ...this.conversationContext!.messages.slice(-(CONTEXT_SIZE + 1)),
      userMessage,
    ]
  }

  abstract getSystemMessage(): string

  async doSendMessage(params: SendMessageParams) {
    if (!this.conversationContext) {
      this.conversationContext = { messages: [] }
    }

    const messages = await this.buildMessages(params.prompt, params.images);
    const resp = await this.fetchCompletionApi(messages, params.signal)

    // add user message to context only after fetch success
    const userMessage = await this.buildUserMessage(params.rawUserInput || params.prompt, params.images);
    this.conversationContext.messages.push(userMessage);

    let done = false
    const result: ChatMessage = { role: 'assistant', content: '' }
    let thinkingContent = '';

    const finish = () => {
      done = true
      params.onEvent({ type: 'DONE' })
      const messages = this.conversationContext!.messages
      messages.push(result)
    }

    let currentToolUse: any = null

    await parseSSEResponse(resp, (message) => {
      console.debug('claude sse message', message)
      try {
        const data = JSON.parse(message)
        if (data.type === 'content_block_start' && data.content_block?.type === 'thinking') {
          thinkingContent = ''; // Reset thinking content at the start of a new block
        } else if (data.type === 'content_block_delta' && data.delta?.type === 'thinking_delta') {
          // Thinking モードの出力の処理
          thinkingContent += data.delta.thinking || '';
          params.onEvent({
            type: 'UPDATE_ANSWER',
            data: {
              text: typeof result.content === 'string' ? result.content : '',
              thinking: thinkingContent,
            },
          });
        } else if (data.type === 'content_block_start' && data.content_block?.type === 'tool_use') {
          // Tool use block started
          currentToolUse = {
            id: data.content_block.id,
            name: data.content_block.name,
            input: '',
          }
        } else if (data.type === 'content_block_delta' && data.delta?.type === 'input_json_delta') {
          // Tool use input delta
          if (currentToolUse) {
            currentToolUse.input += data.delta.partial_json || ''
          }
        } else if (data.type === 'content_block_stop' && currentToolUse) {
          // Tool use block ended - parse and emit
          try {
            const input = JSON.parse(currentToolUse.input)
            params.onEvent({
              type: 'TOOL_CALL',
              data: {
                id: currentToolUse.id,
                name: currentToolUse.name,
                arguments: input,
              },
            })
            // Store in result for conversation context
            if (!Array.isArray(result.content)) {
              result.content = []
            }
            result.content.push({
              type: 'tool_use',
              id: currentToolUse.id,
              name: currentToolUse.name,
              input: input,
            })
          } catch (e) {
            console.error('Failed to parse tool input:', e)
          }
          currentToolUse = null
        } else if (data.type === 'content_block_start' || data.type === 'content_block_delta') {
          if (data.delta?.text) {
            if (typeof result.content === 'string') {
              result.content += data.delta.text
            } else if (Array.isArray(result.content)) {
              // Find or create text block
              const textBlock = result.content.find((b: any) => b.type === 'text')
              if (textBlock) {
                textBlock.text = (textBlock.text || '') + data.delta.text
              } else {
                result.content.push({ type: 'text', text: data.delta.text })
              }
            } else {
              result.content = data.delta.text
            }
            params.onEvent({
              type: 'UPDATE_ANSWER',
              data: {
                text: typeof result.content === 'string' ? result.content : result.content.find((b: any) => b.type === 'text')?.text || '',
                thinking: thinkingContent || undefined,
              },
            });
          }
        } else if (data.type === 'message_stop') {
          finish()
        }
      } catch (error) {
        console.error('Error parsing SSE message:', error)
      }
    })

    if (!done) {
      finish()
    }
  }

    /**
   * modifyLastMessage:
   * conversationContext 内の最後のメッセージが assistant のものであれば、
   * その content を引数 message の内容で上書きします。
   */
  async modifyLastMessage(message: string): Promise<void> {
    if (!this.conversationContext || this.conversationContext.messages.length === 0) {
      return
    }
    const lastMessage = this.conversationContext.messages[this.conversationContext.messages.length - 1]
    if (lastMessage.role !== 'assistant') {
      return
    }
    if (typeof lastMessage.content === 'string') {
      lastMessage.content = message
    } else if (Array.isArray(lastMessage.content)) {
      // parts 配列の場合、先頭要素の text を更新できるようにする
      if (lastMessage.content.length > 0 && typeof lastMessage.content[0].text === 'string') {
        lastMessage.content[0].text = message
      } else {
        lastMessage.content = [{ type: 'text', text: message }]
      }
    }
    console.log('Claude modifyLastMessage updated to:', message)
  }

  resetConversation() {
    this.conversationContext = undefined
  }

  abstract fetchCompletionApi(messages: ChatMessage[], signal?: AbortSignal): Promise<Response>
}

export class ClaudeApiBot extends AbstractClaudeApiBot {
  private thinkingMode: boolean;

  // Define a specific type for the config needed by ClaudeApiBot
  constructor(
    private config: {
      apiKey: string;
      host: string;
      model: string;
      systemMessage: string;
      temperature: number;
      thinkingBudget?: number;
      isHostFullPath?: boolean; // Add isHostFullPath to the config type
      webAccess?: boolean;
      advancedConfig?: any;
      tools?: any[]; // Tool definitions for function calling
    },
    thinkingMode: boolean = false,
    private useCustomAuthorizationHeader: boolean = false
  ) {
    super()
    this.thinkingMode = thinkingMode;
  }

  getSystemMessage() {
    return this.config.systemMessage
  }

  setSystemMessage(systemMessage: string) {
    this.config.systemMessage = systemMessage
  }

  setTools(tools: any[]) {
    this.config.tools = tools
    console.log('[ClaudeApiBot] setTools called with:', tools)
  }

  async fetchCompletionApi(messages: ChatMessage[], signal?: AbortSignal) {
    const hasImageInput = messages.some(
      (message) => isArray(message.content) && message.content.some((part) => part.type === 'image')
    );

    const body: any = {
      model: this.getModelName(),
      messages: sanitizeMessagesForClaude(messages),
      stream: true,
      system: this.getSystemMessage(),
    }

    // Add tools if provided
    if (this.config.tools && this.config.tools.length > 0) {
      body.tools = this.config.tools;
      console.log('[ClaudeApiBot] Sending tools to API:', JSON.stringify(body.tools, null, 2))
    } else {
      console.log('[ClaudeApiBot] No tools to send')
    }

    // Add Extended Thinking configuration or temperature based on thinkingMode flag
    if (this.thinkingMode) {
      const budgetTokens = Math.max(this.config.thinkingBudget || 2000, 1024); // Minimum 1024 tokens as per Extended Thinking spec
      body.thinking = {
        type: "enabled",
        budget_tokens: budgetTokens
      };
      body.max_tokens = Math.min(budgetTokens + 12000, 64000);
      // Temperature is not compatible with Extended Thinking mode
      // Do not set temperature when thinking mode is enabled
    } else {
      body.max_tokens = hasImageInput ? 4096 : 8192;
      body.temperature = this.config.temperature; // Use config.temperature
    }

    const headers: Record<string, string> = {
      'content-type': 'application/json',
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    };

    if (this.useCustomAuthorizationHeader) {
      headers['Authorization'] = this.config.apiKey; // Use config.apiKey
    } else {
      headers['x-api-key'] = this.config.apiKey; // Use config.apiKey
    }

    if (this.config.advancedConfig?.anthropicBetaHeaders) {
      const betaValues = this.config.advancedConfig.anthropicBetaHeaders.split(',').map((v: string) => v.trim()).filter((v: string) => v);
      if (betaValues.length > 0) {
        headers['anthropic-beta'] = betaValues.join(', ');
      }
    }

    // Use values passed from CustomBot; do not read global config here
    const { host: hostValue, isHostFullPath: configIsHostFullPath } = this.config;
    const isFullPath = configIsHostFullPath ?? false;

    let fullUrlStr: string;

    if (isFullPath) {
      fullUrlStr = hostValue;
    } else {
      const api_path = 'v1/messages'; // Default path for Claude
      const baseUrl = hostValue.endsWith('/') ? hostValue.slice(0, -1) : hostValue;
      // Ensure v1 is not duplicated if already present in a non-full-path host
      if (baseUrl.endsWith('/v1')) {
        fullUrlStr = `${baseUrl.slice(0, -3)}/${api_path}`;
      } else {
        fullUrlStr = `${baseUrl}/${api_path}`;
      }
      // Clean up potential double slashes or v1/v1 issues more robustly
      fullUrlStr = fullUrlStr.replace(/([^:]\/)\/+/g, "$1"); // Replace multiple slashes with single
      fullUrlStr = fullUrlStr.replace(/\/v1\/v1\//g, "/v1/");
    }
    
    console.log('[ClaudeApiBot] Full request body:', JSON.stringify(body, null, 2))

    const resp = await fetch(fullUrlStr, {
      method: 'POST',
      signal,
      headers,
      body: JSON.stringify(body),
    })
    if (!resp.ok) {
      const statusLine = `${resp.status} ${resp.statusText || 'Error'}`;
      const errorText = await resp.text();
      let cause;
      let apiMessage = '';
      try {
        cause = JSON.parse(errorText);
        apiMessage = (cause as any)?.error?.message || (cause as any)?.error?.type || '';
      } catch (e) {
        cause = errorText;
        apiMessage = errorText.substring(0, 300);
      }
      const combinedMessage = `${statusLine}; ${apiMessage}`;

      if (apiMessage.includes('insufficient_quota')) {
        throw new ChatError(combinedMessage, ErrorCode.CLAUDE_INSUFFICIENT_QUOTA, cause);
      }
      
      throw new ChatError(combinedMessage, ErrorCode.UNKOWN_ERROR, cause);
    }
    return resp
  }

  public getModelName() {
    const { model: claudeApiModel } = this.config // Use config.model
    return claudeApiModel
  }

  get modelName(): string { // Add type annotation
    return this.config.model // Use config.model
  }

  get name(): string { // Add type annotation
    return this.thinkingMode ? `Claude (Thinking)` : `Claude` // Restore getter body
  }

  get supportsImageInput() {
    return true
  }
}

