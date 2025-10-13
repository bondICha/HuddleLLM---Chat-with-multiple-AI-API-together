import { AbstractBot, MessageParams, SendMessageParams } from '../abstract-bot'
import { streamAsyncIterable } from '~utils/stream-async-iterable'
import { ChatError, ErrorCode } from '~utils/errors'
import { generateImageViaToolFor, getClaudeClientToolsFor } from '~services/image'
import { CustomApiConfig, AdvancedConfig } from '~services/user-config'

const API_HOST = 'https://api.anthropic.com'

type ClaudeMessageContent =
  | string
  | (
      | { type: 'text'; text: string }
      | { type: 'image'; source: { type: 'base64'; media_type: string; data: string } }
      | { type: 'tool_use'; id: string; name: string; input: any }
    )[]

function parseMessage(content: ClaudeMessageContent) {
  if (typeof content === 'string') {
    return content
  }
  return content
    .map((item) => {
      if (item.type === 'text') {
        return item.text
      }
      if (item.type === 'image') {
        return `[Image: ${item.source.media_type}]`
      }
      if (item.type === 'tool_use') {
        return `[Tool use: ${item.name}]`
      }
      return ''
    })
    .join(' ')
}

class ClaudeMessage {
  role: 'user' | 'assistant'
  content: ClaudeMessageContent

  constructor(message: {
    role: 'user' | 'assistant'
    content: ClaudeMessageContent
  }) {
    this.role = message.role
    this.content = message.content
  }

  toString() {
    return `${this.role}: ${parseMessage(this.content)}`
  }
}

export class ClaudeApiBot extends AbstractBot {
  private conversationContext: { messages: ClaudeMessage[] } = { messages: [] }
  private apiKey: string
  private model: string
  private temperature: number
  private host: string
  private thinkingMode: boolean
  private isHostFullPath: boolean
  private useAuthorizationHeader: boolean
  private advancedConfig?: AdvancedConfig
  private imageToolGeneratorId?: string
  private imageToolOverrides?: Record<string, any>

  constructor(
    params: {
      apiKey: string
      model: string
      temperature: number
      host: string
      isHostFullPath: boolean
      webAccess: boolean
      thinkingBudget?: number
      advancedConfig?: AdvancedConfig
      systemMessage?: string
      imageToolGeneratorId?: string
      imageToolOverrides?: Record<string, any>
    },
    thinkingMode: boolean = false,
    useAuthorizationHeader: boolean = false,
  ) {
    super()
    this.apiKey = params.apiKey
    this.model = params.model
    this.temperature = params.temperature
    this.host = params.host
    this.isHostFullPath = params.isHostFullPath
    this.thinkingMode = thinkingMode
    this.useAuthorizationHeader = useAuthorizationHeader
    this.advancedConfig = params.advancedConfig
    this.imageToolGeneratorId = params.imageToolGeneratorId
    this.imageToolOverrides = params.imageToolOverrides
    if (params.systemMessage) {
      this.setSystemMessage(params.systemMessage)
    }
  }

  get name() {
    return `Claude (API)`
  }

  get chatBotName() {
    return `Claude (API)`
  }

  get modelName() {
    return this.model
  }

  setSystemMessage(systemMessage: string) {
    // The first message in the conversation is the system message
    if (this.conversationContext.messages.length > 0 && this.conversationContext.messages[0].role === 'user') {
      const firstMessageContent = this.conversationContext.messages[0].content
      if (typeof firstMessageContent === 'string' && firstMessageContent.startsWith('System Prompt:')) {
        this.conversationContext.messages.shift()
      }
    }
    if (systemMessage && systemMessage.trim().length > 0) {
      this.conversationContext.messages.unshift(new ClaudeMessage({ role: 'user', content: [{ type: 'text', text: `System Prompt: ${systemMessage}` }] }))
    }
  }

  resetConversation() {
    this.conversationContext = { messages: [] }
  }

