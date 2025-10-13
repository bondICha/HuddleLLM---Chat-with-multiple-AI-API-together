import { AsyncAbstractBot, AbstractBot, SendMessageParams } from './abstract-bot'
import { generateImageViaToolFor } from '~services/image-tools'

type WrapperConfig = {
  engine: AbstractBot
  generatorId?: string
  overrides?: Record<string, any>
  sourceBotId?: number
  model?: string
}

export class ImageAgentWrapperBot extends AsyncAbstractBot {
  private wrapperCfg!: WrapperConfig
  constructor(cfg: WrapperConfig) {
    super()
    this.wrapperCfg = cfg
  }

  async initializeBot(): Promise<AbstractBot> {
    return this.wrapperCfg.engine
  }

  async doSendMessage(params: SendMessageParams): Promise<void> {
    let toolCallDetected = false
    let toolName = ''
    let toolInput = ''

    const toolCallHandler = (name: string, input: string) => {
      toolCallDetected = true
      toolName = name
      toolInput = input
    }

    // Temporarily attach handler to the engine instance
    ;(this.wrapperCfg.engine as any)._toolCallHandler = toolCallHandler

    await this.wrapperCfg.engine.doSendMessage({
      ...params,
      onEvent: async (evt) => {
        params.onEvent(evt)
      },
    })

    // Detach handler
    delete (this.wrapperCfg.engine as any)._toolCallHandler

    if (toolCallDetected) {
      try {
        const input = JSON.parse(toolInput)
        const md = await generateImageViaToolFor(
          this.wrapperCfg.generatorId,
          input,
          params.signal,
          {
            overrides: this.wrapperCfg.overrides,
            model: this.wrapperCfg.model,
          },
        )
        params.onEvent({ type: 'UPDATE_ANSWER', data: { text: md } })
      } catch (err: any) {
        params.onEvent({ type: 'ERROR', error: err })
      } finally {
        params.onEvent({ type: 'DONE' })
      }
    }
  }
}
