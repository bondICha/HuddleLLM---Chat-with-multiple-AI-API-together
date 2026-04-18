<p align="center">
    <img src="./src/assets/icon.png" width="150">
</p>

<h1 align="center">HuddleLLM</h1>

<div align="center">

### HuddleLLM 是一款全功能 Chatbot 客户端

[English](README.md) &nbsp;&nbsp;|&nbsp;&nbsp; 简体中文 &nbsp;&nbsp;|&nbsp;&nbsp; [繁體中文](README_ZH-TW.md) &nbsp;&nbsp;|&nbsp;&nbsp; [日本語](README_JA.md)

##

### 安装

#### 从应用商店安装

<a href="https://chromewebstore.google.com/detail/huddlellm-oss-all-in-one/edjbcjkcabpmpcpnpfjfcehegjkacgod"><img src="https://user-images.githubusercontent.com/64502893/231991498-8df6dd63-727c-41d0-916f-c90c15127de3.png" width="200" alt="Get HuddleLLM for Chromium"></a> <a href="https://microsoftedge.microsoft.com/addons/detail/huddlellm-oss-%E3%82%AA%E3%83%BC%E3%83%AB%E3%82%A4%E3%83%B3%E3%83%AF%E3%83%B3%E3%83%81%E3%83%A3/kmphcofekafjmnpjegchboapjpgjhgch"><img src="https://user-images.githubusercontent.com/64502893/231991158-1b54f831-2fdc-43b6-bf9a-f894000e5aa8.png" width="160" alt="Get HuddleLLM for Microsoft Edge"></a>

> [!NOTE]
> 由于 Microsoft 审核流程较长，Edge 扩展更新可能延迟一周以上。建议优先从 Chrome Web Store 安装。

#### 从源代码构建
请参阅 [🔨 从源代码构建](#-从源代码构建)。

</div>

## 📷 截图

![Screenshot](screenshots/extension.png?raw=true)

## ✨ 功能特性

- 🤖 在同一界面同时与多个 AI 聊天和对比
- 🧩 一站式管理 Native API、OpenRouter 与 OpenAI 兼容服务商
- 🖼️🎙️🎬📄 支持图片、音频、视频与 PDF 的多模态输入
- 🌐 直接调用 OpenAI Responses / Claude / Gemini 的原生 Web 搜索；其他模型可通过 Function Call 使用 HuddleLLM 内建的 Web 搜索
- 🎨 除 Nano Banana 外，还可通过结合 Chat 与 Image Generation 的 Image Agent 实现无缝出图
- ⚙️ 可在 Chatbot 设置中配置思考等级与图像生成参数，也可通过 Quick Settings 面板按会话快速调整
- 🧠 由指定 AI 自动生成标签页标题
- 🪟 通过 Chrome Side Panel 打开单个 Bot 进行快速对话
- 🎙️ 将语音转为文字（OpenAI Whisper / Gemini）后发送
- 🔎 在地址栏输入 `hl <关键词>` 即可启动 HuddleLLM（Omnibox 集成）
- 🔀 使用 `/btw` 命令打开独立弹窗，让另一个 AI 分析、对比多个 AI 的回答
- 📚 自定义与社区提示词库
- 💾 会话历史本地保存，支持完整恢复
- 💾 支持设置与会话历史等全部数据的导入 / 导出

完整更新日志请参阅 [CHANGELOG.md](./CHANGELOG.md)。

## 🤖 支持的服务商 / Bot

### 原生 API
- **OpenAI**（Chat Completions / Responses API）
- **Google Gemini**（官方 `@google/genai` SDK；GenAI 或 Vertex）
- **Anthropic Claude**

### OpenAI 兼容服务商
- **OpenRouter**（同时支持音频与视频输入）
- DeepSeek、Qwen、xAI Grok、Z.AI GLM
- Together AI、Fireworks AI、Hyperbolic、DeepInfra、Nebius
- 任意 OpenAI 兼容端点

### 图像生成（通过 Image Agent）
- OpenAI Image（DALL·E 3、gpt-image-1）
- Google Gemini（Imagen / 原生图像）
- Chutes AI（Chroma、FLUX.1-dev）
- Novita AI（Qwen Image、Hunyuan Image 3、Seedream 4.0）
- Replicate（Google Imagen 4 等）

> [!NOTE]
> 功能可用性取决于具体服务商与模型。
> 例如：PDF 输入支持 Gemini / Claude / OpenAI Responses；视频输入目前支持 Gemini 与 OpenRouter。

## 🗂️ 多模态支持

| 输入类型 | 支持的服务商 |
|---|---|
| 🖼️ 图片 | OpenAI、Gemini、Claude、OpenRouter 等 |
| 🎵 音频（WAV / MP3 / OGG） | Gemini（原生）、OpenRouter、OpenAI Whisper / Gemini（语音转写） |
| 🎬 视频 | Gemini、OpenRouter |
| 📄 PDF | Gemini、Claude、OpenAI Responses API |

## 🌐 原生 API Web 搜索

直接调用各服务商自带的 Web 搜索工具，可在控制 Context Size 的同时获得稳定的结果：

- OpenAI Responses：`web_search_preview`
- Anthropic Claude：`web_search_20250305`
- Google Gemini：`google_search`（带参考 URL）

对于不支持原生搜索工具的服务商，HuddleLLM 会回退到自家 Web Agent（将搜索结果注入到 Prompt 中）。

## 🎨 Image Agent

将 LLM 的推理能力与图像生成 API 结合的 Agent 型图像生成系统：

1. 用自然语言描述你想要的图片
2. LLM（Claude 或任意 OpenAI 兼容模型）生成最佳图像 Prompt
3. 图像生成 API 完成出图

支持 OpenAI Image、Google Gemini、Chutes AI、Novita AI、Replicate。

## 🔨 从源代码构建

- 克隆源代码
- `corepack enable`
- `yarn install`
- `yarn build`
- 在 Chrome / Edge 中打开扩展管理页面（chrome://extensions 或 edge://extensions）
- 启用开发者模式
- 将 `dist` 文件夹拖入页面以加载（加载后请勿删除该文件夹）

## 📜 隐私政策
◯ 本应用不会向外发送，也不会收集任何用户个人信息。
◯ 对用户在设置中主动启用的 AI 服务，或通过用户自定义 API 接口调用的服务，开发者不承担任何责任亦不参与相关管理，由此产生的数据处理行为及风险均由用户自行承担。

## 📜 更新日志

最新版本信息请参阅 [CHANGELOG.md](./CHANGELOG.md)。
