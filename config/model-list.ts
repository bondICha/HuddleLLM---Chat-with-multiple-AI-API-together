import { ModelInfo } from '../src/services/user-config'

// モデルリストをプロバイダーごとに階層化
export const MODEL_LIST: Record<string, Record<string, string | ModelInfo>> = {
    "OpenAI": {
        "GPT-5": "gpt-5",
        "GPT-5 Chat": "gpt-5-chat-latest",
        "GPT-4.1": "gpt-4.1",
        "GPT-4.1 mini": "gpt-4.1-mini",
    },
    "Anthropic": {
        "Claude Sonnet 4.5": "claude-sonnet-4-5",
        "Claude Opus 4.1": "claude-opus-4-1",
        "Claude Haiku 3.5": "claude-haiku-4-5",
    },
    "Google": {
        "Gemini 2.5 Pro": "gemini-2.5-pro",
        "Gemini 2.5 Flash": "gemini-2.5-flash",
        "Nano Banana": "gemini-2.5-flash-image",
    },
    "Grok": {
        "Grok 4": "grok-4",
        "Grok 4 Fast": "grok-4-fast",
        "Grok Code Fast": "grok-code-fast-1",
    },
    "Deepseek": {
        "Deepseek Chat": "deepseek-chat",
        "Deepseek Reasoner": "deepseek-reasoner",
    },
    "Perplexity": {
        "Sonar Pro": { value: "sonar-pro", icon: "perplexity" },
        "Sonar": { value: "sonar", icon: "perplexity" },
        "Sonar Deep Research": { value: "sonar-deep-research", icon: "perplexity" },
        "Sonar Reasoning Pro": { value: "sonar-reasoning-pro", icon: "perplexity" },
        "Sonar Reasoning": { value: "sonar-reasoning", icon: "perplexity" },
    },
    "Rakuten": {
        "DeepSeek-R1": "DeepSeek-R1",
        "RakutenAI-2.0-MoE": "RakutenAI-2.0-MoE",
        "Rakuten-AI 3.0": "rakutenai-3.0",
        "RakutenAI-7B-instruct": "RakutenAI-7B-instruct",
        "DeepSeek-V3": "DeepSeek-V3",
        "RakutenAI-2.0-Mini-1.5B": "RakutenAI-2.0-Mini-1.5B",
    },
    "Qwen": {
        // 商用モデル - Tongyiロゴ
        "Qwen-Max": { value: "qwen-max", icon: "tongyi" },
        "Qwen-Plus": { value: "qwen-plus", icon: "tongyi" },
        "Qwen-Flash": { value: "qwen-flash", icon: "tongyi" },
        "Qwen-Turbo": { value: "qwen-turbo", icon: "tongyi" },
        "通义千问3-VL-Plus": { value: "qwen3-vl-plus", icon: "tongyi" },
        "Qwen-VL-Max": { value: "qwen-vl-max", icon: "tongyi" },
        "Qwen-VL-Max-Latest": { value: "qwen-vl-max-latest", icon: "tongyi" },
        "Qwen-OCR": { value: "qwen-vl-ocr", icon: "tongyi" },
        "Qwen-OCR-Latest": { value: "qwen-vl-ocr-latest", icon: "tongyi" },
        "Qwen-Coder-Plus": { value: "qwen3-coder-plus", icon: "tongyi" },
        "Qwen-Deep-Research": { value: "qwen-deep-research", icon: "tongyi" },

        // オープンソースモデル - Qianwenロゴ
        "Qwen3-235B-A22B-Thinking-2507": { value: "qwen3-235b-a22b-thinking-2507", icon: "qianwen" },
        "Qwen3-235B-A22B-Instruct-2507": { value: "qwen3-235b-a22b-instruct-2507", icon: "qianwen" },

        "通义千问3-VL-235B-A22B-Thinking": { value: "qwen3-vl-235b-a22b-thinking", icon: "qianwen" },
        "通义千问3-VL-235B-A22B-Instruct": { value: "qwen3-vl-235b-a22b-instruct", icon: "qianwen" },
        "Qwen-Coder-480B-A35B-Instruct": { value: "qwen3-coder-480b-a35b-instruct", icon: "qianwen" },
    },
    // ベンダー特有のモデルIDを「Custom」カテゴリとして追加
    "Replicate": {
        // Image generation models
        "Google Imagen 4": { value: "google/imagen-4", icon: "replicate" },
        "Google Imagen 4 Fast": { value: "google/imagen-4-fast", icon: "replicate" },
        "Tencent Hunyuan Image 3": { value: "tencent/hunyuan-image-3", icon: "replicate" },
        "ByteDance Seedream 4.0": { value: "bytedance/seedream-4", icon: "replicate" },
    },
    "Custom": {
        // Bedrock用のGeminiモデル
        "Google Gemini 2.5 Flash": { value: "google/gemini-2.5-flash", icon: "gemini" },
        "Google Gemini 2.5 Pro": { value: "google/gemini-2.5-pro", icon: "gemini" },
        "OpenAI/GPT-OSS-120b": { value: "openai/gpt-oss-120b", icon: "openai" },
        "OpenAI/GPT-OSS-20b": { value: "openai/gpt-oss-20b", icon: "openai" },
        "通义千问/Qwen3-Coder-480B-A35B-Instruct": { value: "Qwen/Qwen3-Coder-480B-A35B-Instruct", icon: "qianwen" },
        "通义千问/Qwen3-235B-A22B-Thinking-2507": { value: "Qwen/Qwen3-235B-A22B-Thinking-2507", icon: "qianwen" },
        "通义千问/Qwen3-235B-A22B-Instruct-2507": { value: "Qwen/Qwen3-235B-A22B-Instruct-2507", icon: "qianwen" },
        "通义千问/Qwen3 VL 235B A22B Instruct": { value: "qwen/qwen3-vl-235b-a22b-instruct", icon: "qianwen" },
        "通义千问/Qwen3 VL 235B A22B Thinking": { value: "qwen/qwen3-vl-235b-a22b-thinking", icon: "qianwen" },
        "DeepSeek/DeepSeek-V3.1": { value: "deepseek-ai/DeepSeek-V3.1", icon: "deepseek" },
        "DeepSeek/DeepSeek-R1": { value: "deepseek-ai/DeepSeek-R1", icon: "deepseek" },
        "moonshotai/Kimi-K2-Instruct": { value: "moonshotai/Kimi-K2-Instruct", icon: "kimi" },
        "moonshotai/Kimi-K2-Instruct-0905": { value: "moonshotai/Kimi-K2-Instruct-0905", icon: "kimi" },
        // Zhipu AI (zai-org) models
        "GLM-4.6": { value: "zai-org/glm-4.6", icon: "zhipu" },
        "GLM-4.5V (Multimodal)": { value: "zai-org/glm-4.5v", icon: "zhipu" },
    },
}