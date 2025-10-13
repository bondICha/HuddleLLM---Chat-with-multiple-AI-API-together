import { ChatError, ErrorCode } from '~utils/errors'

export type SeedreamGenerateInput = {
  prompt: string
  size?: string
  sequential_image_generation?: 'auto' | 'on' | 'off'
  max_images?: number
  watermark?: boolean
}

export function getClaudeTools() {
  return [
    {
      name: 'seedream_generate_image',
      description: 'Generate an image via Seedream-compatible API using user-configured credentials.',
      input_schema: {
        type: 'object',
        properties: {
          prompt: { type: 'string', description: 'A detailed description of the image to generate.' },
          size: { type: 'string', description: 'The size of the image to generate, e.g., "1024x1024".' },
          sequential_image_generation: { type: 'string', enum: ['auto','on','off'], description: 'Whether to generate images sequentially or in parallel.' },
          max_images: { type: 'integer', description: 'The maximum number of images to generate.' },
          watermark: { type: 'boolean', description: 'Whether to add a watermark to the generated image.' },
        },
        required: ['prompt'],
      },
    },
  ]
}

export async function executeGenerate(
  input: SeedreamGenerateInput,
  ctx: { host: string; apiKey: string; model?: string; signal?: AbortSignal; defaults?: Partial<SeedreamGenerateInput> },
): Promise<string> {
    const body: any = {
    model: ctx.model?.trim(),
    prompt: input.prompt,
    ...(typeof input.size === 'string' && input.size.trim().length > 0 ? { size: input.size.trim() } : (ctx.defaults?.size ? { size: ctx.defaults.size } : {})),
    sequential_image_generation: input.sequential_image_generation || ctx.defaults?.sequential_image_generation || 'auto',
    ...(typeof input.max_images === 'number' ? { max_images: input.max_images } : (typeof ctx.defaults?.max_images === 'number' ? { max_images: ctx.defaults.max_images } : {})),
    watermark: typeof input.watermark === 'boolean' ? input.watermark : (typeof ctx.defaults?.watermark === 'boolean' ? ctx.defaults.watermark : false),
  }
  const preview = ['Generating image with Seedream…', '```json', JSON.stringify(body, null, 2), '```'].join('\n')
  const resp = await fetch(ctx.host.replace(/([^:]\/)\/+/g, '$1'), {
    method: 'POST',
    signal: ctx.signal,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ctx.apiKey}` },
    body: JSON.stringify(body),
  })
  if (!resp.ok) {
    const status = `${resp.status} ${resp.statusText}`
    let cause: any
    try { cause = await resp.json() } catch { cause = await resp.text() }
    throw new ChatError(status, ErrorCode.UNKOWN_ERROR, cause)
  }
  try {
    const j = await resp.json()
    const candidates: string[] = []
    const tryPush = (s?: any) => { if (typeof s === 'string' && s.length > 32) candidates.push(s) }
    if (Array.isArray(j?.images)) j.images.forEach(tryPush)
    if (typeof j?.image === 'string') tryPush(j.image)
    if (Array.isArray(j?.output)) j.output.forEach(tryPush)
    if (Array.isArray(j?.data?.images)) j.data.images.forEach(tryPush)
    if (candidates.length > 0) {
      const first = candidates[0]
      const render = first.startsWith('http') ? first : (first.startsWith('data:') ? first : `data:image/png;base64,${first}`)
      return `${preview}\n\n![image](${render})`
    }
    if (typeof j?.url === 'string') return `${preview}\n\n![image](${j.url})`
    return `${preview}\n\n${'```json'}\n${JSON.stringify(j, null, 2)}\n${'```'}`
  } catch {
    const blob = await resp.blob()
    const arr = await blob.arrayBuffer()
    const b64 = btoa(String.fromCharCode(...new Uint8Array(arr)))
    return `${preview}\n\n![image](${`data:image/png;base64,${b64}`})`
  }
}
