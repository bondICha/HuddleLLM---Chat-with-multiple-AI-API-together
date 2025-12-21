import { GoogleGenAI, Content, Part, GenerateContentConfig, HttpOptions } from '@google/genai'
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
  /** Optional custom base URL for advanced routing (e.g., gateways) */
  baseUrl?: string;
  /** Optional API version override when using custom baseUrl */
  apiVersion?: string;
  /** Optional extra HTTP headers (e.g., Authorization for gateways) */
  extraHeaders?: Record<string, string>;
  /** Enable Vertex AI mode (required for Rakuten AI Gateway and other Vertex AI gateways) */
  vertexai?: boolean;
  /** Enable thinking mode (Gemini 2.5+/3+ models) */
  thinkingMode?: boolean;
  /** Thinking budget (Gemini 2.5 models: token count, -1 for dynamic) */
  thinkingBudget?: number;
  /** Thinking level (Gemini 3+ models: 'low' or 'high') */
  thinkingLevel?: 'low' | 'high';
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

  // Subclasses can override this to enable native web tools (e.g., google_search)
  // based on their own configuration.
  protected getWebAccessEnabled(): boolean {
    return false
  }

  // Subclasses can override this to enable thinking mode
  protected getThinkingModeEnabled(): boolean {
    return false
  }

  // Subclasses can override to provide thinking level (Gemini 3+)
  protected getThinkingLevel(): 'low' | 'high' | undefined {
    return undefined
  }

  // Subclasses can override to provide thinking budget (Gemini 2.5)
  protected getThinkingBudget(): number | undefined {
    return undefined
  }

  // Subclasses can override to provide custom tools for function calling
  protected getCustomTools(): any[] | undefined {
    return undefined
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

  private async buildUserContent(prompt: string, images?: File[], audioFiles?: File[]): Promise<Content> {
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

    if (audioFiles && audioFiles.length > 0) {
      for (const audio of audioFiles) {
        const base64data = await file2base64(audio);
        parts.push({
          inlineData: {
            data: base64data.replace(/^data:.+;base64,/, ''),
            mimeType: audio.type,
          },
        });
      }
    }

    parts.push({ text: prompt });
    return { role: 'user', parts };
  }

  abstract getSystemInstruction(): Content | undefined
  abstract getGenerationConfig(): GenerateContentConfig
  abstract getModelName(): string

  async doSendMessage(params: SendMessageParams) {
    if (!this.conversationContext) {
      this.conversationContext = { messages: [] }
    }

    const userMessage = await this.buildUserContent(params.rawUserInput || params.prompt, params.images, params.audioFiles);
    
    const history = this.conversationContext.messages.slice(-CONTEXT_SIZE);
    const contents = [...history, userMessage];

    try {
      const systemInstruction = this.getSystemInstruction()
      const config: GenerateContentConfig = this.getGenerationConfig() || {}

      if (systemInstruction) {
        config.systemInstruction = systemInstruction
      }

      // Build tools array: combine custom tools (e.g., from Image Agent) + googleSearch
      const toolsArray: any[] = []

      // Add custom tools if set via setTools()
      const customTools = this.getCustomTools()
      if (customTools && customTools.length > 0) {
        toolsArray.push(...customTools)
      }

      // Add Google Search if enabled
      if (this.getWebAccessEnabled()) {
        const hasGoogleSearch = toolsArray.some((t: any) => t?.googleSearch !== undefined)
        if (!hasGoogleSearch) {
          toolsArray.push({ googleSearch: {} })
        }
      }

      // Apply tools to config
      if (toolsArray.length > 0) {
        ;(config as any).tools = toolsArray
      }

      // Enable thinking mode with thoughts output (only when thinking mode is enabled)
      if (this.getThinkingModeEnabled()) {
        const thinkingConfig: any = { includeThoughts: true }

        // Determine if model is Gemini 3 (uses thinkingLevel) or Gemini 2.5 (uses thinkingBudget)
        const modelName = this.getModelName()
        const isGemini3 = modelName.includes('gemini-3')

        if (isGemini3) {
          // Gemini 3+: use thinkingLevel (default: 'high')
          thinkingConfig.thinkingLevel = this.getThinkingLevel() || 'high'
        } else {
          // Gemini 2.5: use thinkingBudget (if specified)
          const budget = this.getThinkingBudget()
          if (budget !== undefined) {
            thinkingConfig.thinkingBudget = budget
          }
        }

        ;(config as any).thinkingConfig = thinkingConfig
      }

      const requestParams = {
        model: this.getModelName(),
        contents,
        config,
      }

      const result = await this.genAI.models.generateContentStream(requestParams);

      this.conversationContext.messages.push(userMessage);

      let responseText = '';
      let thinkingText = '';
      let lastChunk: any = null;
      for await (const chunk of result) {
        lastChunk = chunk
        // Process all parts in the chunk to separate thoughts from answer
        const candidates = (chunk as any).candidates || []
        const parts = candidates[0]?.content?.parts || []

        for (const part of parts) {
          if (part.thought) {
            // This is thinking content
            thinkingText += part.text || ''
          } else if (part.text) {
            // This is answer content
            responseText += part.text
          }
        }

        params.onEvent({
          type: 'UPDATE_ANSWER',
          data: {
            text: responseText,
            thinking: thinkingText || undefined
          }
        })
      }

      // After streaming completes, attempt to extract inline image data and grounding URLs
      let imageMarkdown = ''
      const referenceUrls: { url: string; title?: string }[] = []

      try {
        const cand = (lastChunk?.candidates && Array.isArray((lastChunk as any).candidates))
          ? (lastChunk as any).candidates[0]
          : undefined

        // Extract inline images
        const parts = cand?.content?.parts || []
        const imgBuf: string[] = []
        for (const p of parts as any[]) {
          if (p?.inlineData?.data) {
            const mime = p?.inlineData?.mimeType || 'image/png'
            const b64 = String(p.inlineData.data)
            imgBuf.push(`![image](data:${mime};base64,${b64})`)
          }
        }
        if (imgBuf.length) {
          imageMarkdown = `\n\n${imgBuf.join('\n\n')}`
        }

        // Extract grounding URLs from groundingMetadata
        const groundingMeta = cand?.groundingMetadata
        if (groundingMeta?.groundingChunks) {
          for (const chunk of groundingMeta.groundingChunks) {
            if (chunk?.web?.uri) {
              referenceUrls.push({
                url: chunk.web.uri,
                title: chunk.web.title || undefined
              })
            }
          }
        }
      } catch {
        // ignore parsing errors; text fallback will still work
      }

      if (imageMarkdown || referenceUrls.length > 0) {
        const finalText = (responseText + imageMarkdown).trim() || i18n.t('image_only_response')
        params.onEvent({
          type: 'UPDATE_ANSWER',
          data: {
            text: finalText,
            thinking: thinkingText || undefined,
            referenceUrls: referenceUrls.length > 0 ? referenceUrls : undefined
          }
        })
      } else if (!responseText) {
        // Empty response
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
  private customTools?: any[];

  constructor(options: GeminiApiBotOptions) {
    const httpOptions: HttpOptions | undefined = (() => {
      const headers: Record<string, string> = options.extraHeaders || {}
      const hasBaseUrl = !!options.baseUrl && options.baseUrl.trim().length > 0

      if (!hasBaseUrl && Object.keys(headers).length === 0 && !options.apiVersion) {
        return undefined
      }

      const result: HttpOptions = {}
      if (hasBaseUrl) {
        result.baseUrl = options.baseUrl
        // For Vertex AI mode, explicitly set empty api_version to prevent SDK from appending default version
        if (options.vertexai) {
          result.apiVersion = options.apiVersion ?? ''
        } else if (options.apiVersion !== undefined) {
          result.apiVersion = options.apiVersion
        }
      }
      if (Object.keys(headers).length > 0) {
        result.headers = headers
      }
      return result
    })()

    const genAI = new GoogleGenAI({
      apiKey: options.geminiApiKey,
      vertexai: options.vertexai ?? false,
      httpOptions,
    });
    super(genAI);
    this.config = options;
  }

  protected getWebAccessEnabled(): boolean {
    return !!this.config.webAccess
  }

  protected getThinkingModeEnabled(): boolean {
    return !!this.config.thinkingMode
  }

  protected getThinkingLevel(): 'low' | 'high' | undefined {
    return this.config.thinkingLevel
  }

  protected getThinkingBudget(): number | undefined {
    return this.config.thinkingBudget
  }

  protected getCustomTools(): any[] | undefined {
    return this.customTools
  }

  // Called via AsyncAbstractBot.setWebAccessEnabled when Web Access is toggled at runtime
  setWebAccessEnabled(enabled: boolean) {
    this.config.webAccess = enabled
  }

  // Set custom tools for function calling (e.g., image generation tools from Image Agent)
  setTools(tools: any[]) {
    this.customTools = tools
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

  getGenerationConfig(): GenerateContentConfig {
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

  get supportsAudioInput() {
    return true;
  }
}
