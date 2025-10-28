import { ToolDefinition } from './user-config'

/**
 * Tool definition with metadata for image generation
 *
 * EXTENSIBILITY NOTE:
 * When adding new models/providers in the future:
 * 1. Create a new ToolDefinition matching the API's parameter names exactly
 * 2. Set supportsEdit: true if the model supports image editing
 * 3. Implement endpointSelector if the model uses different endpoints for txt2img vs edit
 * 4. Add to TOOL_DEFINITION_REGISTRY with a unique key
 */

/**
 * Convert Claude Tool Use format to OpenAI Function Calling format
 *
 * Claude format:
 * {
 *   name: "...",
 *   description: "...",
 *   input_schema: { type: "object", properties: {...}, required: [...] }
 * }
 *
 * OpenAI format:
 * {
 *   type: "function",
 *   function: {
 *     name: "...",
 *     description: "...",
 *     parameters: { type: "object", properties: {...}, required: [...] }
 *   }
 * }
 */
export function convertClaudeToolToOpenAI(claudeTool: ToolDefinition): any {
  return {
    type: 'function',
    function: {
      name: claudeTool.name,
      description: claudeTool.description,
      parameters: claudeTool.input_schema,
    },
  }
}

/**
 * API処理のための設定
 * Tool Call（LLMに渡すJSON定義）とは分離
 */
export interface ImageApiConfig {
  /** API endpoint URL or function to determine endpoint */
  endpoint: string | ((hasImages: boolean, baseHost: string) => string)
  /** Whether this is a synchronous API (returns image directly) or async (returns task_id for polling) */
  isAsync: boolean
  /** Whether this model supports image editing (img2img) */
  supportsEdit: boolean
  /** When set, user-provided images are automatically injected into this request field as base64 strings */
  imageInputField?: string
}

/**
 * 画像生成モデルの完全な設定
 * - toolDefinition: LLMに渡すTool Call定義
 * - apiConfig: API呼び出しのための設定
 */
export interface ImageModelConfig {
  /** Tool definition in Claude format (for LLM) */
  toolDefinition: ToolDefinition
  /** API processing configuration (for actual API calls) */
  apiConfig: ImageApiConfig
}

/**
 * Default tool definitions for currently supported models
 */

/**
 * 1. Chutes AI - Chroma (and other standard SD models like FLUX.1-dev)
 * API: https://image.chutes.ai/generate
 * Edit support: No
 */
