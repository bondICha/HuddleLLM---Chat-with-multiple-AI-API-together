import { CustomApiProvider } from '~services/user-config'

export type ApiSchemeOption = { name: string; value: CustomApiProvider }

export function getApiSchemeOptions(): ApiSchemeOption[] {
  return [
    { name: 'OpenAI Compatible (Completion)', value: CustomApiProvider.OpenAI },
    { name: 'OpenAI Responses API (Beta)', value: CustomApiProvider.OpenAI_Responses },
    { name: 'OpenAI Image (gpt-image-1, Beta)', value: CustomApiProvider.OpenAI_Image },
    { name: 'Anthropic Claude API', value: CustomApiProvider.Anthropic },
    { name: 'AWS Bedrock (Anthropic)', value: CustomApiProvider.Bedrock },
    { name: 'Google Gemini (OpenAI Format)', value: CustomApiProvider.GeminiOpenAI },
    { name: 'Qwen (OpenAI Format)', value: CustomApiProvider.QwenOpenAI },
    { name: 'VertexAI (Claude)', value: CustomApiProvider.VertexAI_Claude },
    { name: 'Google Gemini (Image, Beta)', value: CustomApiProvider.VertexAI_Gemini },
    { name: 'Google Gemini API (Deprecated)', value: CustomApiProvider.Google },
  ]
}

