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
export interface ToolDefinitionWithMeta {
  /** Tool definition in Claude format */
  definition: ToolDefinition
  /** Whether this model supports image editing (img2img) */
  supportsEdit: boolean
  /** Function to select the correct endpoint based on whether images are provided */
  endpointSelector?: (hasImages: boolean, baseHost: string) => string
}

/**
 * Default tool definitions for currently supported models
 */

/**
 * 1. Chutes AI - Chroma (and other standard SD models like FLUX.1-dev)
 * API: https://image.chutes.ai/generate
 * Edit support: No
 */
export const TOOL_CHUTES_CHROMA: ToolDefinitionWithMeta = {
  definition: {
    name: 'generate_image',
    description: 'Generate an image using Chroma model. Use this when the user asks to create, generate, or make an image.',
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
          default: 1024,
        },
        height: {
          type: 'number',
          description: 'Image height in pixels',
          default: 1024,
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
  supportsEdit: false,
}

/**
 * 2. Novita AI - Qwen Image
 * API: https://api.novita.ai/v3/async/qwen-image-txt2img (txt2img)
 *      https://api.novita.ai/v3/async/qwen-image-edit (edit)
 * Edit support: Yes - different endpoints
 */
export const TOOL_NOVITA_QWEN: ToolDefinitionWithMeta = {
  definition: {
    name: 'generate_image',
    description: 'Generate or edit an image using Qwen Image model. If images are provided, edit them based on the prompt. Otherwise, generate a new image from text.',
    input_schema: {
      type: 'object',
      properties: {
        prompt: {
          type: 'string',
          description: 'Text description for image generation or editing instructions',
        },
        images: {
          type: 'array',
          description: 'Optional: Images to edit (base64 encoded or URLs). Only include if user provided images and wants to edit them.',
          items: { type: 'string' },
        },
        size: {
          type: 'string',
          description: 'Image size in format "WIDTH*HEIGHT" (e.g., "1024*1024", "1536*1024"). Use larger sizes for higher quality. Range: 256-1536 per dimension.',
          default: '1024*1024',
        },
        seed: {
          type: 'number',
          description: 'Random seed for reproducibility. Use a specific number (e.g., 42) if the user wants consistent results, or omit/-1 for random generation.',
          default: -1,
        },
        output_format: {
          type: 'string',
          description: 'Output image format. Use "png" for images requiring transparency, "webp" for smaller file size, or "jpeg" for standard use.',
          enum: ['jpeg', 'png', 'webp'],
          default: 'jpeg',
        },
      },
      required: ['prompt'],
    },
  },
  supportsEdit: true,
  endpointSelector: (hasImages: boolean, baseHost: string) => {
    const cleanHost = baseHost.replace(/\/$/, '')
    return hasImages
      ? `${cleanHost}/v3/async/qwen-image-edit`
      : `${cleanHost}/v3/async/qwen-image-txt2img`
  },
}

/**
 * 3. Novita AI - Hunyuan Image 3
 * API: https://api.novita.ai/v3/async/hunyuan-image-3
 * Edit support: No
 */
export const TOOL_NOVITA_HUNYUAN: ToolDefinitionWithMeta = {
  definition: {
    name: 'generate_image',
    description: 'Generate an image using Hunyuan Image 3 model. Use this when the user asks to create, generate, or make an image.',
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
  supportsEdit: false,
  endpointSelector: (_hasImages: boolean, baseHost: string) => {
    const cleanHost = baseHost.replace(/\/$/, '')
    return `${cleanHost}/v3/async/hunyuan-image-3`
  },
}

/**
 * 4. Novita AI - Seedream 4.0
 * API: https://api.novita.ai/v3/async/seedream-4-0 (single endpoint for both txt2img and edit)
 * Edit support: Yes - same endpoint, images parameter optional
 */
export const TOOL_NOVITA_SEEDREAM: ToolDefinitionWithMeta = {
  definition: {
    name: 'generate_image',
    description: 'Generate or edit images using Seedream 4.0 model. Supports up to 10 input images for editing or reference.',
    input_schema: {
      type: 'object',
      properties: {
        prompt: {
          type: 'string',
          description: 'Detailed text description for image generation. Recommended: under 600 words in English.',
        },
        images: {
          type: 'array',
          description: 'Optional: Up to 10 images (base64 encoded or URLs) for editing or as reference. Max 10MB each, JPEG/PNG supported.',
          items: { type: 'string' },
        },
        size: {
          type: 'string',
          description: 'Image resolution. Use "1K", "2K", "4K" or "WIDTHxHEIGHT" format (e.g., "2048x2048")',
          default: '2048x2048',
        },
        sequential_image_generation: {
          type: 'string',
          description: 'Enable sequential generation mode',
          enum: ['auto', 'disabled'],
          default: 'disabled',
        },
        max_images: {
          type: 'number',
          description: 'Maximum number of images to generate (only applies when sequential_image_generation is "auto")',
          default: 15,
        },
        watermark: {
          type: 'boolean',
          description: 'Add watermark to bottom-right corner',
          default: false,
        },
      },
      required: ['prompt'],
    },
  },
  supportsEdit: true,
  endpointSelector: (_hasImages: boolean, baseHost: string) => {
    const cleanHost = baseHost.replace(/\/$/, '')
    return `${cleanHost}/v3/async/seedream-4-0`
  },
}

/**
 * Registry of all available tool definitions
 * Key format: "provider-model" (e.g., "chutes-chroma", "novita-qwen")
 */
export const TOOL_DEFINITION_REGISTRY: Record<string, ToolDefinitionWithMeta> = {
  'chutes-chroma': TOOL_CHUTES_CHROMA,
  'chutes-flux': TOOL_CHUTES_CHROMA, // Alias - uses same format
  'novita-qwen': TOOL_NOVITA_QWEN,
  'novita-hunyuan': TOOL_NOVITA_HUNYUAN,
  'novita-hunyuan-image-3': TOOL_NOVITA_HUNYUAN, // Alias
  'novita-seedream': TOOL_NOVITA_SEEDREAM,
  'novita-seedream-4': TOOL_NOVITA_SEEDREAM, // Alias
}

/**
 * Get tool definition by key
 * @param key Registry key (e.g., "chutes-chroma", "novita-qwen")
 * @returns Tool definition with metadata, or undefined if not found
 */
export function getToolDefinitionByKey(key: string): ToolDefinitionWithMeta | undefined {
  return TOOL_DEFINITION_REGISTRY[key.toLowerCase()]
}

/**
 * Get default tool definition for a given model
 * @param model Model identifier (e.g., "chroma", "qwen-image", "hunyuan-image-3")
 * @param provider Optional provider hint (e.g., "chutes", "novita")
 * @returns Tool definition with metadata, or default Chutes standard if not found
 */
export function getDefaultToolDefinition(model: string, provider?: string): ToolDefinitionWithMeta {
  const modelLower = model.toLowerCase()
  const providerLower = provider?.toLowerCase() || ''

  // Try exact match first
  const exactKey = providerLower ? `${providerLower}-${modelLower}` : modelLower
  const exact = getToolDefinitionByKey(exactKey)
  if (exact) return exact

  // Pattern matching
  if (modelLower.includes('chroma')) {
    return TOOL_CHUTES_CHROMA
  }
  if (modelLower.includes('qwen')) {
    return TOOL_NOVITA_QWEN
  }
  if (modelLower.includes('hunyuan')) {
    return TOOL_NOVITA_HUNYUAN
  }
  if (modelLower.includes('seedream')) {
    return TOOL_NOVITA_SEEDREAM
  }
  if (modelLower.includes('flux')) {
    return TOOL_CHUTES_CHROMA
  }

  // Default fallback
  return TOOL_CHUTES_CHROMA
}

/**
 * List of all available tool definition presets for UI display
 */
export const TOOL_DEFINITION_PRESETS = [
  { id: 'chutes-chroma', name: 'Chutes - Chroma', definition: TOOL_CHUTES_CHROMA },
  { id: 'novita-qwen', name: 'Novita - Qwen Image', definition: TOOL_NOVITA_QWEN },
  { id: 'novita-hunyuan', name: 'Novita - Hunyuan Image 3', definition: TOOL_NOVITA_HUNYUAN },
  { id: 'novita-seedream', name: 'Novita - Seedream 4.0', definition: TOOL_NOVITA_SEEDREAM },
]
