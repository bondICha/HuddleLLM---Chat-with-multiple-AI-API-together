// セッション復元モーダルの設定をリセットするスクリプト
// ブラウザの開発者ツールのコンソールで実行してください

// 方法1: 完全リセット（すべての設定をクリア）
chrome.storage.local.clear().then(() => {
  console.log('All storage cleared - session restore modal will show again');
});

// 方法2: セッション復元関連のみリセット
chrome.storage.local.remove(['skipSessionRestore', 'lastSessionCheck']).then(() => {
  console.log('Session restore settings cleared - modal will show again');
});

// 方法3: 現在の設定を確認
chrome.storage.local.get(['skipSessionRestore', 'lastSessionCheck']).then((result) => {
  console.log('Current session restore settings:', result);
});