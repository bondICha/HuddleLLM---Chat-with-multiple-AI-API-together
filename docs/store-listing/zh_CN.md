# Chrome Web Store / Edge 加载项 — 商店详情（简体中文）

## Short Description（132字以内）

同时与ChatGPT、Gemini、Claude等多个AI对话比较，支持图片/音频/视频/PDF，原生网络搜索、AI图像生成、侧边栏与地址栏快速启动。

---

## Overview（标题）

同时使用 ChatGPT、Gemini、Claude 等多个 AI 聊天机器人

---

## Full Description

同时与多个 AI 聊天机器人对话的 Chrome 扩展程序。

HuddleLLM 让你同时向多个 AI 提问，轻松比较它们的回答，快速找到最佳答案。

**使用场景**

询问编程问题时，可以比较不同 AI 的回答，选出最简洁高效的代码。
寻求文案修改建议时，可以从多个视角获得更全面的反馈。
使用 /btw 命令，还可以将多个 AI 的回答一并发送给另一个 AI，进行更深入的交叉比较分析。

**主要功能**

- 在同一界面同时与 ChatGPT、Gemini、Claude 等多个 AI 对话并比较
- 原生 Web 搜索：OpenAI Responses、Claude、Gemini 直接调用各自的官方搜索工具。其他提供商回退至 HuddleLLM 内置的 Web 搜索（Function Call 方式）
- 多模态输入：图片、音频、视频与 PDF
- Image Agent：用自然语言描述想要的图片，由 LLM 生成优化后的提示词再调用图像生成 API（支持 OpenAI Image、Gemini、Chutes AI、Novita AI、Replicate）
- Quick Settings 面板：按会话快速调整思考等级与图像生成参数
- Chrome 侧边栏：无需离开当前标签页，即可快速打开单个 Bot 对话
- Omnibox 集成：在地址栏输入 `hl <关键词>` 即可瞬间启动
- 语音转文字：通过 OpenAI Whisper 或 Gemini 将音频转为文字后发送
- 自定义与社区提示词库
- 会话历史本地保存，支持完整恢复与导入 / 导出

**支持的服务商**

原生 API：OpenAI（Chat Completions / Responses API）、Google Gemini、Anthropic Claude

OpenAI 兼容：OpenRouter、DeepSeek、Qwen、xAI Grok、Z.AI GLM、Together AI、Fireworks AI、Hyperbolic、DeepInfra、Nebius 及任意自定义端点

**隐私说明**

所有数据（API 密钥、会话历史）仅保存在浏览器本地。无遥测、无需账号、不向 HuddleLLM 服务器发送任何数据。

---

## 近期更新

- 由指定 AI 自动生成标签页标题
- 视频输入支持（Gemini / OpenRouter）
- /btw 独立弹窗：将多个 AI 的回答发送给另一个 AI 进行比较分析
- PDF 支持（Gemini / Claude / OpenAI Responses API）
- Quick Settings 面板（按会话调整思考等级与图像生成参数）
- 音频输入与语音转文字（OpenAI Whisper / Gemini）
- 原生 API Web 搜索（OpenAI Responses、Claude、Gemini）
- Image Agent AI 图像生成（多服务商支持）
- Chrome 侧边栏支持
- Omnibox 集成（`hl <关键词>`）
