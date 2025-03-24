import { isArray } from 'lodash-es'
import { DEFAULT_CLAUDE_SYSTEM_MESSAGE } from '~app/consts'
import { requestHostPermission } from '~app/utils/permissions'
import { ClaudeAPIModel, UserConfig } from '~services/user-config'
import { ChatError, ErrorCode } from '~utils/errors'
import { parseSSEResponse } from '~utils/sse'
import { AbstractBot, SendMessageParams, ConversationHistory } from '../abstract-bot'
import { file2base64 } from '../bing/utils'
import { ChatMessageModel } from '~types'
import { uuid } from '~utils'

interface ChatMessage {
  role: string
  content: string | { type: string; [key: string]: any }[]
}

interface ConversationContext {
  messages: ChatMessage[]
}

const CONTEXT_SIZE = 40

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

  private buildUserMessage(prompt: string, imageUrl?: string): ChatMessage {

    if (!imageUrl) {
      return { role: 'user', content: prompt }
    }
    return {
      role: 'user',
      content: [
        { type: 'text', text: prompt },
        { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: imageUrl } },
      ],
    }
  }

    private buildMessages(prompt: string, imageUrl?: string): ChatMessage[] {
      return [
        ...this.conversationContext!.messages.slice(-(CONTEXT_SIZE + 1)),
        this.buildUserMessage(prompt, imageUrl),
      ]
    }

  getSystemMessage() {
    return DEFAULT_CLAUDE_SYSTEM_MESSAGE
  }

  async doSendMessage(params: SendMessageParams) {
    if (!this.conversationContext) {
      this.conversationContext = { messages: [] }
    }

    let imageUrl: string | undefined
    if (params.image) {
      imageUrl = await file2base64(params.image)
    }

    const resp = await this.fetchCompletionApi(this.buildMessages(params.prompt, imageUrl), params.signal)

    // add user message to context only after fetch success
    this.conversationContext.messages.push(this.buildUserMessage(params.rawUserInput || params.prompt, imageUrl))

    let done = false
    const result: ChatMessage = { role: 'assistant', content: '' }
    let thinkingContent = '';

    const finish = () => {
      done = true
      params.onEvent({ type: 'DONE' })
      const messages = this.conversationContext!.messages
      messages.push(result)
    }

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
        } else if (data.type === 'content_block_start' || data.type === 'content_block_delta') {
          if (data.delta?.text) {
            if (typeof result.content === 'string') {
              result.content += data.delta.text
            } else {
              result.content = data.delta.text
            }
            params.onEvent({
              type: 'UPDATE_ANSWER',
              data: {
                text: typeof result.content === 'string' ? result.content : '',
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

  constructor(
    private config: Pick<
      UserConfig,
      'claudeApiKey' | 'claudeApiHost' | 'claudeApiModel' | 'claudeApiSystemMessage' | 'claudeApiTemperature' | 'claudeThinkingBudget'
    >,
    thinkingMode: boolean = false
  ) {
    super()
    this.thinkingMode = thinkingMode;
  }

  getSystemMessage() {
    const currentDate = new Date().toISOString().split('T')[0]
    const systemMessage = this.config.claudeApiSystemMessage.replace('{current_date}', currentDate)  || DEFAULT_CLAUDE_SYSTEM_MESSAGE
    return systemMessage
  }

  async fetchCompletionApi(messages: ChatMessage[], signal?: AbortSignal) {
    const hasImageInput = messages.some(
      (message) => isArray(message.content) && message.content.some((part) => part.type === 'image')
    );

    const body: any = {
      model: this.getModelName(),
      messages,
      max_tokens: hasImageInput ? 4096 : 8192,
      stream: true,
      system: this.getSystemMessage(),
    }

    // Add reasoning configuration or temperature based on thinkingMode flag
    if (this.thinkingMode) {
      body.thinking = {
        type: "enabled",
        budget_tokens: this.config.claudeThinkingBudget || 2000
      };
      // Temperature is not used in Thinking Mode, so set to undefined
      body.temperature = undefined;
    } else {
      body.temperature = this.config.claudeApiTemperature;
    }

    const resp = await fetch(`${this.config.claudeApiHost}/v1/messages`, {
      method: 'POST',
      signal,
      headers: {
        'content-type': 'application/json',
        'x-api-key': this.config.claudeApiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify(body),
    })
    if (!resp.ok) {
      const error = await resp.text()
      if (error.includes('insufficient_quota')) {
        throw new ChatError('Insufficient Claude API usage quota', ErrorCode.CLAUDE_INSUFFICIENT_QUOTA)
      }
      }
    return resp
  }

  public getModelName() {
    const { claudeApiModel } = this.config
    return claudeApiModel
  }

  get modelName() {
    return this.config.claudeApiModel
  }

  get name() {
    return this.thinkingMode ? `Claude (Thinking)` : `Claude (API)`
  }

  get supportsImageInput() {
    return true
  }
}
