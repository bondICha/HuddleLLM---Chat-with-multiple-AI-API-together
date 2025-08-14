<p align="center">
    <img src="./src/assets/icon.png" width="150">
</p>

<h1 align="center">HuddleLLM</h1>

<div align="center">

### HuddleLLM はオールインワンのチャットボットクライアントです
 
    
[English](README.md) &nbsp;&nbsp;|&nbsp;&nbsp; [Indonesia](README_IN.md) &nbsp;&nbsp;|&nbsp;&nbsp; [简体中文](README_ZH-CN.md) &nbsp;&nbsp;|&nbsp;&nbsp; [繁體中文](README_ZH-TW.md) &nbsp;&nbsp;|&nbsp;&nbsp; 日本語

##    
    
### インストール

#### ストアから

<a href="https://chromewebstore.google.com/detail/huddlellm-oss-all-in-one/edjbcjkcabpmpcpnpfjfcehegjkacgod"><img src="https://user-images.githubusercontent.com/64502893/231991498-8df6dd63-727c-41d0-916f-c90c15127de3.png" width="200" alt="Chromium 用の HuddleLLM を入手してください"></a> <a href="https://microsoftedge.microsoft.com/addons/detail/huddlellm-oss-%E3%82%AA%E3%83%BC%E3%83%AB%E3%82%A4%E3%83%B3%E3%83%AF%E3%83%B3%E3%83%81%E3%83%A3/kmphcofekafjmnpjegchboapjpgjhgch"><img src="https://user-images.githubusercontent.com/64502893/231991158-1b54f831-2fdc-43b6-bf9a-f894000e5aa8.png" width="160" alt="Microsoft Edge 用の HuddleLLM を入手してください"></a>

> [!NOTE]  
> Microsoftの審査が時間がかかるため、Microsoft Edge Extensionは更新が一週間以上遅れます。Chrome Extension Storeからインストールすることをおすすめします


#### Sourceから
Refer [🔨 ソースからビルドする](#-ソースからビルドする) this section

---

[スクリーンショット](#-スクリーンショット) &nbsp;&nbsp;|&nbsp;&nbsp; [特徴](#-特徴) &nbsp;&nbsp;|&nbsp;&nbsp; [サポートされているボット](#-サポートされているボット) &nbsp;&nbsp;|&nbsp;&nbsp; [手動インストール](#-手動インストール) &nbsp;&nbsp;|&nbsp;&nbsp; [ソースからビルドする](#-ソースからビルドする) &nbsp;&nbsp;|&nbsp;&nbsp; [変更ログ](#-変更ログ)


</div>

##

## 📷 スクリーンショット

![Screenshot](screenshots/extension.png?raw=true)

## ✨ Features

- 🤖 1つのアプリで様々なチャットボットを利用可能
- 🖼️ 複数画像のアップロードに対応
- 🔍 ショートカットでブラウザのどこからでも素早くアプリを起動
- 🎨 マークダウンとコードハイライトに対応
- 📚 カスタムプロンプトとコミュニティプロンプトのライブラリ
- 💾 会話履歴をローカルに保存
- 📥 全データのインポート＆エクスポート
- 🔗 会話をマークダウンで共有
- 🌙 ダークモード
- 🌐 Webアクセス

## 🤖 Supported Bots

- OpenAI
- Google Gemini
- Anthropic
- Perplexity
- DeepSeek, QwenなどのOpenAI互換モデル
- Together AI, Fireworks AI, Hyperbolic, DeepInfra, NebiusなどのOpenAI互換LLMプラットフォーム
- Vertex AI and Bedrock (現在、限定的にサポート)



## 🔨 Build from Source

- Clone the source code
- `corepack enable`
- `yarn install`
- `yarn build`
- In Chrome/Edge go to the Extensions page (chrome://extensions or edge://extensions)
- Enable Developer Mode
- Drag the `dist` folder anywhere on the page to import it (do not delete the folder afterward)

## 📜 プライバシーポリシー
◯ 本アプリケーションはユーザーの個人データを一切収集しません
◯ ユーザーが設定画面で明示的に有効化したAIサービス、またはユーザー自身が設定したAPI経由で利用するサービスにおけるデータ取り扱いについては、当開発者は一切の関知をしません。これら外部サービスの利用はユーザー自身の責任において行ってください

## 📜 変更ログ

### v1.22.0

- Claude API のサポートを追加

### v1.21.0

- より多くのオープンソースモデルを追加

### v1.20.0

- Chrome のサイドパネルからアクセスできるようにしました

### v1.19.0

- プロンプトへの簡単アクセス

### v1.18.0

- Alpaca、Vicuna、ChatGLM のサポート

### v1.17.0

- GPT-4 Browsing モデルのサポート

### v1.16.5

- Azure OpenAI サービスのサポートを追加

### v1.16.0

- カスタムテーマ設定を追加

### v1.15.0

- Xunfei Spark ボットを追加

### v1.14.0

- プレミアムユーザー向けのオールインワンモードで、より多くのボットをサポート

### v1.12.0

- プレミアムライセンスを追加

### v1.11.0

- クロードのサポートを追加 (Poe経由で)

### v1.10.0

- Command + K

### v1.9.4

- ダークモード

### v1.9.3

- katex で数式をサポート
- コミュニティプロンプトをローカルに保存

### v1.9.2

- 履歴メッセージを削除する

### v1.9.0

- markdown として、または sharegpt.com 経由でチャットを共有する

### v1.8.0

- すべてのデータのインポート/エクスポート
- ローカルプロンプトを編集する
- 比較のためにチャットボットを切り替える

### v1.7.0

- 会話履歴を追加する

### v1.6.0

- Google Bard のサポートを追加

### v1.5.4

- ChatGPT api モードで GPT-4 モデルをサポート

### v1.5.1

- i18n 設定を追加

### v1.5.0

- ChatGPT Webapp モードで GPT-4 モデルをサポート

### v1.4.0

- プロンプトライブラリを追加

### v1.3.0

- コピーコードボタンを追加
- オールインワンモードとスタンドアロンモードの間でチャット状態を同期
- 回答の生成中に入力を許可

### v1.2.0

- コピーメッセージテキストのサポート
- ページフォーム要素スタイルの設定を改善
