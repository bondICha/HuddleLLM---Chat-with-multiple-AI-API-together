# 画像生成機能 実装計画 (最終版)

## 概要

Chatbot設定に「画像生成」機能を追加し、既存のチャットボットがTool-useを介して画像を生成できるようにする。

## アーキテクチャ

- **関心の分離**: チャット機能と画像生成機能を明確に分離する。
- **画像ジェネレーター**: 画像生成APIの認証情報や設定を「画像ジェネレーター」として独立して管理する。
- **Tool-use連携**: 各チャットボットの設定画面で、使用する「画像ジェネレーター」を紐付け、Toolとして画像生成機能を有効化する。

```mermaid
graph TD
    subgraph "設定画面 (Settings UI)"
        A[Chatbot設定画面] -- "どのGeneratorを使うか選択" --> B[画像Generator設定画面]
        B -- "GeneratorをCRUD" --> C["ユーザー設定 (UserConfig)"]
        A -- "Botごとに画像生成を有効化" --> C
    end

    subgraph "データモデル (user-config.ts)"
        C -- "保持する" --> D["ImageGenerator[]<br>(名前, APIキー, モデル等)"]
        C -- "保持する" --> E["CustomApiConfig<br>(各Botの設定)"]
        E -- "画像生成設定を持つ" --> F["imageToolBinding: { enabled, generatorId }<br>imageToolOverrides: { ... }<br>model: '...'"]
    end

    subgraph "実行フロー (Runtime Flow)"
        G[チャットUI] -- "メッセージ送信" --> H{チャットボット<br>(Image_Agent)}
        H -- "内部で生成" --> I[プロンプト生成Bot<br>(Claude/OpenAI)]
        I -- "Tool定義を付けてLLMにリクエスト" --> J[LLM API]
        J -- "tool_useを返す" --> I
        I -- "Tool Callを検知" --> K[ImageAgentWrapper]
        K -- "画像生成を依頼" --> L[image-tools.ts]
        L -- "設定に基づきアダプターに委譲" --> M[画像Providerアダプター]
        M -- "画像生成APIを叩く" --> N[外部画像API]
        N -- "画像" --> M
        M -- "Markdownを生成" --> K
        K -- "結果をUIに表示" --> G
    end

    style C fill:#f9f,stroke:#333,stroke-width:2px
```

## タスクリスト (完了済み)

1.  **データモデルの更新 (`src/services/user-config.ts`)**
    -   [x] `CustomApiProvider` から不要な画像生成関連のenumを削除。
    -   [x] `CustomApiConfig` から非推奨のプロパティを削除し、`imageToolBinding` と `imageToolOverrides` に一本化。
    -   [x] `ImageGenerator` インターフェースに `model` プロパティを必須項目として定義。
    -   [x] `ImageApiSettings` を簡素化。

2.  **画像ジェネレーター設定画面の実装**
    -   [x] `SettingPage.tsx` に「Image Generators」セクションを追加。
    -   [x] `ImageGeneratorSettings.tsx` と `ImageGeneratorEditModal.tsx` を作成し、`ImageGenerator` のCRUD UIを実装。

3.  **チャットボット設定画面の改修 (`src/app/components/Settings/ChatbotSettings.tsx`)**
    -   [x] `API Provider` で「AI画像生成」を選択した際の専用UIを実装。
        -   [x] **チャットボット選択**: プロンプト生成用のベースとなるチャットボットを選択するUIを実装。
        -   [x] **画像ジェネレーター選択**: 登録済みの画像ジェネレーターを選択するUIを実装。
        -   [x] **画像モデル**: 画像生成に使用するモデル名を入力するUIを実装。
        -   [x] **System Prompt追記**: プロンプト生成用ボットのSystem Promptに追記するUIを実装。
    -   [x] `Image_Agent` 選択時は、不要な設定項目（Temperatureなど）を非表示にするよう修正。

4.  **Bot実行ロジックの対応**
    -   [x] `custombot.ts`: `Image_Agent` の場合、`ImageAgentWrapperBot` を生成し、その際に `model` を含む画像生成関連の設定を正しく渡すように修正。
    -   [x] `image-agent-wrapper.ts`: `model` を受け取り、`generateImageViaToolFor` に渡すように修正。
    -   [x] `image-tools.ts`: `generateImageViaToolFor` が `model` を受け取り、各プロバイダーに渡すように修正。
    -   [x] `claude-api/index.ts`: ストリーミング処理を修正し、`tool_use` と `message_delta` イベントを正しくハンドリングするように改修。
    -   [x] `chutes.ts`, `seedream.ts`: Tool-useのスキーマに `description` を追加。

5.  **動作確認とテスト**
    -   [x] ビルドが通ることを確認し、関連するエラーをすべて修正。
