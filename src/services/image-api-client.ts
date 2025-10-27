import { ChatError, ErrorCode } from '~utils/errors'

/**
 * Unified image generation API client
 *
 * Handles both synchronous (Chutes) and asynchronous (Novita) image generation APIs.
 * Automatically detects the API pattern and handles polling for async APIs.
 *
 * EXTENSIBILITY:
 * - To support new providers, no code changes needed here
 * - Just ensure the provider's API follows either:
 *   1. Sync pattern: POST → image binary response
 *   2. Async pattern: POST → {task_id} → GET task-result → {images: [{image_url}]}
 */

export interface GenerateImageParams {
  /** API endpoint URL */
  endpoint: string
  /** API key for authentication */
  apiKey: string
  /** Request body (tool call arguments passed directly) */
  body: Record<string, any>
  /** Abort signal for cancellation */
  signal?: AbortSignal
  /** Whether this is an async API (e.g., Novita) */
  isAsync?: boolean
}

/**
 * Generate an image using the specified API
 * @param params Generation parameters
 * @returns Image URL (data URL for sync, regular URL for async)
 */
export async function generateImage(params: GenerateImageParams): Promise<string> {
  const { endpoint, apiKey, body, signal, isAsync } = params

  if (isAsync) {
    // Novita-style async: create task → poll for result
    return await generateImageAsync(endpoint, apiKey, body, signal)
  } else {
    // Chutes-style sync: direct image response
    return await generateImageSync(endpoint, apiKey, body, signal)
  }
}

/**
 * Synchronous image generation (Chutes AI pattern)
 * POST request returns image binary directly
 */
async function generateImageSync(
  endpoint: string,
  apiKey: string,
  body: any,
  signal?: AbortSignal
): Promise<string> {
  const resp = await fetch(endpoint, {
    method: 'POST',
    signal,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  })

  if (!resp.ok) {
    const text = await resp.text().catch(() => '')
    throw new ChatError(
      `Image API error ${resp.status}: ${resp.statusText}`,
      ErrorCode.UNKOWN_ERROR,
      text
    )
  }

  // Convert image blob to data URL
  const blob = await resp.blob()

  if (!blob || blob.size === 0) {
    throw new ChatError('Received empty image from API', ErrorCode.UNKOWN_ERROR)
  }

  return await blobToDataURL(blob)
}

/**
 * Asynchronous image generation (Novita AI pattern)
 * 1. POST request creates a task and returns task_id
 * 2. Poll GET task-result endpoint until status is SUCCEED or FAILED
 */
async function generateImageAsync(
  endpoint: string,
  apiKey: string,
  body: any,
  signal?: AbortSignal
): Promise<string> {
  // Step 1: Create task
  const createResp = await fetch(endpoint, {
    method: 'POST',
    signal,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  })

  if (!createResp.ok) {
    const text = await createResp.text().catch(() => '')
    throw new ChatError(
      `Failed to create image generation task: ${createResp.status}`,
      ErrorCode.UNKOWN_ERROR,
      text
    )
  }

  const createData = await createResp.json()
  const taskId = createData.task_id || createData.data?.task_id

  if (!taskId) {
    throw new ChatError(
      'No task_id in API response',
      ErrorCode.UNKOWN_ERROR,
      JSON.stringify(createData)
    )
  }

  // Step 2: Poll for result
  // Extract base host from endpoint (e.g., https://api.novita.ai/v3/async/qwen-image-txt2img → https://api.novita.ai)
  const baseHost = endpoint.split('/v3/')[0]
  const resultUrl = `${baseHost}/v3/async/task-result?task_id=${encodeURIComponent(taskId)}`

  const startTime = Date.now()
  const timeout = 180000 // 3 minutes

  while (Date.now() - startTime < timeout) {
    // Wait before polling
    await new Promise(resolve => setTimeout(resolve, 2000)) // Poll every 2 seconds

    if (signal?.aborted) {
      throw new ChatError('Image generation cancelled', ErrorCode.UNKOWN_ERROR)
    }

    let resultResp
    try {
      resultResp = await fetch(resultUrl, {
        method: 'GET',
        signal,
        headers: { 'Authorization': `Bearer ${apiKey}` },
      })
    } catch (err) {
      // Network error, continue polling
      continue
    }

    if (!resultResp.ok) {
      // Temporary error, continue polling
      continue
    }

    let result
    try {
      result = await resultResp.json()
    } catch (err) {
      // JSON parse error, continue polling
      continue
    }

    const status = result.task?.status

    if (status === 'TASK_STATUS_SUCCEED') {
      const imageUrl = result.images?.[0]?.image_url
      if (!imageUrl) {
        throw new ChatError(
          'No image URL in successful task result',
          ErrorCode.UNKOWN_ERROR,
          JSON.stringify(result)
        )
      }
      return imageUrl // Return URL directly (Novita provides CDN URLs)
    }

    if (status === 'TASK_STATUS_FAILED') {
      const reason = result.task?.reason || 'Unknown error'
      throw new ChatError(
        `Image generation failed: ${reason}`,
        ErrorCode.UNKOWN_ERROR,
        JSON.stringify(result)
      )
    }

    // Status is PENDING, PROCESSING, etc. - continue polling
  }

  throw new ChatError(
    'Image generation timeout (exceeded 3 minutes)',
    ErrorCode.UNKOWN_ERROR
  )
}

/**
 * Convert blob to data URL for inline display
 */
async function blobToDataURL(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => {
      const result = reader.result
      if (typeof result === 'string') {
        resolve(result)
      } else {
        reject(new Error('FileReader returned invalid result type'))
      }
    }
    reader.onerror = () => {
      reject(new Error(`FileReader error: ${reader.error}`))
    }
    reader.readAsDataURL(blob)
  })
}
