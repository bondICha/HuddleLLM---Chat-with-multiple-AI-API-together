<p align="center">
    <img src="./src/assets/icon.png" width="150">
</p>

<h1 align="center">HuddleLLM</h1>

<div align="center">

### HuddleLLM はオールインワンのチャットボットクライアントです

[English](README.md) &nbsp;&nbsp;|&nbsp;&nbsp; [简体中文](README_ZH-CN.md) &nbsp;&nbsp;|&nbsp;&nbsp; [繁體中文](README_ZH-TW.md) &nbsp;&nbsp;|&nbsp;&nbsp; 日本語

##

### インストール

#### ストアから

<a href="https://chromewebstore.google.com/detail/huddlellm-oss-all-in-one/edjbcjkcabpmpcpnpfjfcehegjkacgod"><img src="https://user-images.githubusercontent.com/64502893/231991498-8df6dd63-727c-41d0-916f-c90c15127de3.png" width="200" alt="Chromium 用の HuddleLLM を入手してください"></a> <a href="https://microsoftedge.microsoft.com/addons/detail/huddlellm-oss-%E3%82%AA%E3%83%BC%E3%83%AB%E3%82%A4%E3%83%B3%E3%83%AF%E3%83%B3%E3%83%81%E3%83%A3/kmphcofekafjmnpjegchboapjpgjhgch"><img src="https://user-images.githubusercontent.com/64502893/231991158-1b54f831-2fdc-43b6-bf9a-f894000e5aa8.png" width="160" alt="Microsoft Edge 用の HuddleLLM を入手してください"></a>

> [!NOTE]
> Microsoftの審査が時間がかかるため、Microsoft Edge Extensionは更新が一週間以上遅れます。Chrome Extension Storeからインストールすることをおすすめします


#### Sourceから
[🔨 ソースからビルドする](#-ソースからビルドする) を参照してください。

---

[スクリーンショット](#-スクリーンショット) &nbsp;&nbsp;|&nbsp;&nbsp; [特徴](#-特徴) &nbsp;&nbsp;|&nbsp;&nbsp; [対応プロバイダ・ボット](#-対応プロバイダ--ボット) &nbsp;&nbsp;|&nbsp;&nbsp; [ソースからビルドする](#-ソースからビルドする) &nbsp;&nbsp;|&nbsp;&nbsp; [変更ログ](#-変更ログ)

</div>

## 📷 スクリーンショット

![Screenshot](screenshots/extension.png?raw=true)

## ✨ 特徴

- 🤖 複数のAIと1画面で同時にチャット・比較
- 🧩 ネイティブAPI・OpenRouter・OpenAI互換プロバイダを一元管理
- 🖼️🎙️🎬📄 画像・音声・動画・PDFをまとめて扱えるマルチモーダル対応
- 🌐 OpenAI Responses / Claude / Gemini のネイティブWeb検索に対応。その他のモデルはHuddleLLM独自のWeb検索をFunction Callから利用可能。
- 🎨 Nano Bananaの他、ChatとImage Generationを組み合わせた Image Agent でシームレスな画像生成。
- ⚙️ 思考レベル・画像生成パラメータをChatbot設定で設定可能な他、Quick Settingsパネルからセッション単位でも素早く調整できる
- 🧠 指定したAIでタブタイトルを自動生成
- 🪟 Chrome Side Panel から個別ボットを開いて素早くチャット
- 🎙️ 音声を文字起こし（OpenAI Whisper / Gemini）してテキスト送信
- 🔎 アドレスバーで `hl <キーワード>` と入力するだけで HuddleLLM を起動（Omnibox 統合）
- 🔀 `/btw` コマンドで複数AIの回答を別のAIに分析・比較させるスタンドアロンポップアップを起動
- 📚 カスタムプロンプトとコミュニティプロンプトのライブラリ
- 💾 会話履歴はローカル保存、セッション復元可能。
- 💾 設定、会話履歴など全データのエクスポート / インポートに対応

詳細は [CHANGELOG.md](./CHANGELOG.md) を参照してください。

## 🤖 対応プロバイダ / ボット

### ネイティブAPI
- **OpenAI**（Chat Completions / Responses API）
- **Google Gemini**（公式 `@google/genai` SDK。GenAIまたはVertex）
- **Anthropic Claude**



### OpenAI互換プロバイダ
- **OpenRouter**（音声・動画入力にも対応）
- DeepSeek、Qwen、xAI Grok、Z.AI GLM
- Together AI、Fireworks AI、Hyperbolic、DeepInfra、Nebius
- その他任意のOpenAI互換エンドポイント

### 画像生成（Image Agent経由）
- OpenAI Image（DALL·E 3、gpt-image-1）
- Google Gemini（Imagen / ネイティブ画像生成）
- Chutes AI（Chroma、FLUX.1-dev）
- Novita AI（Qwen Image、Hunyuan Image 3、Seedream 4.0）
- Replicate（Google Imagen 4 ほか）

> [!NOTE]
> 機能の対応状況はプロバイダ・モデルにより異なります。
> 例：PDF入力は Gemini / Claude / OpenAI Responses で対応、動画入力は Gemini / OpenRouter で対応。

## 🗂️ マルチモーダル対応

| 入力種別 | 対応プロバイダ |
|---|---|
| 🖼️ 画像 | OpenAI、Gemini、Claude、OpenRouter ほか |
| 🎵 音声（WAV / MP3 / OGG） | Gemini（ネイティブ）、OpenRouter、OpenAI Whisper / Gemini（文字起こし） |
| 🎬 動画 | Gemini、OpenRouter |
| 📄 PDF | Gemini、Claude、OpenAI Responses API |

## 🌐 ネイティブAPI Web検索

各プロバイダ公式のWeb検索ツールを直接利用するため、Context Sizeを抑えつつ安定した結果が得られます：

- OpenAI Responses: `web_search_preview`
- Anthropic Claude: `web_search_20250305`
- Google Gemini: `google_search`（参照URL付き）

ネイティブツール非対応のプロバイダでは、HuddleLLM独自のWeb Agent（検索結果をPromptに付与する方式）にフォールバックします。

## 🎨 Image Agent

LLMの推論力と画像生成APIを組み合わせた、エージェント型の画像生成システム：

1. 自然な日本語で「こんな画像が欲しい」と入力
2. LLM（Claude や OpenAI互換）が最適な画像プロンプトを生成
3. 画像生成APIが画像を生成

OpenAI Image、Google Gemini、Chutes AI、Novita AI、Replicate に対応しています。

## 🔨 ソースからビルドする

- ソースコードをクローン
- `corepack enable`
- `yarn install`
- `yarn build`
- Chrome / Edge の拡張機能ページを開く（chrome://extensions または edge://extensions）
- デベロッパーモードを有効化
- `dist` フォルダをページ上にドラッグ＆ドロップしてインポート（読み込み後もフォルダは削除しないでください）

## 📜 プライバシーポリシー
◯ 本アプリケーションはユーザーの個人データを一切送信せず、収集しません。
◯ ユーザーが設定画面で明示的に有効化したAIサービス、またはユーザー自身が設定したAPI経由で利用するサービスにおけるデータ取り扱いについては、当開発者は一切の関知をしません。これら外部サービスの利用はユーザー自身の責任において行ってください

## 📜 変更ログ

最新の更新履歴は [CHANGELOG.md](./CHANGELOG.md) を参照してください。
