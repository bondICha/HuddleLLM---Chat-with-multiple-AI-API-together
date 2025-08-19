import { CustomBot } from './custombot'



/**
 * カスタムボットのインスタンスを作成する関数
 * @param index カスタムボットのインデックス（0ベース）
 * @returns CustomBotのインスタンス
 */
export function createBotInstance(index: number) {

  
  // インデックスが有効範囲内かチェック（数値で0以上であること）
  if (typeof index === 'number' && !isNaN(index) && index >= 0) {
    // CustomBotは1ベースのcustomBotNumberを期待するため、index + 1を渡す
    return new CustomBot({ customBotNumber: index + 1 });
  }

  
  // デフォルトとして0を使用
  const defaultIndex = 0;
  return new CustomBot({ customBotNumber: defaultIndex + 1 });
}

/**
 * ボットインスタンスの型
 */
export type BotInstance = ReturnType<typeof createBotInstance>