export const MODEL_CHUTES_CHROMA: ImageModelConfig = {
  toolDefinition: {
    name: 'generate_image',
    description: 'Generate an image using Chroma model. Images supplied by the user are not forwarded, so describe any visual references directly in the prompt.',
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
          description: 'Image width in pixels',
          default: 1280,
        },
        height: {
          type: 'number',
          description: 'Image height in pixels',
          default: 1280,
        },
        num_inference_steps: {
          type: 'number',
          description: 'Number of inference steps (higher = better quality but slower)',
          default: 50,
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
  apiConfig: {
    endpoint: (hasImages: boolean, baseHost: string) => {
      const cleanHost = baseHost.replace(/\/$/, '')
      return `${cleanHost}/generate`
    },
    isAsync: false,
    supportsEdit: false,
  },
}

/**
 * 2. Novita AI - Qwen Image
 * API: https://api.novita.ai/v3/async/qwen-image-txt2img (txt2img)
 *      https://api.novita.ai/v3/async/qwen-image-edit (edit)
 * Edit support: Yes - different endpoints
 */
export const MODEL_NOVITA_QWEN: ImageModelConfig = {
  toolDefinition: {
    name: 'generate_image',
    description: 'Generate or edit an image using Qwen Image model. When the user provides images, it will automatically switch to edit mode. When editing, the "size" parameter is ignored (original image size is used). When generating from scratch, you can specify the "size" parameter.',
    input_schema: {
      type: 'object',
      properties: {
        prompt: {
          type: 'string',
          description: 'Text description for image generation, or editing instructions when user provides images.',
        },
        size: {
          type: 'string',
          description: 'Image resolution in format "WIDTH*HEIGHT". Range: 256*256 to 1536*1536. Available: "1664*928" (16:9), "1472*1140" (4:3), "1328*1328" (1:1), "1140*1472" (3:4), "928*1664" (9:16). NOTE: This parameter is IGNORED in edit mode (when user provides images).',
          default: '1328*1328',
        },
        seed: {
          type: 'number',
          description: 'Random seed for reproducibility. Use a specific number (e.g., 42) for consistent results, or -1 for random generation.',
          default: -1,
        },
        output_format: {
          type: 'string',
          description: 'Output image format. "png" for transparency support, "webp" for smaller file size, "jpeg" for standard use.',
          enum: ['jpeg', 'png', 'webp'],
          default: 'jpeg',
        },
      },
      required: ['prompt'],
    },
  },
  apiConfig: {
    endpoint: (hasImages: boolean, baseHost: string) => {
      const cleanHost = baseHost.replace(/\/$/, '')
      return hasImages
        ? `${cleanHost}/v3/async/qwen-image-edit`
        : `${cleanHost}/v3/async/qwen-image-txt2img`
    },
    isAsync: true,
    supportsEdit: true,
    imageInputField: 'image', // ✨ 単数形（editのAPI仕様に合わせる）
  },
}

/**
 * 3. Novita AI - Hunyuan Image 3
 * API: https://api.novita.ai/v3/async/hunyuan-image-3
 * Edit support: No
 */
export const MODEL_NOVITA_HUNYUAN: ImageModelConfig = {
  toolDefinition: {
    name: 'generate_image',
    description: 'Generate an image using Hunyuan Image 3 model. Images provided by the user are not sent to the API, so incorporate any visual details into the prompt text.',
    input_schema: {
      type: 'object',
      properties: {
        prompt: {
          type: 'string',
          description: 'A detailed description of the image to generate. Be specific and descriptive.',
        },
        size: {
          type: 'string',
          description: 'Image size in format "WIDTH*HEIGHT" (e.g., "1024*1024"). Range: 256-1536 per dimension.',
          default: '1024*1024',
        },
        seed: {
          type: 'number',
          description: 'Random seed for reproducibility. -1 for random. Range: -1 to 2147483647',
          default: -1,
        },
      },
      required: ['prompt'],
    },
  },
  apiConfig: {
    endpoint: (hasImages: boolean, baseHost: string) => {
      const cleanHost = baseHost.replace(/\/$/, '')
      return `${cleanHost}/v3/async/hunyuan-image-3`
    },
    isAsync: true,
    supportsEdit: false,
  },
}

/**
 * 4. Novita AI - Seedream 4.0
 * API: https://api.novita.ai/v3/seedream-4.0 (synchronous API)
 * Edit support: Yes - same endpoint, images parameter optional
 * Note: This is a SYNCHRONOUS API (not async like other Novita models)
 */
export const MODEL_NOVITA_SEEDREAM: ImageModelConfig = {
  toolDefinition: {
    name: 'generate_image',
    description: 'Generate or edit images using Seedream 4.0 model. Any images attached by the user are automatically forwarded for editing or reference.',
    input_schema: {
      type: 'object',
      properties: {
        prompt: {
          type: 'string',
          description: 'Detailed text description for image generation. Recommended: under 600 words in English.',
        },
        size: {
          type: 'string',
          description: 'Image resolution. Use "1K", "2K", "4K" or "WIDTHxHEIGHT" format (e.g., "2048x2048"). Pixel range: 1024x1024 to 4096x4096, aspect ratio: 1/16 to 16.',
          default: '2048x2048',
        },
        sequential_image_generation: {
          type: 'string',
          description: 'Enable sequential generation mode. "auto" for automatic batch generation, "disabled" for single image.',
          enum: ['auto', 'disabled'],
          default: 'disabled',
        },
        max_images: {
          type: 'number',
          description: 'Maximum number of images to generate (1-15). Only applies when sequential_image_generation is "auto". Total of reference images + generated images cannot exceed 15.',
          default: 15,
        },
        watermark: {
          type: 'boolean',
          description: 'Add watermark to bottom-right corner. Default is true.',
          default: true,
        },
      },
      required: ['prompt'],
    },
  },
  apiConfig: {
    endpoint: (hasImages: boolean, baseHost: string) => {
      const cleanHost = baseHost.replace(/\/$/, '')
      return `${cleanHost}/v3/seedream-4.0`
    },
    isAsync: false, // ✨ Seedream 4.0 is synchronous
    supportsEdit: true,
    imageInputField: 'images',
  },
}

/**
 * Registry of all available image model configurations
 * Key format: "provider-model" (e.g., "chutes-chroma", "novita-qwen")
 */
export const IMAGE_MODEL_REGISTRY: Record<string, ImageModelConfig> = {
  'chutes-chroma': MODEL_CHUTES_CHROMA,
  'chutes-flux': MODEL_CHUTES_CHROMA, // Alias - uses same format
  'novita-qwen': MODEL_NOVITA_QWEN,
  'novita-hunyuan': MODEL_NOVITA_HUNYUAN,
  'novita-hunyuan-image-3': MODEL_NOVITA_HUNYUAN, // Alias
  'novita-seedream': MODEL_NOVITA_SEEDREAM,
  'novita-seedream-4': MODEL_NOVITA_SEEDREAM, // Alias
  'novita-seedream-4-0': MODEL_NOVITA_SEEDREAM, // Alias
}

/**
 * Get image model configuration by key
 * @param key Registry key (e.g., "chutes-chroma", "novita-qwen")
 * @returns Image model configuration, or undefined if not found
 */
export function getImageModelByKey(key: string): ImageModelConfig | undefined {
  return IMAGE_MODEL_REGISTRY[key.toLowerCase()]
}

/**
 * Get default image model configuration for a given model
 * @param model Model identifier (e.g., "chroma", "qwen-image", "hunyuan-image-3")
 * @param provider Optional provider hint (e.g., "chutes", "novita")
 * @returns Image model configuration, or default Chutes standard if not found
 */
export function getDefaultImageModel(model: string, provider?: string): ImageModelConfig {
  const modelLower = model.toLowerCase()
  const providerLower = provider?.toLowerCase() || ''

  // Try exact match first
  const exactKey = providerLower ? `${providerLower}-${modelLower}` : modelLower
  const exact = getImageModelByKey(exactKey)
  if (exact) return exact

  // Pattern matching
  if (modelLower.includes('chroma')) {
    return MODEL_CHUTES_CHROMA
  }
  if (modelLower.includes('qwen')) {
    return MODEL_NOVITA_QWEN
  }
  if (modelLower.includes('hunyuan')) {
    return MODEL_NOVITA_HUNYUAN
  }
  if (modelLower.includes('seedream')) {
    return MODEL_NOVITA_SEEDREAM
  }
  if (modelLower.includes('flux')) {
    return MODEL_CHUTES_CHROMA
  }

  // Default fallback
  return MODEL_CHUTES_CHROMA
}

/**
 * List of all available image model presets for UI display
 */
export const IMAGE_MODEL_PRESETS = [
  { id: 'chutes-chroma', name: 'Chutes - Chroma', config: MODEL_CHUTES_CHROMA },
  { id: 'novita-qwen', name: 'Novita - Qwen Image', config: MODEL_NOVITA_QWEN },
  { id: 'novita-hunyuan', name: 'Novita - Hunyuan Image 3', config: MODEL_NOVITA_HUNYUAN },
  { id: 'novita-seedream', name: 'Novita - Seedream 4.0', config: MODEL_NOVITA_SEEDREAM },
]
