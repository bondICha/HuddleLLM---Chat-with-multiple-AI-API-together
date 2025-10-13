# 画像生成機能 実装レポート

## 概要

Chatbot設定に「画像生成」機能を追加し、既存のチャットボットがTool-useを介して画像を生成できるように改修しました。

## 主な変更点

### 1. データモデルの更新 (`src/services/user-config.ts`)

-   **`ImageGenerator` インターフェース**: 画像生成プロバイダー（Chutes, Seedreamなど）の認証情報や設定を管理する `ImageGenerator` インターフェースを定義しました。
-   **`CustomApiConfig` の拡張**: 各チャットボットの設定に、使用する `ImageGenerator` を紐付けるための `imageToolBinding` と、パラメータを上書きするための `imageToolOverrides` を追加しました。
-   **`Image_Agent` Provider**: 「画像生成」という特殊なチャットボットタイプを示す `Image_Agent` を `CustomApiProvider` に追加しました。
-   **クリーンアップ**: 古い画像生成関連のプロパティを削除し、データモデルを簡素化しました。

### 2. 設定画面の実装

-   **画像ジェネレーター設定画面 (`src/app/components/Settings/ImageGeneratorSettings.tsx`)**:
    -   `SettingPage.tsx` に、`ImageGenerator` を一覧表示し、CRUD（作成、読み取り、更新、削除）操作を行えるUIを新設しました。
    -   `ImageGeneratorEditModal.tsx` を作成し、モーダルウィンドウで `ImageGenerator` の詳細設定（名前、タイプ、APIホスト、APIキー、モデル、デフォルトパラメータ）を行えるようにしました。
-   **チャットボット設定画面の改修 (`src/app/components/Settings/ChatbotSettings.tsx`)**:
    -   `API Provider` の選択肢に「AI画像生成」を追加しました。
    -   「AI画像生成」を選択すると、以下の専用UIが表示されるようにしました。
        -   **プロンプト生成用チャットボットの選択**: 画像生成の指示を解釈するベースとなるチャットボットを、他の設定済みボットから選択できます。
        -   **画像ジェネレーターの選択**: 上記で作成した `ImageGenerator` から、実際に画像生成に使用するものを選択できます。
        -   **System Promptの上書き**: 画像生成に特化したSystem Promptを設定できます。

### 3. 実行ロジックの修正

-   **`custombot.ts`**:
    -   `provider` が `Image_Agent` の場合、`imageAgentChatbotRefId` で指定されたチャットボットのインスタンスを内部的に生成し、`ImageAgentWrapperBot` に渡すように修正しました。これにより、プロンプト生成と画像生成の役割分担を実現しています。
-   **`image-tools.ts` (`src/services/image/index.ts`)**:
    -   古いProvider選択ロジックを削除し、`generatorId` に基づいて `ImageGenerator` の設定を直接参照するように修正しました。
-   **`claude-api/index.ts`**:
    -   `tool_use` の型定義を修正し、画像生成ツールの呼び出しに対応しました。

## `34a270be13032691b7502bb75ecef91c0653ef49` からの差分

ご指定のコミットは、`Image_Agent` の初期実装が含まれていましたが、今回の改修で以下の点が大きく変更・整理されました。

-   **設定UIの明確化**: `ImageGenerator` の設定を独立したUIに分離し、`ChatbotSettings` ではそれを「選択」する形にしたことで、関心の分離がより明確になりました。
-   **データモデルの整理**: `user-config.ts` から不要なプロパティを削除し、`ImageGenerator` と `imageToolBinding` に設定を集約したことで、一貫性のあるデータ構造になりました。
-   **実行ロジックの汎用化**: `image-tools.ts` が特定のBotインデックスに依存しなくなり、`generatorId` のみで動作するようになったため、拡張性が向上しました。
-   **エラー処理の改善**: ビルドエラーをすべて修正し、型安全性を高めました。

これらの変更により、当初の設計思想である「関心の分離」をより高いレベルで実現し、メンテナンス性と拡張性に優れた実装となりました。