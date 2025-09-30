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
        "Claude Haiku 3.5": "claude-3-5-haiku-latest",
    },
    "Google": {
        "Gemini 2.5 Pro": "gemini-2.5-pro",
        "Gemini 2.5 Flash": "gemini-2.5-flash",
    },
    "Grok": {
        "Grok 4": "grok-4",
        "Grok 3 Mini": "grok-3-mini",
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
        "Rakuten-AI-3.0-Alpha": "Rakuten-AI-3.0-Alpha",
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
        "Qwen-VL-Max": { value: "qwen-vl-max", icon: "tongyi" },
        "Qwen-VL-Max-Latest": { value: "qwen-vl-max-latest", icon: "tongyi" },
        "Qwen-OCR": { value: "qwen-vl-ocr", icon: "tongyi" },
        "Qwen-OCR-Latest": { value: "qwen-vl-ocr-latest", icon: "tongyi" },
        "Qwen-Coder-Plus": { value: "qwen3-coder-plus", icon: "tongyi" },
        "Qwen-Deep-Research": { value: "qwen-deep-research", icon: "tongyi" },

        // オープンソースモデル - Qianwenロゴ
        "Qwen3-235B-A22B-Thinking-2507": { value: "qwen3-235b-a22b-thinking-2507", icon: "qianwen" },
        "Qwen3-235B-A22B-Instruct-2507": { value: "qwen3-235b-a22b-instruct-2507", icon: "qianwen" },

        "Qwen-VL-72B-Instruct": { value: "qwen2.5-vl-72b-instruct", icon: "qianwen" },
        "Qwen-Coder-480B-A35B-Instruct": { value: "qwen3-coder-480b-a35b-instruct", icon: "qianwen" },
    },
    // ベンダー特有のモデルIDを「Custom」カテゴリとして追加
    "Custom": {
        // Bedrock用のGeminiモデル
        "Google Gemini 2.5 Flash": { value: "google/gemini-2.5-flash", icon: "gemini" },
        "Google Gemini 2.5 Pro": { value: "google/gemini-2.5-pro", icon: "gemini" },
        // Bedrock用のClaudeモデル
        "Claude Sonnet 4.5 (Bedrock, US)": { value: "us.anthropic.claude-sonnet-4-5-20250929-v1:0", icon: "anthropic" },
        "Claude Sonnet 4.5 (Bedrock)": { value: "anthropic.claude-sonnet-4-5-20250929-v1:0", icon: "anthropic" },
        "Claude 3.5 Haiku (Bedrock)": { value: "anthropic.claude-3-5-haiku-20241022-v1:0", icon: "anthropic" },
        "OpenAI/GPT-OSS-120b": { value: "openai/gpt-oss-120b", icon: "openai" },
        "OpenAI/GPT-OSS-20b": { value: "openai/gpt-oss-20b", icon: "openai" },
        "通义千问/Qwen3-Coder-480B-A35B-Instruct": { value: "Qwen/Qwen3-Coder-480B-A35B-Instruct", icon: "qianwen" },
        "通义千问/Qwen3-235B-A22B-Thinking-2507": { value: "Qwen/Qwen3-235B-A22B-Thinking-2507", icon: "qianwen" },
        "通义千问/Qwen3-235B-A22B-Instruct-2507": { value: "Qwen/Qwen3-235B-A22B-Instruct-2507", icon: "qianwen" },
        "DeepSeek/DeepSeek-V3.1": { value: "deepseek-ai/DeepSeek-V3.1", icon: "deepseek" },
        "DeepSeek/DeepSeek-R1": { value: "deepseek-ai/DeepSeek-R1", icon: "deepseek" },
        "moonshotai/Kimi-K2-Instruct": { value: "moonshotai/Kimi-K2-Instruct", icon: "kimi" },
        "moonshotai/Kimi-K2-Instruct-0905": { value: "moonshotai/Kimi-K2-Instruct-0905", icon: "kimi" },
        // Zhipu AI (zai-org) models
        "GLM-4.5": { value: "zai-org/glm-4.5", icon: "zhipu" },
        "GLM-4.5V (Multimodal)": { value: "zai-org/glm-4.5v", icon: "zhipu" },
    },
}