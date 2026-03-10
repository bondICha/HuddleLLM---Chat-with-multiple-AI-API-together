import { ModelInfo } from '../src/services/user-config'

// モデルリストをプロバイダーごとに階層化
export const MODEL_LIST: Record<string, Record<string, string | ModelInfo>> = {
    "OpenAI": {
        "GPT-5.2": "gpt-5.2",
        "GPT-5.2 Pro": "gpt-5.2-pro",
        "GPT-5.3 Codex": "gpt-5.3-codex"

    },
    "Anthropic": {
        "Claude Opus 4.6": "claude-opus-4-6",
        "Claude Sonnet 4.6": "claude-sonnet-4-6",
        "Claude Haiku 4.5": "claude-haiku-4-5",
    },
    "Google": {
        "Gemini 2.5 Pro": "gemini-2.5-pro",
        "Gemini 3 Pro": "gemini-3-pro-preview",
        "Gemini 3 Pro Image": "gemini-3-pro-image-preview",
        "Nano Banana2": "gemini-3.1-flash-image-preview",
    },
    "Grok": {
        "Grok 4": "grok-4",
        "Grok 4 Fast": "grok-4-1-fast",
        "Grok 4.1 Fast NR": "grok-4-1-fast-non-reasoning",
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
        "RakutenAI-3.0": "rakutenai-3.0",
        "RakutenAI-2.0-MoE": "RakutenAI-2.0-MoE",
        "DeepSeek-R1": "DeepSeek-R1",
        "DeepSeek-V3": "DeepSeek-V3",
    },
    "Qwen": {
        // 商用モデル - Tongyiロゴ
        "Qwen3-Max": { value: "qwen3-max", icon: "tongyi" },
        "Qwen3.5-Plus": { value: "qwen3.5-plus", icon: "tongyi" },
        "Qwen3.5-Flash": { value: "qwen3.5-flash", icon: "tongyi" },
        "Qwen-Turbo": { value: "qwen-turbo", icon: "tongyi" },
        "通义千问3-VL-Plus": { value: "qwen3-vl-plus", icon: "tongyi" },
        "通义千问3-VL-Flash": { value: "qwen3-vl-flash", icon: "tongyi" },
        "Qwen-OCR": { value: "qwen-vl-ocr", icon: "tongyi" },
        "Qwen-Coder-Plus": { value: "qwen3-coder-plus", icon: "tongyi" },
        "Qwen-Deep-Research": { value: "qwen-deep-research", icon: "tongyi" },

        // オープンソースモデル - Qianwenロゴ
        "Qwen3.5-397B-A17B": { value: "qwen3.5-397b-a17b", icon: "qianwen" },
        "Qwen3.5-122B-A10B": { value: "qwen3.5-122b-a10b", icon: "qianwen" },

        "通义千问3-VL-235B-A22B-Thinking": { value: "qwen3-vl-235b-a22b-thinking", icon: "qianwen" },
        "通义千问3-VL-235B-A22B-Instruct": { value: "qwen3-vl-235b-a22b-instruct", icon: "qianwen" },
        "Qwen-Coder-480B-A35B-Instruct": { value: "qwen3-coder-480b-a35b-instruct", icon: "qianwen" },
    },
    
    "Custom": {
        // OpenRouter用のGeminiモデル
        "Google Gemini 2.5 Flash": { value: "google/gemini-2.5-flash", icon: "gemini" },
        "Google Gemini 2.5 Pro": { value: "google/gemini-2.5-pro", icon: "gemini" },
        "Google Gemini 3 Pro": { value: "google/gemini-3-pro-preview", icon: "gemini" },
        "OpenAI/GPT-OSS-120b": { value: "openai/gpt-oss-120b", icon: "openai" },
        "OpenAI/GPT-OSS-20b": { value: "openai/gpt-oss-20b", icon: "openai" },
        "通义千问/Qwen3.5-397B-A17B": { value: "qwen/qwen3.5-397b-a17b", icon: "qianwen" },
        "通义千问/Qwen3.5-122B-A10B": { value: "qwen/qwen3.5-122b-a10b", icon: "qianwen" },
        "通义千问/Qwen3.5-35B-A3B": { value: "qwen/qwen3.5-35b-a3b", icon: "qianwen" },
        "通义千问/Qwen3 VL 235B A22B Instruct": { value: "qwen/qwen3-vl-235b-a22b-instruct", icon: "qianwen" },
        "通义千问/Qwen3 VL 235B A22B Thinking": { value: "qwen/qwen3-vl-235b-a22b-thinking", icon: "qianwen" },
        "DeepSeek/DeepSeek-V3.2": { value: "deepseek/deepseek-v3.2", icon: "deepseek" },
        "DeepSeek/DeepSeek-V3.2-Exp": { value: "deepseek/deepseek-v3.2-exp", icon: "deepseek" },
        "DeepSeek/DeepSeek-R1": { value: "deepseek/deepseek-r1-0528", icon: "deepseek" },
        "moonshotai/Kimi-K2.5": { value: "moonshotai/kimi-k2.5", icon: "kimi" },
        "MiniMax/MiniMax-M2.5": { value: "minimax/minimax-m2.5", icon: "minimax" },
        "Xiaomi/MiMo-V2-Flash": { value: "xiaomimimo/mimo-v2-flash", icon: "xiaomi" },
        // Zhipu AI (zai-org) models
        "GLM-5": { value: "zai-org/glm-5", icon: "zhipu" },
        "GLM-4.7": { value: "zai-org/glm-4.7", icon: "zhipu" },
        "GLM-4.7 Flash": { value: "zai-org/glm-4.7-flash", icon: "zhipu" },
        "GLM-4.6V (Multimodal)": { value: "zai-org/glm-4.6v", icon: "zhipu" },
    },
}
