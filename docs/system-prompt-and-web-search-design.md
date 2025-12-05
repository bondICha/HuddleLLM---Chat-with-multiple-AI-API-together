# HuddleLLM System Prompt & Web Search Design

## 用語

- **commonSystemMessage**  
  設定画面「Common System Message」に保存されている共通プロンプト。  
  デフォルト値は `DEFAULT_SYSTEM_MESSAGE`（HuddleLLM の説明や `{current_date}` 等の変数を含む）。

- **perBot systemMessage**  
  各カスタムボット（Custom API 設定）の「System Prompt」欄に書いたテキスト。

- **processedSystemMessage**  
  上記 2 つを `systemPromptMode` に従って合成し、  
  さらに `{current_date}`, `{language}` などのテンプレート変数を展開したもの。  
  これが「HuddleLLM が各 API に送る System Prompt 本体」。

- **Web Search Instructions**  
  `src/services/agent/prompts.ts` の `getWebSearchInstructions()` が返す  
  「## 🔍 Web Search Tool / 网络搜索工具 … JSON で action: web_search …」の長いブロック。  
  これは **processedSystemMessage の末尾に追記される形** でのみ登場する。

- **Native Web Tool**  
  モデル側が標準で持っている Web ツール:
  - OpenAI Responses: `web_search_preview`
  - Claude: `web_search_20250305`
  - Gemini API: `google_search`
  - OpenAI Image: image_generation ツール

---

## System Prompt の基本ポリシー

1. **全てのプロバイダに対し、HuddleLLM は常に processedSystemMessage を送る**  
   - ChatGPT / Claude / Gemini / OpenAI Responses / Vertex など、全ての Bot で、
     何らかの形（system ロール、`systemInstruction`、`instructions` など）で送信する。  
   - 例外は「processedSystemMessage が空文字列（trim して長さ 0）」の場合のみで、
     このときは System Prompt を送らない。

2. **Web Search Instructions の付与は、プロバイダとトグルで制御する**
   - `hasNativeWebToolSupport(provider, config)` が `false` のときのみ、
     `enhanceSystemPromptWithWebSearch()` により  
     `processedSystemMessage + Web Search Instructions` となる。
   - `hasNativeWebToolSupport(...)` が `true` の場合は、
     **Web Search Instructions を一切 append しない**。  
     （「Web search is OFF」のような OFF メッセージも含めて、何も付けない）

3. **Native Web Tool を持つプロバイダでは、Web Search の挙動は API 側に任せる**
   - OpenAI Responses（web_search_preview）
   - Claude API / Vertex Claude（web_search_20250305）
   - Gemini API（`google_search`）
   - OpenAI_Image（image_generation ツール）  
   では、HuddleLLM 側は **System Prompt で Web Agent JSON を教えたりはしない**。  
   Web Search の ON/OFF は API のツール指定（`tools`）と UI の「API Web Search」トグルだけで制御する。

---

## Provider 別の期待挙動

### 1. OpenAI Responses (`CustomApiProvider.OpenAI_Responses`)

- System Prompt:
  - 送る: `processedSystemMessage` を Responses API の `instructions` に設定。
  - ただし `processedSystemMessage.trim().length === 0` の場合は `instructions` 自体を送らない。
- Web Search:
  - Native Web Tool 対応として扱う（`hasNativeWebToolSupport === true`）。
  - HuddleLLM 独自の Web Search JSON 説明は **付けない**。
  - `webAccess` ON のときのみ、`body.tools = [{ type: 'web_search_preview' }]` を付与。

### 2. Claude (`CustomApiProvider.Anthropic`, `VertexAI_Claude`)

- System Prompt:
  - 送る: `processedSystemMessage` を Claude API の system フィールドとして渡す。
- Web Search:
  - Native Web Tool: `web_search_20250305`
  - `webAccess` ON なら Claude の web_search_20250305 を `tools` に付与。
  - HuddleLLM の Web Agent JSON は **追加しない**。

### 3. Gemini API （js-genai: `CustomApiProvider.Google`）

- System Prompt:
  - 送る: `processedSystemMessage` を `systemInstruction` として渡す。
- Web Search:
  - Native Web Tool: `googleSearch`
  - `webAccess` ON のときのみ `config.tools` に `{ googleSearch: {} }` を追加。
  - HuddleLLM の Web Agent JSON は **追加しない**。

### 4. VertexAI_Gemini (`CustomApiProvider.VertexAI_Gemini`)

- System Prompt:
  - 送る: `processedSystemMessage` を Vertex API リクエストの `systemInstruction.parts[0].text` として送信。
- Web Search:
  - `webAccess` は将来的に `tools: [{googleSearch:{}}]` にマッピングする想定。
  - HuddleLLM の Web Agent JSON は **付けない**。

### 5. OpenAI Chat / Bedrock / その他「Native Web Tool なし」のプロバイダ

- System Prompt:
  - 送る: `processedSystemMessage` を各 API の system 指定として渡す。
- Web Search:
  - `config.webAccess === true` のときだけ、
    `enhanceSystemPromptWithWebSearch(processedSystemMessage, true, language)` を呼び、
    Web Agent JSON 含む大きな説明を末尾に付与。
  - `config.webAccess === false` のときは、
    「現在 OFF」という短いメッセージだけを付ける。
