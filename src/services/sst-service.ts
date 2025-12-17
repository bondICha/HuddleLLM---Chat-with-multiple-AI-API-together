import { GeminiApiBot } from '~app/bots/gemini-api';
import { getUserConfig, CustomApiProvider } from './user-config';

export interface TranscribeResult {
  text: string;
  error?: string;
}

export type OpenAIModel = 'whisper-1' | 'gpt-4o-mini-transcribe' | 'gpt-4o-transcribe' | 'gpt-4o-transcribe-diarize';

/**
 * Transcribe audio using OpenAI API
 */
export async function transcribeWithOpenAI(
  file: File,
  providerId: string,
  model: OpenAIModel
): Promise<TranscribeResult> {
  try {
    // Get user config to resolve API key and host
    const config = await getUserConfig();

    // Find the provider config
    const providerConfig = config.providerConfigs?.find(p => p.id === providerId);

    if (!providerConfig) {
      throw new Error('OpenAI provider configuration not found');
    }

    // Resolve API Key with fallback to common settings (same logic as Gemini)
    const effectiveApiKey =
      (providerConfig.apiKey && providerConfig.apiKey.trim().length > 0)
        ? providerConfig.apiKey
        : config.customApiKey;

    if (!effectiveApiKey || effectiveApiKey.trim().length === 0) {
      throw new Error('API key for OpenAI provider is not configured');
    }

    // Resolve base URL
    const effectiveBaseUrl = providerConfig.host.trim()

    const formData = new FormData();
    formData.append('file', file, file.name); // Explicitly set filename
    formData.append('model', model);
    formData.append('response_format', 'json');

    // Construct URL
    const url = `${effectiveBaseUrl.replace(/\/$/, '')}/audio/transcriptions`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${effectiveApiKey}`,
        // Content-Type is set automatically for FormData
      },
      body: formData
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `OpenAI API Error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return { text: data.text };

  } catch (error) {
    console.error('OpenAI Transcription failed:', error);
    return { 
      text: '', 
      error: error instanceof Error ? error.message : 'Unknown error during transcription' 
    };
  }
}

/**
 * Transcribe audio using Gemini Bot (created from config)
 */
export async function transcribeWithGemini(
  file: File,
  botIndex: number
): Promise<TranscribeResult> {
  try {
    const {
      customApiKey,
      customApiHost,
      customApiConfigs,
      isCustomApiHostFullPath,
      providerConfigs,
    } = await getUserConfig();

    const config = customApiConfigs[botIndex];
    if (!config) {
      throw new Error('Gemini bot configuration not found');
    }

    // Resolve provider reference (if any)
    const providerRef = config.providerRefId
      ? (providerConfigs || []).find((p) => p.id === config.providerRefId)
      : undefined;

    const effectiveProvider =
      providerRef?.provider ??
      (config.provider ||
        (config.model.includes('gemini') ? CustomApiProvider.Google : CustomApiProvider.OpenAI));

    if (
      effectiveProvider !== CustomApiProvider.Google &&
      effectiveProvider !== CustomApiProvider.VertexAI_Gemini
    ) {
      throw new Error('Selected bot is not Gemini-compatible');
    }

    const effectiveHost =
      (providerRef?.host && providerRef.host.trim().length > 0)
        ? providerRef.host
        : (config.host && config.host.trim().length > 0)
          ? config.host
          : customApiHost;

    const effectiveIsHostFullPath = providerRef
      ? (providerRef.isHostFullPath ?? false)
      : (config.host && config.host.trim().length > 0)
        ? (config.isHostFullPath ?? false)
        : isCustomApiHostFullPath;

    const effectiveApiKey =
      (providerRef?.apiKey && providerRef.apiKey.trim().length > 0)
        ? providerRef.apiKey
        : (config.apiKey || customApiKey);

    if (!effectiveApiKey || effectiveApiKey.trim().length === 0) {
      throw new Error('API key for Gemini provider is not configured');
    }

    const googleAuthMode = providerRef?.AuthMode || 'header';
    const extraHeaders: Record<string, string> = {};
    if (googleAuthMode === 'header' && effectiveApiKey.trim().length > 0) {
      // Gateway-style auth: raw key in Authorization header
      extraHeaders.Authorization = effectiveApiKey;
    }

    // Resolve Vertex AI mode: Provider setting takes precedence
    const vertexMode = providerRef?.VertexMode ?? config.geminiVertexMode ?? false;

    // For Vertex AI gateways, host is usually a full path
    const baseUrl =
      effectiveHost && effectiveHost.trim().length > 0
        ? effectiveHost
        : undefined;

    // Create a temporary bot instance
    const bot = new GeminiApiBot({
      geminiApiKey: effectiveApiKey,
      geminiApiModel: config.model || 'gemini-1.5-flash', // Default to flash for speed
      geminiApiTemperature: 0,
      vertexai: vertexMode,
      baseUrl: effectiveIsHostFullPath ? baseUrl : baseUrl, // Respect custom endpoints; SDK handles full paths
      extraHeaders,
    });

    let transcribedText = '';
    
    const controller = new AbortController();
    
    // Use the bot's sendMessage capability
    const stream = bot.sendMessage({
      prompt: "Please transcribe this audio file accurately. Output ONLY the transcribed text, without any introductory or concluding remarks.",
      audioFiles: [file],
      signal: controller.signal
    });

    for await (const chunk of stream) {
      if (chunk.text) {
        transcribedText = chunk.text;
      }
    }

    return { text: transcribedText };

  } catch (error) {
    console.error('Gemini Transcription failed:', error);
    return { 
      text: '', 
      error: error instanceof Error ? error.message : 'Unknown error during transcription' 
    };
  }
}
