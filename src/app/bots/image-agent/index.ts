import { AbstractBot, SendMessageParams, ConversationHistory, Event } from '../abstract-bot'
import { ChatError, ErrorCode } from '~utils/errors'
import { getUserConfig, CustomApiProvider } from '~services/user-config'
import { getDefaultToolDefinition } from '~services/image-tool-definitions'
import { generateImage } from '~services/image-api-client'
import { createBotInstance } from '..'

/**
 * Agentic Image Bot (Tool-use based)
 *
 * This bot acts as a wrapper that:
 * 1. Takes a Prompt Generator Bot (e.g., Claude, GPT)
 * 2. Adds image generation tool definition to it
 * 3. Passes user images to Prompt Bot (for Edit support or visual understanding)
 * 4. Intercepts tool calls and generates images
 * 5. Returns images to the user
 *
 * ARCHITECTURE:
 * - Tool definitions are model-specific (defined in image-tool-definitions.ts)
 * - Tool call arguments are passed directly to the API (no parameter mapping)
 * - Edit support is determined by the tool definition metadata
 * - For non-Edit models, Claude sees images and describes them in text prompt instead
 */
export class ImageAgentBot extends AbstractBot {
  private conversationContext?: ConversationHistory

  constructor(private botIndex: number) {
    super()
  }

  get supportsImageInput() {
    return true // Phase A: Supports image input for editing or visual understanding
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
      const imageModel = custom.model || 'chroma'
      const imageProvider = imageProviderRef.provider

      if (!imageApiKey) {
        throw new ChatError('Image Provider API key not set', ErrorCode.CUSTOMBOT_CONFIGURATION_ERROR)
      }

      // Get tool definition (from config or auto-detect from model)
      const toolDefMeta = custom.toolDefinition
        ? {
            definition: custom.toolDefinition,
            supportsEdit: false,
            endpointSelector: undefined
          }
        : getDefaultToolDefinition(imageModel, imageProvider)

      const userImages = params.images || []

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

      // Inject tool definition into the bot (await for initialization to complete)
      if (typeof (promptBot as any).setTools === 'function') {
        await (promptBot as any).setTools([toolDefMeta.definition])
      }

      // Modify system prompt with tool usage instructions
      const originalSystemMessage = (promptBot as any).getSystemMessage?.() || ''
      let toolInstruction = `\n\nYou have access to an image generation tool called 'generate_image'. When the user asks you to create, generate, make, or show an image, you MUST use this tool. Do not describe or imagine the image in text - actually generate it using the tool.`

      // Add image-specific instructions if user provided images
      if (userImages.length > 0) {
        if (toolDefMeta.supportsEdit) {
          toolInstruction += `\n\nThe user has provided ${userImages.length} image(s). You can edit these images by including them in the 'images' parameter of the generate_image tool call. The images are available to you for analysis.`
        } else {
          toolInstruction += `\n\n⚠️ IMPORTANT: The user has provided ${userImages.length} image(s), but this model (${imageModel}) does NOT support image editing. You CANNOT include images in the tool call parameters. Instead:
1. Carefully examine the provided images
2. Describe key visual elements (objects, colors, composition, style) in your text prompt
3. Use rich textual descriptions to approximate what the user wants`
        }
      }

      if (typeof (promptBot as any).setSystemMessage === 'function') {
        if (!originalSystemMessage.includes('generate_image')) {
          await (promptBot as any).setSystemMessage(originalSystemMessage + toolInstruction)
        }
      }

      // Set conversation history
      if (this.conversationContext) {
        promptBot.setConversationHistory(this.conversationContext)
      }

      let toolCallDetected = false
      let lastTextUpdate = ''

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
              // Use tool call arguments directly (they match the API format)
              const apiBody: any = { ...args }

              // Add model field for Chutes API (they require it in the body)
              if (/chutes/i.test(imageHost || '')) {
                apiBody.model = imageModel
              }

              // Show generation parameters immediately (before image generation)
              const paramsJson = `\`\`\`json\n${JSON.stringify(apiBody, null, 2)}\n\`\`\``
              const generatingText = lastTextUpdate
                ? `${lastTextUpdate}\n\n⏳ Generating image...\n\n${paramsJson}`
                : `⏳ Generating image...\n\n${paramsJson}`

              params.onEvent({
                type: 'UPDATE_ANSWER',
                data: { text: generatingText },
              })

              // Determine endpoint
              const hasImages = (apiBody.images && Array.isArray(apiBody.images) && apiBody.images.length > 0)
              const endpoint = toolDefMeta.endpointSelector
                ? toolDefMeta.endpointSelector(hasImages, imageHost)
                : imageHost

              // Determine if async API (Novita uses async pattern)
              const isAsync = /novita/i.test(imageHost || '')

              // Generate image using unified API client
              const imageUrl = await generateImage({
                endpoint,
                apiKey: imageApiKey,
                body: apiBody,
                signal: params.signal,
                isAsync,
              })

              // Update with image (replace "Generating..." with actual image)
              const markdown = `![Generated Image](${imageUrl})`
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

      // Call the prompt bot with user images
      // IMPORTANT: Pass images so Claude can see them (for Edit mode or visual understanding)
      await promptBot.doSendMessage({
        ...wrappedParams,
        images: userImages,  // Pass through user's images
      })

      if (!toolCallDetected) {
        params.onEvent({ type: 'DONE' })
      }

      if (typeof (promptBot as any).getConversationHistory === 'function') {
        const updatedHistory = (promptBot as any).getConversationHistory()
        if (updatedHistory) {
          this.conversationContext = updatedHistory
        }
      }

      // Cleanup: restore original state
      if (typeof (promptBot as any).setSystemMessage === 'function') {
        await (promptBot as any).setSystemMessage(originalSystemMessage)
      }

      if (typeof (promptBot as any).setTools === 'function') {
        await (promptBot as any).setTools([])
      }
    } catch (error) {
      params.onEvent({
        type: 'ERROR',
        error: error instanceof ChatError ? error : new ChatError(String(error), ErrorCode.UNKOWN_ERROR),
      })
    }
  }
}
