import { Sentry } from '~services/sentry'
import { ChatError, ErrorCode } from '~utils/errors'
import { streamAsyncIterable } from '~utils/stream-async-iterable'

export type AnwserPayload = {
  text: string
  thinking?: string
}

export type Event =
  | {
      type: 'UPDATE_ANSWER'
      data: AnwserPayload
    }
  | {
      type: 'DONE'
    }
  | {
      type: 'ERROR'
      error: ChatError
    }

export interface MessageParams {
  prompt: string
  rawUserInput?: string
  image?: File
  signal?: AbortSignal
}

export interface SendMessageParams extends MessageParams {
  onEvent: (event: Event) => void
}

export interface ConversationHistory {
  messages: any[];  // 各ボットの実装に合わせて型を定義
}

export abstract class AbstractBot {
  protected conversationHistory?: ConversationHistory;

  public async sendMessage(params: MessageParams) {
    return this.doSendMessageGenerator(params)
  }

  // 会話履歴を設定するメソッド
  public setConversationHistory(history: ConversationHistory): void {
    this.conversationHistory = history;
  }

  // 会話履歴を取得するメソッド
  public getConversationHistory(): ConversationHistory | undefined {
    return this.conversationHistory;
  }

  protected async *doSendMessageGenerator(params: MessageParams) {
    const wrapError = (err: unknown) => {
      Sentry.captureException(err)
      if (err instanceof ChatError) {
        return err
      }
      if (!params.signal?.aborted) {
        // ignore user abort exception
        return new ChatError((err as Error).message, ErrorCode.UNKOWN_ERROR)
      }
    }
    const stream = new ReadableStream<AnwserPayload>({
      start: (controller) => {
        this.doSendMessage({
          prompt: params.prompt,
          rawUserInput: params.rawUserInput,
          image: params.image,
          signal: params.signal,
          onEvent(event) {
            if (event.type === 'UPDATE_ANSWER') {
              controller.enqueue(event.data)
            } else if (event.type === 'DONE') {
              controller.close()
            } else if (event.type === 'ERROR') {
              const error = wrapError(event.error)
              if (error) {
                controller.error(error)
              }
            }
          },
        }).catch((err) => {
          const error = wrapError(err)
          if (error) {
            controller.error(error)
          }
        })
      },
    })
    yield* streamAsyncIterable(stream)
  }

  get name(): string | undefined {
    return undefined
  }

  get chatBotName(): string | undefined {
    return undefined
  }

  get avatar(): string | undefined {
    return undefined
  }

  get modelName(): string | undefined {
    return undefined
  }

  get supportsImageInput() {
    return false
  }

  abstract doSendMessage(params: SendMessageParams): Promise<void>
  abstract resetConversation(): void

  // すべてのモデルの実装が終わるまでとりあえず何もしない関数
  async modifyLastMessage(_message: string): Promise<void> {
    // デフォルトでは何もしない
    return
  }

}

class DummyBot extends AbstractBot {
  async doSendMessage(_params: SendMessageParams) {
    // dummy
  }
  resetConversation() {
    // dummy
  }
  get name() {
    return ''
  }

  async modifyLastMessage(_message: string) {
    // dummy
  }
}

export abstract class AsyncAbstractBot extends AbstractBot {
  #bot: AbstractBot
  #initializeError?: Error

  constructor() {
    super()
    this.#bot = new DummyBot()
    this.initializeBot()
      .then((bot) => {
        this.#bot = bot
        // 親クラスの会話履歴があれば、初期化されたボットに設定
        const history = this.getConversationHistory()
        if (history) {
          this.#bot.setConversationHistory(history)
        }
      })
      .catch((err) => {
        this.#initializeError = err
      })
  }

  abstract initializeBot(): Promise<AbstractBot>

  doSendMessage(params: SendMessageParams) {
    if (this.#bot instanceof DummyBot && this.#initializeError) {
      throw this.#initializeError
    }
    return this.#bot.doSendMessage(params)
  }

  resetConversation() {
    // 会話履歴もリセット
    this.conversationHistory = undefined
    return this.#bot.resetConversation()
  }

  modifyLastMessage(message: string) {
    if (this.#bot instanceof DummyBot && this.#initializeError) {
      throw this.#initializeError
    }
    return this.#bot.modifyLastMessage(message)
  }

  // 会話履歴の設定をオーバーライド
  setConversationHistory(history: ConversationHistory): void {
    super.setConversationHistory(history)
    // 内部ボットにも会話履歴を設定
    if (!(this.#bot instanceof DummyBot)) {
      this.#bot.setConversationHistory(history)
    }
  }

  // 会話履歴の取得をオーバーライド
  getConversationHistory(): ConversationHistory | undefined {
    // 内部ボットから会話履歴を取得
    if (!(this.#bot instanceof DummyBot)) {
      return this.#bot.getConversationHistory()
    }
    return super.getConversationHistory()
  }

  get modelName() {
    return this.#bot.modelName
  }

  get name() {
    return this.#bot.name
  }

  get supportsImageInput() {
    return this.#bot.supportsImageInput
  }
}
