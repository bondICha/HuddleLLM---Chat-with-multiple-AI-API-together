import { GoogleGenAI, Content, Part, GenerationConfig } from '@google/genai'
import { ChatError, ErrorCode } from '~utils/errors'
import { AbstractBot, SendMessageParams, ConversationHistory } from '../abstract-bot'
import { file2base64 } from '~app/utils/file-utils'
import { ChatMessageModel } from '~types'
import { uuid } from '~utils'
import { getUserLocaleInfo } from '~utils/system-prompt-variables'
import i18n from '~app/i18n'

// GeminiApiBotのコンストラクタに渡すオプションの型定義
interface GeminiApiBotOptions {
  geminiApiKey: string;
  geminiApiModel: string;
  geminiApiSystemMessage?: string;
  geminiApiTemperature?: number;
  webAccess?: boolean;
}

interface ConversationContext {
  messages: Content[]
}

const CONTEXT_SIZE = 120

export abstract class AbstractGeminiApiBot extends AbstractBot {
  private conversationContext?: ConversationContext
  protected genAI!: GoogleGenAI

  constructor(genAI: GoogleGenAI) {
    super()
    this.genAI = genAI
  }

  // ConversationHistoryインターフェースの実装
  public async setConversationHistory(history: ConversationHistory): Promise<void> {
    if (history.messages && Array.isArray(history.messages)) {
      const messages: Content[] = history.messages.map(msg => {
        // TODO: Handle images in history
        if (msg.author === 'user') {
          return {
            role: 'user',
            parts: [{ text: msg.text }]
          };
        } else {
          return {
            role: 'model',
            parts: [{ text: msg.text }]
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
    
    const messages = this.conversationContext.messages.map(msg => {
      const role = msg.role === 'user' ? 'user' : 'assistant';
      let text = '';
      
      const textPart = msg.parts?.find(part => 'text' in part) as Part | undefined;
      if (textPart && 'text' in textPart) {
        text = textPart.text || '';
      }
      
      return {
        id: uuid(),
        author: role,
        text: text
        // TODO: Handle images in history
      };
    });
    
    return { messages };
  }

  private async buildUserContent(prompt: string, images?: File[]): Promise<Content> {
    const parts: Part[] = [];
    
    if (images && images.length > 0) {
        for (const image of images) {
            const base64data = await file2base64(image);
            parts.push({
                inlineData: {
                    data: base64data.replace(/^data:.+;base64,/, ''),
                    mimeType: image.type,
                },
            });
        }
    }

    parts.push({ text: prompt });
    return { role: 'user', parts };
  }

  abstract getSystemInstruction(): Content | undefined
  abstract getGenerationConfig(): GenerationConfig
  abstract getModelName(): string

  async doSendMessage(params: SendMessageParams) {
    if (!this.conversationContext) {
      this.conversationContext = { messages: [] }
    }

    const userMessage = await this.buildUserContent(params.rawUserInput || params.prompt, params.images);
    
    const history = this.conversationContext.messages.slice(-CONTEXT_SIZE);
    const contents = [...history, userMessage];

    try {
      const systemInstruction = this.getSystemInstruction();
      const generationConfig = this.getGenerationConfig();

      const requestParams: any = {
        model: this.getModelName(),
        contents,
        generationConfig,
      };

      if (systemInstruction?.parts?.[0]?.text) {
        requestParams.systemInstruction = systemInstruction.parts[0].text;
      }

      const result = await this.genAI.models.generateContentStream(requestParams);

      this.conversationContext.messages.push(userMessage);

      let responseText = '';
      for await (const chunk of result) {
        const chunkText = chunk.text
        console.debug('gemini stream', chunkText)
        responseText += chunkText
        params.onEvent({ type: 'UPDATE_ANSWER', data: { text: responseText } })
      }

      if (!responseText) {
        params.onEvent({ type: 'UPDATE_ANSWER', data: { text: i18n.t('image_only_response') } })
      }

      params.onEvent({ type: 'DONE' })
      this.conversationContext.messages.push({ role: 'model', parts: [{ text: responseText }] })

    } catch (error) {
      console.error('Gemini API error:', error);
      const err = error as any;
      let finalCause = err;
      let finalMessage = err.message || err.toString();

      // Check for nested JSON string in error message
      if (err.message && typeof err.message === 'string') {
        try {
          const nestedError = JSON.parse(err.message);
          if (nestedError.error) {
            finalCause = nestedError.error;
            finalMessage = nestedError.error.message || finalMessage;
          }
        } catch (e) {
          // Not a JSON string, do nothing
        }
      }
      
      const statusLine = `[GoogleGenerativeAI Error]`;
      const combinedMessage = `${statusLine}; ${finalMessage}`;

      params.onEvent({ type: 'ERROR', error: new ChatError(combinedMessage, ErrorCode.GEMINI_API_ERROR, finalCause) });
    }
  }

  async modifyLastMessage(message: string): Promise<void> {
    if (!this.conversationContext || this.conversationContext.messages.length === 0) {
      return
    }
    const lastMessage = this.conversationContext.messages[this.conversationContext.messages.length - 1]
    if (lastMessage.role !== 'model') {
      return
    }
    lastMessage.parts = [{ text: message }]
  }

  resetConversation() {
    this.conversationContext = undefined
  }
}

export class GeminiApiBot extends AbstractGeminiApiBot {
  private config: GeminiApiBotOptions;

  constructor(options: GeminiApiBotOptions) {
    const genAI = new GoogleGenAI({ apiKey: options.geminiApiKey });
    super(genAI);
    this.config = options;
  }

  getSystemInstruction(): Content | undefined {
    if (!this.config.geminiApiSystemMessage) {
      return undefined;
    }
    // The new SDK expects system instruction as a top-level parameter, not in contents
    return { role: 'system', parts: [{ text: this.config.geminiApiSystemMessage }] };
  }

  setSystemMessage(systemMessage: string) {
    this.config.geminiApiSystemMessage = systemMessage
  }

  getGenerationConfig(): GenerationConfig {
    return {
      temperature: this.config.geminiApiTemperature ?? 0.4,
    };
  }

  public getModelName(): string {
    return this.config.geminiApiModel;
  }
  
  get modelName(): string {
    return this.config.geminiApiModel;
  }

  get name() {
    return `Gemini (API)`
  }

  get supportsImageInput() {
    return true;
  }
}
