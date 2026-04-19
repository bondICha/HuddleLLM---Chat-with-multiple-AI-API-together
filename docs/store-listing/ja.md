# Chrome Web Store / Edge Add-ons — ストア掲載文（日本語）

## Short Description（132文字以内）

ChatGPT・Gemini・Claudeなど複数AIを1画面で同時比較。マルチモーダル（画像・音声・動画・PDF）、ネイティブWeb検索、画像生成AI（Image Agent）、Omnibox即起動対応。

---

## Overview（タイトル）

ChatGPT、Gemini、Claude など複数の AI チャットボットを同時に利用

---

## Full Description

複数の AI チャットボットと同時に会話できる Chrome 拡張機能です。

HuddleLLM を使えば、複数の AI に同じ質問を同時に投げて回答を比較し、最適な答えをすばやく見つけられます。

**こんなときに便利**

コードについて質問するとき、複数の AI の回答を比較して、最もクリーンで効率的なコードを選べます。
文章の添削を求めるとき、複数の視点からより包括的なフィードバックを得られます。
/btw コマンドを使えば、複数 AI の回答をまとめて別の AI に送り、さらに深い比較分析も行えます。

**主な機能**

- 複数の AI（ChatGPT・Gemini・Claude 等）を1画面で同時チャット・比較
- ネイティブ Web 検索：OpenAI Responses・Claude・Gemini は各プロバイダ公式の検索ツールを直接利用。その他のモデルは HuddleLLM 内蔵の Web 検索（Function Call 方式）にフォールバック
- マルチモーダル入力：画像・音声・動画・PDF
- Image Agent：自然言語で画像の内容を説明するだけで、LLM が最適なプロンプトを生成し画像生成 API に送信（OpenAI Image・Gemini・Chutes AI・Novita AI・Replicate 対応）
- Quick Settings パネル：セッション単位で思考レベル・画像生成パラメータを素早く調整
- Chrome Side Panel：現在のタブを離れずに個別ボットを素早く開いてチャット
- Omnibox 統合：アドレスバーで `hl <キーワード>` と入力するだけで即起動
- 音声文字起こし：OpenAI Whisper または Gemini で音声をテキスト化して送信
- カスタム・コミュニティプロンプトライブラリ
- 会話履歴のローカル保存、セッション復元、エクスポート / インポート

**対応プロバイダ**

ネイティブ API：OpenAI（Chat Completions / Responses API）、Google Gemini、Anthropic Claude

OpenAI 互換：OpenRouter・DeepSeek・Qwen・xAI Grok・Z.AI GLM・Together AI・Fireworks AI・Hyperbolic・DeepInfra・Nebius、その他任意のカスタムエンドポイント

**プライバシー**

すべてのデータ（API キー・会話履歴）はブラウザのローカルストレージにのみ保存されます。テレメトリなし、アカウント不要、HuddleLLM サーバーへのデータ送信は一切ありません。

---

## 最近の更新

- 指定した AI でタブタイトルを自動生成
- 動画入力対応（Gemini / OpenRouter）
- /btw スタンドアロンポップアップ：複数 AI の回答を別の AI に送って比較分析
- PDF サポート（Gemini / Claude / OpenAI Responses API）
- Quick Settings パネル（セッション単位の思考レベル・画像生成パラメータ調整）
- 音声入力・音声文字起こし（OpenAI Whisper / Gemini）
- ネイティブ API Web 検索（OpenAI Responses・Claude・Gemini）
- Image Agent による AI 画像生成（複数プロバイダ対応）
- Chrome Side Panel 対応
- Omnibox 統合（`hl <キーワード>`）
