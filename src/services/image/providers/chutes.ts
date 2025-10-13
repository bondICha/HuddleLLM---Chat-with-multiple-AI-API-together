import { ChatError, ErrorCode } from '~utils/errors'

export type ChutesGenerateInput = {
  prompt: string
  negative_prompt?: string
  width?: number
  height?: number
  num_inference_steps?: number
  guidance_scale?: number
  seed?: number
}

export function getClaudeTools() {
  return [
    {
      name: 'chutes_generate_image',
      description: 'Generate an image via Chutes using user-configured credentials.',
      input_schema: {
        type: 'object',
        properties: {
          prompt: { type: 'string', description: 'A detailed description of the image to generate.' },
          negative_prompt: { type: 'string', description: 'A description of what not to include in the image.' },
          width: { type: 'integer', description: 'The width of the image to generate.' },
          height: { type: 'integer', description: 'The height of the image to generate.' },
          num_inference_steps: { type: 'integer', description: 'The number of inference steps to use.' },
          guidance_scale: { type: 'number', description: 'The guidance scale to use.' },
          seed: { type: 'integer', description: 'The seed to use for the image generation.' },
        },
        required: ['prompt'],
      },
    },
  ]
}

export async function executeGenerate(
  input: ChutesGenerateInput,
  context: { host: string; apiKey: string; model?: string; signal?: AbortSignal; defaults?: Partial<ChutesGenerateInput> },
): Promise<string> {
  const body: any = {
    model: context.model?.trim(),
    prompt: input.prompt,
    ...(input.negative_prompt ? { negative_prompt: input.negative_prompt } : {}),
    ...(input.width ? { width: input.width } : (context.defaults?.width ? { width: context.defaults.width } : {})),
    ...(input.height ? { height: input.height } : (context.defaults?.height ? { height: context.defaults.height } : {})),
    ...(input.num_inference_steps ? { num_inference_steps: input.num_inference_steps } : (context.defaults?.num_inference_steps ? { num_inference_steps: context.defaults.num_inference_steps } : {})),
    ...(input.guidance_scale ? { guidance_scale: input.guidance_scale } : (context.defaults?.guidance_scale ? { guidance_scale: context.defaults.guidance_scale } : {})),
    ...(typeof input.seed === 'number' ? { seed: input.seed } : (typeof context.defaults?.seed === 'number' ? { seed: context.defaults.seed } : {})),
  }
  const preview = ['Generating image with Chutes…', '```json', JSON.stringify(body, null, 2), '```'].join('\n')
  const resp = await fetch(context.host.replace(/([^:]\/)\/+/g, '$1'), {
    method: 'POST',
    signal: context.signal,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${context.apiKey}` },
    body: JSON.stringify(body),
  })
  if (!resp.ok) {
    const status = `${resp.status} ${resp.statusText}`
    let cause: any
    try { cause = await resp.json() } catch { cause = await resp.text() }
    throw new ChatError(status, ErrorCode.UNKOWN_ERROR, cause)
  }
  try {
    const blob = await resp.blob()
    const arr = await blob.arrayBuffer()
    const b64 = btoa(String.fromCharCode(...new Uint8Array(arr)))
    const dataUrl = 'data:image/jpeg;base64,' + b64
    return `${preview}\n\n![image](${dataUrl})`
  } catch {
    const txt = await resp.text()
    return `${preview}\n\n${'```'}\n${txt}\n${'```'}`
  }
}
