import { getUserConfig, CustomApiProvider, ImageGenerator } from '~services/user-config'
import { ChatError, ErrorCode } from '~utils/errors'
import * as Chutes from './providers/chutes'
import * as Seedream from './providers/seedream'

export type ImageGenInput = Chutes.ChutesGenerateInput & Seedream.SeedreamGenerateInput & { prompt: string }

async function getGenerator(generatorId: string): Promise<ImageGenerator> {
  const cfg = await getUserConfig()
  const gens = cfg.imageGenerators || []
  const g = gens.find((x) => x.id === generatorId)
  if (!g) {
    throw new ChatError(`Image generator with ID ${generatorId} not found`, ErrorCode.CUSTOMBOT_CONFIGURATION_ERROR)
  }
  return g
}

export async function getClaudeClientToolsFor(generatorId?: string): Promise<any[] | undefined> {
  if (!generatorId) return undefined
  const g = await getGenerator(generatorId)
  const tools = g.type === 'chutes' ? Chutes.getClaudeTools() : Seedream.getClaudeTools()
  const model = (g.model || '').trim()
  if (model) {
    return tools.map((t: any) => {
      const schema = { ...(t.input_schema || {}), properties: { ...(t.input_schema?.properties || {}) } }
      schema.properties.model = { type: 'string', enum: [model], description: 'Fixed image model to use' }
      const req: string[] = Array.isArray(t.input_schema?.required) ? [...t.input_schema.required] : ['prompt']
      if (!req.includes('model')) req.push('model')
      return { ...t, input_schema: { ...schema, required: req } }
    })
  }
  return tools
}

export async function getOpenAIFunctionToolsFor(generatorId?: string): Promise<any[] | undefined> {
    if (!generatorId) return undefined
    const g = await getGenerator(generatorId)
    const tools = g.type === 'chutes' ? Chutes.getClaudeTools() : Seedream.getClaudeTools()
    const model = (g.model || '').trim()
    return tools.map((t: any) => {
      const schema = { ...(t.input_schema || {}), properties: { ...(t.input_schema?.properties || {}) } }
      if (model) {
        schema.properties.model = { type: 'string', enum: [model], description: 'Fixed image model to use' }
        const req: string[] = Array.isArray(t.input_schema?.required) ? [...t.input_schema.required] : ['prompt']
        if (!req.includes('model')) (schema as any).required = req.concat('model')
        else (schema as any).required = req
      }
      return { type: 'function', function: { name: t.name, description: t.description, parameters: schema } }
    })
}

export async function generateImageViaToolFor(
  generatorId: string | undefined,
  input: ImageGenInput,
  signal?: AbortSignal,
  opts?: { overrides?: Record<string, any>; model?: string },
) {
  if (!generatorId) {
    throw new ChatError('Image generator not specified', ErrorCode.CUSTOMBOT_CONFIGURATION_ERROR)
  }
  const g = await getGenerator(generatorId)
  const host = (g.host || '').replace(/\/$/, '')
  const apiKey = g.apiKey || ''
  const model = opts?.model || (g.model || '').trim()
  const type = (g.type || 'seedream') as 'chutes' | 'seedream'
  const defaults = (g.defaults || {}) as Record<string, any>
  const overrides = (opts?.overrides || {}) as Record<string, any>
  const mergedDefaults = { ...defaults, ...overrides }

  if (type === 'chutes') {
    return Chutes.executeGenerate(input as any, { host, apiKey, model, signal, defaults: mergedDefaults })
  } else {
    return Seedream.executeGenerate(input as any, { host, apiKey, model, signal, defaults: mergedDefaults })
  }
}
