# ChatHub リリースノート機能まとめ

## 日本語

### UI/UX改善
- **Propagandaシステム** (v2.3.0-2.3.5)
  - AIの回答を他のAIに共有できる機能を追加
  - UIの改善と機能強化
  - 詳細な操作方法を動画で提供

- **表示機能の強化** (v2.3.5-2.5.0)
  - コードブロックの拡大表示機能
  - アイコンシステムの刷新（設定画面でのビジュアル選択UI）
  - シングルモデルビューの追加
  - ボット設定の改善（折りたたみ可能なパネル）
  - カスタムボットの順序変更機能

- **All-in-oneチャットペアの保存**: All-in-oneモードでお気に入りのボットの組み合わせを保存できるようになりました。保存したペアはサイドバーから素早くアクセスでき、異なるチャット設定を瞬時に切り替えることができます。ペアの名前変更、更新、削除も可能です。
![Save all-in-one pair](/Save%20all-in-one%20pair.png)
- **画像入力レイアウトの削除**: All-in-oneモードから画像入力レイアウトを削除しました。

### AI機能強化
- **Claude関連の改善** (v2.3.6-2.5.3)
  - Claude 3.7 Sonnetモデルのサポート
  - Claude Bedrockでの思考モード対応
  - Claude APIの思考モード機能（thinking budget設定可能）

- **思考プロセスの強化** (v2.5.0-2.5.3)
  - DeepSeekとPerplexityの思考内容表示改善
  - Perplexityの推論モード追加
  - 段階的な推論プロセスの実装

### システム機能
- **設定と管理機能** (v2.4.0-2.5.0)
  - モデル更新通知システムの改善
  - カスタムAPIテンプレートのインポート機能
  - 会話履歴の引き継ぎ機能（一時的に削除）

### 新機能
- **URLフェッチ機能**: メッセージに@URLを含めると、その内容をAIが自動的に取得して回答に利用できるようになりました。
 ![URL Fetch](/URL%20Fetch.png)

### Version 2.9.0
- **セッション復元機能**: HuddleLLMが会話履歴を記憶するようになりました！アプリを再起動すると、以前の会話を復元するかどうかを選択できるモーダルが表示されます。キーボードナビゲーション対応で、大切な会話を二度と失うことはありません。
- **Web検索でのPDF対応**: Web検索でPDFファイルが見つかった場合、自動的にテキストを読み取って処理できるようになりました。AIがオンラインでPDF文書を発見すると、その内容を抽出・分析できるため、研究や文書分析がより強力になります。
- **Google検索への切り替え**: Web検索がDuckDuckGoからGoogleに変更され、より包括的で関連性の高い検索結果を提供し、AIの回答品質が向上しました。

## English

### UI/UX Improvements
- **Propaganda System** (v2.3.0-2.3.5)
  - Added feature to share AI responses across bots
  - UI enhancements and functionality improvements
  - Detailed video guide for feature usage

- **Display Enhancements** (v2.3.5-2.5.0)
  - Code block expansion feature
  - Bot icon system overhaul with visual selection UI
  - Single model view addition
  - Improved bot settings with collapsible panels
  - Custom bot reordering capability

- **Save All-in-one chat pairs**: You can now save your favorite bot combinations in All-in-one mode. These saved pairs can be quickly accessed from the sidebar, allowing you to switch between different chat setups instantly. You can also rename, update, and delete your saved pairs.
![Save all-in-one pair](/Save%20all-in-one%20pair.png)
- **Removed Image Input Layout**: The image input layout has been removed from the All-in-one mode.

### AI Capability Enhancements
- **Claude Improvements** (v2.3.6-2.5.3)
  - Support for Claude 3.7 Sonnet model
  - Thinking mode support for Claude Bedrock
  - Claude API thinking mode with configurable thinking budget

- **Thinking Process Enhancements** (v2.5.0-2.5.3)
  - Improved thinking content display for DeepSeek and Perplexity
  - Addition of Perplexity reasoning mode
  - Implementation of step-by-step reasoning process

### System Features
- **Configuration and Management** (v2.4.0-2.5.0)
  - Model update notification system improvements
  - Custom API template import functionality
  - Conversation history transfer feature (temporarily removed)

### Version 2.8.0
- **Vertex AI Claude Support**: Claude models are now available on specific Vertex AI APIs (general Vertex AI not yet supported)
- **Multiple Image Upload**: You can now attach multiple images to chat messages
- **Gemini API Update**: Updated Google Gemini API version for improved response speed and stability
- **Markdown Rendering Improvements**: Enhanced table and code block display with better theme adaptation

### Version 2.8.1
- **URL Fetch Feature**: When you include @URL in your message, the AI can now automatically fetch its content to use in the response.
 ![URL Fetch](/URL%20Fetch.png)

### Version 2.9.0
- **PDF Upload Feature**: You can now upload PDF files and discuss their content with the AI.
- **Enhanced Web Access**: Web access functionality has been improved for safer content retrieval. You can check and manage permissions from the settings page.
- **Improved Responsive UI**: The layout selection UI now automatically adjusts to screen width, improving usability on mobile devices.
- **UI Stability Improvements**: Enhanced message display stability for a smoother chat experience.
- **Automatic Settings Migration**: Settings from older versions are now automatically migrated to the new format.

## 简体中文

