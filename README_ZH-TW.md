<p align="center">
    <img src="./src/assets/icon.png" width="150">
</p>

<h1 align="center">HuddleLLM</h1>

<div align="center">

### HuddleLLM 是一款全功能 Chatbot 客戶端

[English](README.md) &nbsp;&nbsp;|&nbsp;&nbsp; [简体中文](README_ZH-CN.md) &nbsp;&nbsp;|&nbsp;&nbsp; 繁體中文 &nbsp;&nbsp;|&nbsp;&nbsp; [日本語](README_JA.md)

##

### 安裝

#### 從應用商店安裝

<a href="https://chromewebstore.google.com/detail/huddlellm-oss-all-in-one/edjbcjkcabpmpcpnpfjfcehegjkacgod"><img src="https://user-images.githubusercontent.com/64502893/231991498-8df6dd63-727c-41d0-916f-c90c15127de3.png" width="200" alt="Get HuddleLLM for Chromium"></a> <a href="https://microsoftedge.microsoft.com/addons/detail/huddlellm-oss-%E3%82%AA%E3%83%BC%E3%83%AB%E3%82%A4%E3%83%B3%E3%83%AF%E3%83%B3%E3%83%81%E3%83%A3/kmphcofekafjmnpjegchboapjpgjhgch"><img src="https://user-images.githubusercontent.com/64502893/231991158-1b54f831-2fdc-43b6-bf9a-f894000e5aa8.png" width="160" alt="Get HuddleLLM for Microsoft Edge"></a>

> [!NOTE]
> 由於 Microsoft 審核流程較長，Edge 擴充功能更新可能延遲一週以上。建議優先從 Chrome Web Store 安裝。

#### 從原始碼建置
請參閱 [🔨 從原始碼建置](#-從原始碼建置)。

</div>

## 📷 螢幕截圖

![Screenshot](screenshots/extension.png?raw=true)

## ✨ 功能特性

- 🤖 在同一畫面同時與多個 AI 聊天並比較
- 🧩 一站式管理 Native API、OpenRouter 與 OpenAI 相容服務商
- 🖼️🎙️🎬📄 支援圖片、音訊、影片與 PDF 的多模態輸入
- 🌐 直接呼叫 OpenAI Responses / Claude / Gemini 的原生 Web 搜尋；其他模型可透過 Function Call 使用 HuddleLLM 內建的 Web 搜尋
- 🎨 除 Nano Banana 外，亦可透過結合 Chat 與 Image Generation 的 Image Agent 實現無縫產圖
- ⚙️ 可在 Chatbot 設定中設定思考等級與圖像生成參數，亦可透過 Quick Settings 面板依工作階段快速調整
- 🧠 由指定 AI 自動產生分頁標題
- 🪟 透過 Chrome Side Panel 開啟單一 Bot 進行快速對話
- 🎙️ 將語音轉為文字（OpenAI Whisper / Gemini）後送出
- 🔎 在網址列輸入 `hl <關鍵字>` 即可啟動 HuddleLLM（Omnibox 整合）
- 🔀 使用 `/btw` 指令開啟獨立彈出視窗，讓另一個 AI 分析、比較多個 AI 的回答
- 📚 自訂與社群提示詞庫
- 💾 對話歷史本機保存，支援完整還原
- 💾 支援設定與對話歷史等全部資料的匯入 / 匯出

完整更新日誌請參閱 [CHANGELOG.md](./CHANGELOG.md)。

## 🤖 支援的服務商 / Bot

### 原生 API
- **OpenAI**（Chat Completions / Responses API）
- **Google Gemini**（官方 `@google/genai` SDK；GenAI 或 Vertex）
- **Anthropic Claude**

### OpenAI 相容服務商
- **OpenRouter**（同時支援音訊與影片輸入）
- DeepSeek、Qwen、xAI Grok、Z.AI GLM
- Together AI、Fireworks AI、Hyperbolic、DeepInfra、Nebius
- 任意 OpenAI 相容端點

### 圖像生成（透過 Image Agent）
- OpenAI Image（DALL·E 3、gpt-image-1）
- Google Gemini（Imagen / 原生圖像）
- Chutes AI（Chroma、FLUX.1-dev）
- Novita AI（Qwen Image、Hunyuan Image 3、Seedream 4.0）
- Replicate（Google Imagen 4 等）

> [!NOTE]
> 功能可用性取決於具體服務商與模型。
> 例如：PDF 輸入支援 Gemini / Claude / OpenAI Responses；影片輸入目前支援 Gemini 與 OpenRouter。

## 🗂️ 多模態支援

| 輸入類型 | 支援的服務商 |
|---|---|
| 🖼️ 圖片 | OpenAI、Gemini、Claude、OpenRouter 等 |
| 🎵 音訊（WAV / MP3 / OGG） | Gemini（原生）、OpenRouter、OpenAI Whisper / Gemini（語音轉寫） |
| 🎬 影片 | Gemini、OpenRouter |
| 📄 PDF | Gemini、Claude、OpenAI Responses API |

## 🌐 原生 API Web 搜尋

直接呼叫各服務商自帶的 Web 搜尋工具，可在控制 Context Size 的同時取得穩定的結果：

- OpenAI Responses：`web_search_preview`
- Anthropic Claude：`web_search_20250305`
- Google Gemini：`google_search`（含參考 URL）

對於不支援原生搜尋工具的服務商，HuddleLLM 會回退到自家 Web Agent（將搜尋結果注入至 Prompt 中）。

## 🎨 Image Agent

將 LLM 的推理能力與圖像生成 API 結合的 Agent 型圖像生成系統：

1. 用自然語言描述你想要的圖片
2. LLM（Claude 或任意 OpenAI 相容模型）產生最佳圖像 Prompt
3. 圖像生成 API 完成產圖

支援 OpenAI Image、Google Gemini、Chutes AI、Novita AI、Replicate。

## 🔨 從原始碼建置

- 複製原始碼
- `corepack enable`
- `yarn install`
- `yarn build`
- 在 Chrome / Edge 中開啟擴充功能管理頁面（chrome://extensions 或 edge://extensions）
- 啟用開發者模式
- 將 `dist` 資料夾拖曳至頁面以載入（載入後請勿刪除該資料夾）

## 📜 隱私政策
◯ 本應用不會向外傳送，也不會收集任何使用者個人資訊。
◯ 對使用者在設定中主動啟用的 AI 服務，或透過使用者自訂 API 介面呼叫的服務，開發者不承擔任何責任亦不參與相關管理，由此產生的資料處理行為及風險均由使用者自行承擔。

## 📜 更新日誌

最新版本資訊請參閱 [CHANGELOG.md](./CHANGELOG.md)。
