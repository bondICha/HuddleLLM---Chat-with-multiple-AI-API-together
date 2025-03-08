import { FC } from 'react';
// 必要なアイコンをインポート
import * as AllIcons from '@lobehub/icons';
import RakutenSVG from '~/assets/logos/rakuten.svg';

interface BotIconProps {
  iconName: string;
  className?: string;
  size?: number;
  // OpenAI.Avatarの追加プロパティ
  type?: 'gpt3' | 'gpt4' | 'o1';
  shape?: 'square' | 'circle';
}

// 型アサーションを使用してインデックスアクセスを可能にする
const IconLibrary = AllIcons as Record<string, any>;

const BotIcon: FC<BotIconProps> = ({ iconName, className, size = 18, type, shape }) => {
  // アイコン名が無効な場合はデフォルトのプレースホルダーを表示
  if (!iconName) {
    return <div className={className} style={{ width: size, height: size, backgroundColor: '#f0f0f0' }} />;
  }

  try {
    // @lobehub/iconsのアイコン名かどうかをチェック
    if (iconName.startsWith('http') || iconName.startsWith('data:') || iconName.startsWith('~/')) {
      // 従来の画像URLの場合
      return <img src={iconName} className={className} style={{ width: size, height: size, objectFit: 'contain' }} />;
    }
    
    // Rakutenアイコンの特別処理
    if (iconName === 'Rakuten') {
      return <img src={RakutenSVG} className={className} style={{ width: size, height: size, objectFit: 'contain' }} />;
    }
    
    // iconNameを解析（例: "Claude.Avatar" → provider: "Claude", variant: "Avatar"）
    const parts = iconName.split('.');
    const provider = parts[0];
    const variant = parts[1];
``
    // プロバイダーが存在するか確認
    if (!IconLibrary[provider]) {
      console.warn(`Icon provider "${provider}" not found`);
      return <div className={className} style={{ width: size, height: size, backgroundColor: '#f0f0f0' }} />;
    }
    
    // OpenAI.Avatarの特別処理
    if (provider === 'OpenAI' && variant === 'Avatar') {
      try {
        const AvatarIcon = IconLibrary[provider][variant];
        if (!AvatarIcon) {
          throw new Error(`OpenAI.Avatar component not found`);
        }
        // typeとshapeプロパティを渡す
        return (
          <div style={{ width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <AvatarIcon size={size} className={className} type={type} shape={shape} style={{ maxWidth: '100%', maxHeight: '100%' }} />
          </div>
        );
      } catch (error) {
        console.error(`Error rendering OpenAI.Avatar:`, error);
        return <div className={className} style={{ width: size, height: size, backgroundColor: '#f0f0f0' }} />;
      }
    }
    
    // バリアントがある場合
    if (variant && IconLibrary[provider][variant]) {
      try {
        const VariantIcon = IconLibrary[provider][variant];
        if (!VariantIcon) {
          throw new Error(`${provider}.${variant} component not found`);
        }
        return (
          <div style={{ width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <VariantIcon size={size} className={className} style={{ maxWidth: '100%', maxHeight: '100%' }} />
          </div>
        );
      } catch (error) {
        console.error(`Error rendering ${provider}.${variant}:`, error);
        return <div className={className} style={{ width: size, height: size, backgroundColor: '#f0f0f0' }} />;
      }
    }
    
    // デフォルトアイコン
    try {
      const DefaultIcon = IconLibrary[provider];
      if (!DefaultIcon) {
        throw new Error(`${provider} component not found`);
      }
      return (
        <div style={{ width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <DefaultIcon size={size} className={className} style={{ maxWidth: '100%', maxHeight: '100%' }} />
        </div>
      );
    } catch (error) {
      console.error(`Error rendering ${provider}:`, error);
      return <div className={className} style={{ width: size, height: size, backgroundColor: '#f0f0f0' }} />;
    }
  } catch (error) {
    console.error(`Error rendering icon ${iconName}:`, error);
    return <div className={className} style={{ width: size, height: size, backgroundColor: '#f0f0f0' }} />;
  }
};

export default BotIcon;