### UI/UX改进
- **Propaganda系统** (v2.3.0-2.3.5)
  - 添加在AI之间共享回答的功能
  - UI增强和功能改进
  - 提供详细的功能使用视频指南

- **显示增强** (v2.3.5-2.5.0)
  - 代码块放大功能
  - 机器人图标系统改进，支持可视化选择
  - 添加单一模型视图
  - 改进机器人设置，支持折叠面板
  - 自定义机器人重新排序功能

- **保存All-in-one聊天配对**: 您现在可以在All-in-one模式下保存您喜欢的机器人组合。可以从侧边栏快速访问这些已保存的配对，让您即时切换不同的聊天设置。您还可以重命名、更新和删除已保存的配对。
![Save all-in-one pair](/Save%20all-in-one%20pair.png)
- **移除图像输入布局**: 已从All-in-one模式中移除图像输入布局。

### AI能力增强
- **Claude相关改进** (v2.3.6-2.5.3)
  - 支持Claude 3.7 Sonnet模型
  - Claude Bedrock支持思考模式
  - Claude API思考模式，支持可配置思考预算

- **思考过程增强** (v2.5.0-2.5.3)
  - 改进DeepSeek和Perplexity的思考内容显示
  - 添加Perplexity推理模式
  - 实现逐步推理过程

### 系统功能
- **配置和管理** (v2.4.0-2.5.0)
  - 改进模型更新通知系统
  - 自定义API模板导入功能
  - 对话历史转移功能（暂时移除）

### Version 2.8.0
- **Vertex AI Claude支持**: 特定规格的Vertex AI API中，Claude模型现在可以使用了（一般的Vertex AI尚未支持）
- **多重图片上传**: 现在可以在聊天消息中附加多张图片
- **Gemini API更新**: 更新Google Gemini API版本，提升响应速度和稳定性
- **Markdown显示优化**: 适配主题变化，优化表格和代码块的显示

### Version 2.8.1
- **URL获取功能**: 当您在消息中包含@URL时，AI现在可以自动获取其内容以用于回复。
 ![URL Fetch](/URL%20Fetch.png)

### Version 2.9.0
- **PDF上传功能**: 您现在可以上传PDF文件并与AI讨论其内容。
- **增强的Web访问**: Web访问功能已得到改进，可更安全地检索内容。您可以从设置页面检查和管理权限。
- **改进的响应式UI**: 布局选择UI现在会根据屏幕宽度自动调整，从而改善了移动设备上的可用性。
- **UI稳定性改进**: 增强了消息显示的稳定性，带来更流畅的聊天体验。
- **自动设置迁移**: 旧版本的设置现在会自动迁移到新格式。

## 繁體中文

### UI/UX改進
- **Propaganda系統** (v2.3.0-2.3.5)
  - 新增在AI之間共享回答的功能
  - UI增強和功能改進
  - 提供詳細的功能使用影片指南

- **顯示增強** (v2.3.5-2.5.0)
  - 程式碼區塊放大功能
  - 機器人圖示系統改進，支援可視化選擇
  - 新增單一模型視圖
  - 改進機器人設定，支援折疊面板
  - 自定義機器人重新排序功能

- **儲存All-in-one聊天配對**: 您現在可以在All-in-one模式下儲存您喜歡的機器人組合。可以從側邊欄快速存取這些已儲存的配對，讓您即時切換不同的聊天設定。您還可以重新命名、更新和刪除已儲存的配對。
![Save all-in-one pair](/Save%20all-in-one%20pair.png)
- **移除圖像輸入佈局**: 已從All-in-one模式中移除圖像輸入佈局。

### AI能力增強
- **Claude相關改進** (v2.3.6-2.5.3)
  - 支援Claude 3.7 Sonnet模型
  - Claude Bedrock支援思考模式
  - Claude API思考模式，支援可配置思考預算

- **思考過程增強** (v2.5.0-2.5.3)
  - 改進DeepSeek和Perplexity的思考內容顯示
  - 新增Perplexity推理模式
  - 實現逐步推理過程

### 系統功能
- **配置和管理** (v2.4.0-2.5.0)
  - 改進模型更新通知系統
  - 自定義API模板導入功能
  - 對話歷史轉移功能（暫時移除）

### Version 2.8.0
- **Vertex AI Claude支援**: 特定規格的Vertex AI API中，Claude模型現在可以使用了（一般的Vertex AI尚未支援）
- **多重圖片上傳**: 現在可以在聊天訊息中附加多張圖片
- **Gemini API更新**: 更新Google Gemini API版本，提升回應速度和穩定性
- **Markdown顯示優化**: 適配主題變化，優化表格和程式碼區塊的顯示

### Version 2.8.1
- **URL擷取功能**: 當您在訊息中包含@URL時，AI現在可以自動擷取其內容以用於回覆。
 ![URL Fetch](/URL%20Fetch.png)

### Version 2.9.0
- **PDF上傳功能**: 您現在可以上傳PDF檔案並與AI討論其內容。
- **增強的Web存取**: Web存取功能已得到改進，可更安全地擷取內容。您可以從設定頁面檢查和管理權限。
- **改進的響應式UI**: 佈局選擇UI現在會根據螢幕寬度自動調整，從而改善了行動裝置上的可用性。
- **UI穩定性改進**: 增強了訊息顯示的穩定性，帶來更流暢的聊天體驗。
- **自動設定遷移**: 舊版本的設定現在會自動遷移到新格式。