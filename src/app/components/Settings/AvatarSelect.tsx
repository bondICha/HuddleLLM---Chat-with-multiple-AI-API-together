import { FC, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import IconSelect from './IconSelect';
import BotIcon from '../BotIcon';
import { 
  Claude, 
  OpenAI, 
  Gemini, 
  Anthropic, 
  Bing, 
  Perplexity,
  Mistral,
  Ollama,
  Grok
} from '@lobehub/icons';

// 従来のアイコンから@lobehub/iconsへのマッピング
const iconMigrationMap = {
  // 従来のアイコンパス → @lobehub/iconsの参照
  'anthropic': 'Anthropic.Color',
  'bard': 'Gemini.Color',
  'bing': 'Bing.Color',
  'chatgpt': 'OpenAI.Color',
  'gemini': 'Gemini.Color',
  'grok': 'Grok.Color',
  'llama': 'Ollama.Color',
  'mistral': 'Mistral.Color',
  'perplexity': 'Perplexity.Color',
  'claude': 'Claude.Color',
};

// デフォルトアイコン
const defaultIcon = 'OpenAI.Color';

interface AvatarSelectProps {
  value: string;
  onChange: (value: string) => void;
}

const AvatarSelect: FC<AvatarSelectProps> = ({ value, onChange }) => {
  const { t } = useTranslation();
  const [isSelectOpen, setIsSelectOpen] = useState(false);
  const [currentIconValue, setCurrentIconValue] = useState(defaultIcon);
  
  // 従来のアイコンパスを@lobehub/iconsの参照に変換
  const migrateIconValue = (oldValue: string) => {
    // すでに@lobehub/iconsの形式（例: "Claude.Avatar"）の場合はそのまま返す
    if (oldValue && oldValue.includes('.')) {
      return oldValue;
    }
    
    // 従来のアイコンパスの場合、マッピングを使用して変換
    for (const [oldKey, newValue] of Object.entries(iconMigrationMap)) {
      if (oldValue && oldValue.includes(oldKey)) {
        return newValue;
      }
    }
    
    // マッピングが見つからない場合はデフォルトを返す
    return defaultIcon;
  };
  
  // コンポーネントがマウントされた時に初期値を設定
  useEffect(() => {
    setCurrentIconValue(migrateIconValue(value));
  }, [value]);
  
  // アイコン名を取得（表示用）
  const getIconDisplayName = (iconValue: string) => {
    if (!iconValue) return 'Default';
    
    const parts = iconValue.split('.');
    const provider = parts[0];
    const variant = parts[1] || 'Default';
    
    // OpenAI.Avatar:gpt4,square のような形式の場合、追加情報を取得
    let additionalInfo = '';
    if (iconValue.includes(':')) {
      const options = iconValue.split(':')[1].split(',');
      if (options.length > 0) {
        additionalInfo = ` (${options.join(', ')})`;
      }
    }
    
    return variant === 'Default' ? provider : `${provider} ${variant}${additionalInfo}`;
  };
  
  // アイコン変更時の処理
  const handleIconChange = (newValue: string) => {
    onChange(newValue);
    setCurrentIconValue(newValue);
    setIsSelectOpen(false);
  };
  
  return (
    <div className="flex flex-col gap-2">
      {/* アイコン表示部分 */}
      <div 
        className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 relative group"
        onClick={() => setIsSelectOpen(!isSelectOpen)}
      >
        <div className="w-12 h-12 flex items-center justify-center overflow-hidden">
          <BotIcon iconName={currentIconValue} size={36} />
        </div>
        <div className="flex flex-col flex-1 min-w-0">
          <span className="font-medium truncate">{getIconDisplayName(currentIconValue)}</span>
          <span className="text-sm text-gray-500">{t('Current icon')}</span>
        </div>
        
        {/* マウスオーバー時に表示されるヒント */}
        <div className="absolute inset-0 bg-black bg-opacity-50 rounded-lg opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
          <span className="text-white font-medium">{t('Click to select model')}</span>
        </div>
      </div>
      
      {/* アイコン選択パネル */}
      {isSelectOpen && (
        <div className="border rounded-lg p-4 bg-white dark:bg-gray-800 shadow-lg max-w-full overflow-x-auto">
          <IconSelect
            value={currentIconValue}
            onChange={handleIconChange}
          />
          
          <div className="flex justify-end mt-4">
            <button 
              className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-100 dark:border-gray-600 dark:hover:bg-gray-700"
              onClick={() => setIsSelectOpen(false)}
              type="button"
            >
              {t('Cancel')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AvatarSelect;
