import { PerplexityMode, getUserConfig } from '~/services/user-config'
import { AsyncAbstractBot } from '../abstract-bot'
import { PerplexityApiBot } from '../perplexity-api'
import { PerplexityLabsBot } from '../perplexity-web'

export class PerplexityBot extends AsyncAbstractBot {
  private isReasoning: boolean;

  constructor(params: {
    isReasoning: boolean; // Reasoning モードを有効にするかどうか
  }) {
    super();
    this.isReasoning = params.isReasoning ?? false;
  }

  async initializeBot() {
    const { perplexityMode, ...config } = await getUserConfig()
    if (perplexityMode === PerplexityMode.API) {
      if (!config.perplexityApiKey) {
        throw new Error('Perplexity API key missing')
      }
      const model = this.isReasoning ? config.perplexityReasoningModel : config.perplexityModel;
      return new PerplexityApiBot(config.perplexityApiKey, model || 'sonar-pro')
    }
    return new PerplexityLabsBot(this.isReasoning ? 'sonar-reasoning-pro' : 'sonar-pro')
  }

  get name() {
    return this.isReasoning ? 'Perplexity (Reasoning)' : 'Perplexity'
  }
}
