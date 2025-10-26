import { AbstractBot, SendMessageParams, ConversationHistory, Event } from '../abstract-bot'
import { ChatError, ErrorCode } from '~utils/errors'
import { getUserConfig, CustomApiProvider } from '~services/user-config'
import { generateWithChutes, generateWithNovita, IMAGE_GENERATION_TOOL_CLAUDE } from '~services/image-tools'
import { createBotInstance } from '..'

/**
 * Agentic Image Bot (Tool-use based)
 *
 * This bot acts as a wrapper that:
 * 1. Takes a Prompt Generator Bot (e.g., Claude, GPT)
 * 2. Adds image generation tool definition to it
 * 3. Intercepts tool calls and generates images
 * 4. Returns images to the user
 */
export class ImageAgentBot extends AbstractBot {
  private conversationContext?: ConversationHistory

  constructor(private botIndex: number) {
    super()
  }

  get supportsImageInput() {
    return false // Focus on text-to-image for now
  }

  public setConversationHistory(history: ConversationHistory): void {
    this.conversationContext = history
  }

  public getConversationHistory(): ConversationHistory | undefined {
    return this.conversationContext
  }

  resetConversation(): void {
    this.conversationContext = undefined
  }

  async doSendMessage(params: SendMessageParams): Promise<void> {
    try {
      const cfg = await getUserConfig()
      const custom = cfg.customApiConfigs[this.botIndex]
      if (!custom) throw new ChatError('Invalid bot index for ImageAgent', ErrorCode.CUSTOMBOT_CONFIGURATION_ERROR)

      const settings = custom.agenticImageBotSettings || {}

      // Get Image Provider settings
      const imageProviderRef = settings.imageGeneratorProviderId
        ? (cfg.providerConfigs || []).find(p => p.id === settings.imageGeneratorProviderId)
        : undefined

      if (!imageProviderRef) {
        throw new ChatError('Image Provider not configured for Image Agent', ErrorCode.CUSTOMBOT_CONFIGURATION_ERROR)
      }

      const imageApiKey = imageProviderRef.apiKey
      const imageHost = imageProviderRef.host
      const imageModel = custom.model || 'FLUX.1-dev'
      const imageDialect = custom.imageScheme || (imageProviderRef as any).imageDialect || 'sd'

      if (!imageApiKey) {
        throw new ChatError('Image Provider API key not set', ErrorCode.CUSTOMBOT_CONFIGURATION_ERROR)
      }

      // Get Prompt Generator Bot
      const promptGenIndex = settings.promptGeneratorBotIndex
      if (typeof promptGenIndex !== 'number' || promptGenIndex < 0) {
        throw new ChatError('Prompt Generator Bot not configured', ErrorCode.CUSTOMBOT_CONFIGURATION_ERROR)
      }

      const promptBot = createBotInstance(promptGenIndex)
      if (!promptBot) {
        throw new ChatError('Failed to create Prompt Generator Bot', ErrorCode.CUSTOMBOT_CONFIGURATION_ERROR)
      }

      // Add tool definition to the bot (only Claude supported for now)
      const promptBotConfig = cfg.customApiConfigs[promptGenIndex]
      const providerRef = promptBotConfig.providerRefId
        ? (cfg.providerConfigs || []).find(p => p.id === promptBotConfig.providerRefId)
        : undefined
      const effectiveProvider = providerRef?.provider ?? promptBotConfig.provider

      if (effectiveProvider !== CustomApiProvider.Anthropic && effectiveProvider !== CustomApiProvider.VertexAI_Claude) {
        throw new ChatError('Image Agent currently only supports Claude as Prompt Generator Bot', ErrorCode.CUSTOMBOT_CONFIGURATION_ERROR)
      }

      // Inject tools into the bot and modify system prompt
      if (typeof (promptBot as any).setTools === 'function') {
        (promptBot as any).setTools([IMAGE_GENERATION_TOOL_CLAUDE])
      }

      const originalSystemMessage = (promptBot as any).getSystemMessage?.() || ''
      const toolInstruction = `\n\nYou have access to an image generation tool called 'generate_image'. When the user asks you to create, generate, make, or show an image, you MUST use this tool. Do not describe or imagine the image in text - actually generate it using the tool.`
      if (typeof (promptBot as any).setSystemMessage === 'function') {
        if (!originalSystemMessage.includes(`generate_image`)) {
          (promptBot as any).setSystemMessage(originalSystemMessage + toolInstruction)
        }
      }

      // Set conversation history
      if (this.conversationContext) {
        promptBot.setConversationHistory(this.conversationContext)
      }

      let toolCallDetected = false
      let lastTextUpdate = ''

      const overrides = custom.imageGeneration

      const wrappedParams: SendMessageParams = {
        ...params,
        onEvent: async (event: Event) => {
          if (event.type === 'TOOL_CALL') {
            toolCallDetected = true
            const { id, name, arguments: args } = event.data

            if (name !== 'generate_image') {
              params.onEvent({
                type: 'ERROR',
                error: new ChatError(`Unknown tool: ${name}`, ErrorCode.UNKOWN_ERROR),
              })
              return
            }

            try {
              // Extract parameters
              const prompt = args.prompt || params.prompt
              const negativePrompt = args.negative_prompt || settings.negativePrompt || overrides?.negativePrompt
              const width = args.width || settings.defaultWidth || overrides?.defaultWidth || 1024
              const height = args.height || settings.defaultHeight || overrides?.defaultHeight || 1024
              const steps = args.steps || settings.inferenceSteps || overrides?.inferenceSteps || 20
              const guidanceScale = args.guidance_scale || settings.guidanceScale || overrides?.guidanceScale || 7.5
              const seed = args.seed ?? settings.seed ?? overrides?.seed

              // Prepare generation parameters
              const generationParams: any = {
                model: imageModel,
                prompt,
                width,
                height,
                num_inference_steps: steps,
                guidance_scale: guidanceScale,
              }
              if (negativePrompt) generationParams.negative_prompt = negativePrompt
              if (typeof seed === 'number') generationParams.seed = seed

              // Generate image
              let imageUrl = ''
              if (imageDialect === 'sd' || /chutes/i.test(imageHost || '')) {
                imageUrl = await generateWithChutes({
                  host: imageHost,
                  apiKey: imageApiKey,
                  model: imageModel,
                  prompt,
                  negativePrompt,
                  width,
                  height,
                  steps,
                  guidanceScale,
                  seed,
                  signal: params.signal,
                })
              } else if (imageDialect === 'novita' || /novita/i.test(imageHost || '')) {
                imageUrl = await generateWithNovita({
                  host: imageHost,
                  apiKey: imageApiKey,
                  model: imageModel,
                  prompt,
                  negativePrompt,
                  width,
                  height,
                  steps,
                  guidanceScale,
                  seed,
                  signal: params.signal,
                })
              } else {
                throw new ChatError(`Unsupported image dialect: ${imageDialect}`, ErrorCode.UNKOWN_ERROR)
              }

              // Return image as markdown
              const markdown = `![Generated Image](${imageUrl})`

              // Show generation parameters
              const paramsJson = `\`\`\`json\n${JSON.stringify(generationParams, null, 2)}\n\`\`\``

              // Update with any text that came before + image + params
              const finalText = lastTextUpdate
                ? `${lastTextUpdate}\n\n${markdown}\n\n${paramsJson}`
                : `${markdown}\n\n${paramsJson}`

              params.onEvent({
                type: 'UPDATE_ANSWER',
                data: { text: finalText },
              })

              params.onEvent({ type: 'DONE' })
            } catch (error) {
              params.onEvent({
                type: 'ERROR',
                error: error instanceof ChatError ? error : new ChatError(String(error), ErrorCode.UNKOWN_ERROR),
              })
            }
          } else if (event.type === 'UPDATE_ANSWER') {
            // Store text updates in case there's text before tool call
            lastTextUpdate = event.data.text || ''
            // Forward text updates
            params.onEvent(event)
          } else if (event.type === 'DONE') {
            // Don't forward DONE from promptBot - we'll send it ourselves after tool call completes
            // (or at the end if no tool call occurred)
            return
          } else {
            // Forward other events (ERROR, etc.)
            params.onEvent(event)
          }
        },
      }

      // Call the prompt bot
      await promptBot.doSendMessage(wrappedParams)

      if (!toolCallDetected) {
        params.onEvent({ type: 'DONE' })
      }

      if (typeof (promptBot as any).getConversationHistory === 'function') {
        const updatedHistory = (promptBot as any).getConversationHistory()
        if (updatedHistory) {
          this.conversationContext = updatedHistory
        }
      }

      if (typeof (promptBot as any).setSystemMessage === 'function') {
        (promptBot as any).setSystemMessage(originalSystemMessage)
      }

      if (typeof (promptBot as any).setTools === 'function') {
        (promptBot as any).setTools([])
      }
    } catch (error) {
      params.onEvent({
        type: 'ERROR',
        error: error instanceof ChatError ? error : new ChatError(String(error), ErrorCode.UNKOWN_ERROR),
      })
    }
  }
}
