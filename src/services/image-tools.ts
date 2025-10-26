import { ChatError, ErrorCode } from '~utils/errors'

/**
 * Tool definition for image generation (Claude format)
 */
export const IMAGE_GENERATION_TOOL_CLAUDE = {
  name: 'generate_image',
  description: 'Generate an image based on a text prompt. Use this when the user asks to create, generate, or make an image.',
  input_schema: {
    type: 'object',
    properties: {
      prompt: {
        type: 'string',
        description: 'A detailed description of the image to generate. Be specific and descriptive.',
      },
      negative_prompt: {
        type: 'string',
        description: 'Things to avoid in the image (e.g., "blurry, low quality")',
      },
      width: {
        type: 'number',
        description: 'Image width in pixels (e.g., 1024)',
        default: 1024,
      },
      height: {
        type: 'number',
        description: 'Image height in pixels (e.g., 1024)',
        default: 1024,
      },
      steps: {
        type: 'number',
        description: 'Number of inference steps (higher = better quality but slower)',
        default: 20,
      },
      guidance_scale: {
        type: 'number',
        description: 'How closely to follow the prompt (7-15 recommended)',
        default: 7.5,
      },
      seed: {
        type: 'number',
        description: 'Random seed for reproducibility (optional)',
      },
    },
    required: ['prompt'],
  },
}

/**
 * Tool definition for image generation (OpenAI format)
 */
export const IMAGE_GENERATION_TOOL_OPENAI = {
  type: 'function',
  function: {
    name: 'generate_image',
    description: 'Generate an image based on a text prompt. Use this when the user asks to create, generate, or make an image.',
    parameters: {
      type: 'object',
      properties: {
        prompt: {
          type: 'string',
          description: 'A detailed description of the image to generate. Be specific and descriptive.',
        },
        negative_prompt: {
          type: 'string',
          description: 'Things to avoid in the image (e.g., "blurry, low quality")',
        },
        width: {
          type: 'number',
          description: 'Image width in pixels (e.g., 1024)',
          default: 1024,
        },
        height: {
          type: 'number',
          description: 'Image height in pixels (e.g., 1024)',
          default: 1024,
        },
        steps: {
          type: 'number',
          description: 'Number of inference steps (higher = better quality but slower)',
          default: 20,
        },
        guidance_scale: {
          type: 'number',
          description: 'How closely to follow the prompt (7-15 recommended)',
          default: 7.5,
        },
        seed: {
          type: 'number',
          description: 'Random seed for reproducibility (optional)',
        },
      },
      required: ['prompt'],
    },
  },
}

export type ChutesParams = {
  host?: string
  apiKey: string
  model: string
  prompt: string
  negativePrompt?: string
  width?: number
  height?: number
  steps?: number
  guidanceScale?: number
  seed?: number
  signal?: AbortSignal
}

export async function generateWithChutes(p: ChutesParams): Promise<string> {
  const url = (p.host && p.host.trim().length > 0) ? p.host : 'https://image.chutes.ai/generate'
  const body: any = {
    model: p.model || 'FLUX.1-dev',
    prompt: p.prompt,
    width: p.width || 1024,
    height: p.height || 1024,
    num_inference_steps: p.steps || 20,
    guidance_scale: p.guidanceScale || 7.5,
  }
  if (p.negativePrompt) body.negative_prompt = p.negativePrompt
  if (typeof p.seed === 'number') body.seed = p.seed

  console.log('[Chutes] Sending request to:', url)
  console.log('[Chutes] Request body:', JSON.stringify(body, null, 2))

  const resp = await fetch(url, {
    method: 'POST',
    signal: p.signal,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${p.apiKey}` },
    body: JSON.stringify(body),
  })

  console.log('[Chutes] Response status:', resp.status, resp.statusText)
  console.log('[Chutes] Response headers:', {
    contentType: resp.headers.get('content-type'),
    contentLength: resp.headers.get('content-length'),
  })

  if (!resp.ok) {
    const text = await resp.text().catch(() => '')
    console.error('[Chutes] Error response:', text)
    throw new ChatError(`Chutes error ${resp.status}`, ErrorCode.UNKOWN_ERROR, text)
  }

  const blob = await resp.blob()
  console.log('[Chutes] Blob received:', blob.size, 'bytes, type:', blob.type)

  const dataUrl = await new Promise<string>((resolve, reject) => {
    const fr = new FileReader()
    fr.onloadend = () => {
      console.log('[Chutes] Data URL created, length:', (fr.result as string).length)
      resolve(fr.result as string)
    }
    fr.onerror = (err) => {
      console.error('[Chutes] FileReader error:', err)
      reject(new Error('Failed to convert blob to data URL'))
    }
    fr.readAsDataURL(blob)
  })
  return dataUrl
}

export type NovitaParams = {
  host?: string
  apiKey: string
  model: string
  prompt: string
  negativePrompt?: string
  width?: number
  height?: number
  steps?: number
  guidanceScale?: number
  seed?: number
  signal?: AbortSignal
}

export async function generateWithNovita(p: NovitaParams): Promise<string> {
  const host = (p.host && p.host.trim().length > 0) ? p.host.replace(/\/$/, '') : 'https://api.novita.ai'
  const createUrl = `${host}/v3/async/txt2img`
  const body: any = {
    extra: { response_image_type: 'jpeg' },
    request: {
      model_name: p.model || 'sd_xl_base_1.0.safetensors',
      prompt: p.prompt,
      negative_prompt: p.negativePrompt || undefined,
      width: p.width || 1024,
      height: p.height || 1024,
      image_num: 1,
      steps: p.steps || 20,
      seed: typeof p.seed === 'number' ? p.seed : -1,
      guidance_scale: p.guidanceScale || 7.5,
      sampler_name: 'Euler a',
    },
  }
  const resp = await fetch(createUrl, {
    method: 'POST',
    signal: p.signal,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${p.apiKey}` },
    body: JSON.stringify(body),
  })
  if (!resp.ok) {
    const text = await resp.text().catch(() => '')
    throw new ChatError(`Novita create error ${resp.status}`, ErrorCode.UNKOWN_ERROR, text)
  }
  let taskId = ''
  try {
    const j = await resp.json()
    taskId = j?.data?.task_id || ''
  } catch {}
  if (!taskId) throw new ChatError('Novita response missing task_id', ErrorCode.UNKOWN_ERROR)

  const resultUrl = `${host}/v3/async/task-result?task_id=${encodeURIComponent(taskId)}`
  const start = Date.now()
  while (Date.now() - start < 120000) { // up to 120s
    await new Promise(r => setTimeout(r, 2000))
    const r = await fetch(resultUrl, { method: 'GET', signal: p.signal, headers: { Authorization: `Bearer ${p.apiKey}` } })
    if (!r.ok) continue
    let j: any
    try { j = await r.json() } catch { continue }
    const status = j?.task?.status
    if (status === 'TASK_STATUS_SUCCEED') {
      const url = j?.images?.[0]?.image_url
      if (!url) throw new ChatError('Novita missing image_url', ErrorCode.UNKOWN_ERROR, j)
      return url as string
    }
    if (status === 'TASK_STATUS_FAILED') {
      throw new ChatError('Novita task failed', ErrorCode.UNKOWN_ERROR, j)
    }
  }
  throw new ChatError('Novita task timeout', ErrorCode.UNKOWN_ERROR)
}