  async doSendMessage(params: SendMessageParams) {
    if (!this.apiKey) {
      throw new ChatError('API key not set', ErrorCode.API_KEY_NOT_SET)
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'anthropic-version': '2023-06-01',
    }
    if (this.useAuthorizationHeader) {
      headers['Authorization'] = `Bearer ${this.apiKey}`
    } else {
      headers['x-api-key'] = this.apiKey
    }

    if (this.advancedConfig?.anthropicBetaHeaders) {
      this.advancedConfig.anthropicBetaHeaders.split(';').forEach((h) => {
        const [k, v] = h.split(':')
        if (k && v) headers[k.trim()] = v.trim()
      })
    }

    const userMessage = new ClaudeMessage({ role: 'user', content: [{ type: 'text', text: params.prompt }] })
    this.conversationContext.messages.push(userMessage)

    const apiHost = this.host || API_HOST
    const endpoint = this.isHostFullPath ? apiHost : `${apiHost}/v1/messages`

    const tools = await getClaudeClientToolsFor(this.imageToolGeneratorId)

    const body = {
      model: this.model,
      messages: this.conversationContext.messages,
      temperature: this.temperature,
      stream: true,
      max_tokens: 4096, // TODO: make this configurable
      ...(tools && { tools }),
    }

    const resp = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: params.signal,
    })

    if (!resp.ok) {
      const errorData = await resp.json()
      throw new ChatError(errorData.error.message, ErrorCode.UNKOWN_ERROR)
    }

    const stream = resp.body!
    const reader = stream.getReader()
    const decoder = new TextDecoder('utf-8')

    let result: { role: 'assistant'; content: ClaudeMessageContent } = { role: 'assistant', content: [] }
    let done = false
    let contentBlocks: any[] = []

    while (!done) {
      const { value, done: readerDone } = await reader.read()
      if (value) {
        const char = decoder.decode(value)
        for (const line of char.split('\n')) {
          if (line.startsWith('data: ')) {
            const data = JSON.parse(line.slice(6))
            if (data.type === 'content_block_start') {
              contentBlocks[data.index] = data.content_block
              if (data.content_block.type === 'tool_use') {
                contentBlocks[data.index].input = ''
              }
            } else if (data.type === 'content_block_delta') {
              const block = contentBlocks[data.index]
              if (block) {
                if (data.delta.type === 'text_delta') {
                  if (!block.text) {
                    block.text = ''
                  }
                  block.text += data.delta.text
                } else if (data.delta.type === 'input_json_delta') {
                  if (!block.input) {
                    block.input = ''
                  }
                  block.input += data.delta.partial_json
                }
              }
            } else if (data.type === 'message_delta') {
              if (data.delta.stop_reason) {
                done = true
              }
            } else if (data.type === 'message_stop') {
              done = true
            }
          }
        }
        result.content = contentBlocks.map(b => {
          if (b.type === 'text') return { type: 'text', text: b.text }
          if (b.type === 'tool_use') {
            try {
              return { type: 'tool_use', id: b.id, name: b.name, input: JSON.parse(b.input) }
            } catch (e) {
              console.error('Failed to parse tool_use input', e)
              return { type: 'tool_use', id: b.id, name: b.name, input: {} }
            }
          }
          return b
        })
        params.onEvent({ type: 'UPDATE_ANSWER', data: { text: parseMessage(result.content) } })
      }
      if (readerDone) {
        done = true
      }
    }

    this.conversationContext.messages.push(new ClaudeMessage(result))

    const finish = async () => {
      params.onEvent({ type: 'DONE' })
    }

    // Check for tool calls
    const lastMessage = this.conversationContext.messages[this.conversationContext.messages.length - 1]
    const pendingToolUse = (Array.isArray(lastMessage.content) ? lastMessage.content : []).find(
      (c: any) => c.type === 'tool_use' && (c.name === 'chutes_generate_image' || c.name === 'seedream_generate_image'),
    )
    if (pendingToolUse && pendingToolUse.type === 'tool_use') {
      try {
        const toolInput = pendingToolUse.input || {}
        // If model is fixed, inject it into the input
        try {
          const tools = await getClaudeClientToolsFor((this as any).imageToolGeneratorId)
          const t = tools?.find((t: any) => t.name === pendingToolUse.name)
          const gm = t?.input_schema?.properties?.model?.enum?.[0]
          if (gm) {
            if (gm) (toolInput as any).model = gm
          }
        } catch {}
        // Render tool call JSON into the chat message for transparency
        try {
          const debugMd = ['\n\nTool Call', '```json', JSON.stringify({ name: pendingToolUse.name, input: toolInput }, null, 2), '```'].join('\n')
          if (Array.isArray(result.content)) {
            result.content.push({ type: 'text', text: debugMd })
          }
          params.onEvent({ type: 'UPDATE_ANSWER', data: { text: parseMessage(result.content) } })
        } catch {}
        const rawPrompt = (typeof toolInput.prompt === 'string' ? toolInput.prompt : '')
        const fallbackPrompt = (params as any).rawUserInput || params.prompt || ''
        const finalPrompt = (rawPrompt && rawPrompt.trim().length > 0) ? rawPrompt : fallbackPrompt
        const usedFallback = ((!rawPrompt || rawPrompt.trim().length === 0) && (fallbackPrompt && fallbackPrompt.trim().length > 0))
        if (usedFallback) {
          try {
            const note = '\n\n_Note_: Tool input had empty prompt; used user input as prompt.'
            if (Array.isArray(result.content)) {
              result.content.push({ type: 'text', text: note })
            }
            params.onEvent({ type: 'UPDATE_ANSWER', data: { text: parseMessage(result.content) } })
          } catch {}
        }
        const md = await generateImageViaToolFor(
          (this as any).imageToolGeneratorId,
          pendingToolUse.name === 'chutes_generate_image'
            ? {
                prompt: finalPrompt,
                negative_prompt: toolInput.negative_prompt,
                width: toolInput.width,
                height: toolInput.height,
                num_inference_steps: toolInput.num_inference_steps,
                guidance_scale: toolInput.guidance_scale,
                // seed optional
              }
            : {
                prompt: finalPrompt,
                size: toolInput.size,
                sequential_image_generation: toolInput.sequential_image_generation,
                max_images: toolInput.max_images,
                watermark: toolInput.watermark,
              },
          params.signal,
          { overrides: (this as any).imageToolOverrides || undefined },
        )
        const appended = `\n\n${md}`
        if (Array.isArray(result.content)) {
          result.content.push({ type: 'text', text: appended })
        }
        params.onEvent({ type: 'UPDATE_ANSWER', data: { text: parseMessage(result.content) } })
      } catch (err: any) {
        const warn = `\n\n[Image tool failed: ${err?.message || 'unknown error'}]`
        if (Array.isArray(result.content)) {
          result.content.push({ type: 'text', text: warn })
        }
        params.onEvent({ type: 'UPDATE_ANSWER', data: { text: parseMessage(result.content) } })
      }
    }

    if (!done) finish()
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
      const textPart = lastMessage.content.find(p => p.type === 'text')
      if (textPart && textPart.type === 'text') {
        textPart.text = message
      } else {
        lastMessage.content = [{ type: 'text', text: message }]
      }
    }
    console.log('Claude modifyLastMessage updated to:', message)
  }
}
