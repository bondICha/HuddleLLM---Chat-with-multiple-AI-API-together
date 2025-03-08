import { FC, useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import Fuse from 'fuse.js';
import * as AllIcons from '@lobehub/icons';
import RakutenSVG from '~/assets/logos/rakuten.svg';

// 型アサーションを使用してインデックスアクセスを可能にする
const IconLibrary = AllIcons as Record<string, any>;

// 明示的にアイコンをマッピング（デフォルト表示用）
const featuredProviders = [
  'Claude',
  'Anthropic',
  'OpenAI',
  'Gemini',
  'Perplexity',
  'Mistral',
  'Rakuten', // カスタムアイコン
  'DeepSeek'
];

// 問題のあるアイコンのリスト（IまたはMから始まるモデルを含む）
const problematicIcons = [
  'Ideogram', 'IFlyTekCloud', 'InternLM'
];

// OpenAI.Avatarの追加オプション
const openAIAvatarTypes = ['gpt3', 'gpt4', 'o1'];
const openAIAvatarShapes = ['circle', 'square'];

// 各プロバイダーのバリアント
const getVariants = (provider: string) => {
  // Rakutenの場合は特別処理
  if (provider === 'Rakuten') {
    return ['Default'];
  }
  
  // プロバイダー名が有効かチェック
  if (!IconLibrary[provider]) {
    return ['Default'];
  }
  
  const icon = IconLibrary[provider];
  
  const variants = ['Default'];
  if ('Color' in icon) variants.push('Color');
  if ('Text' in icon) variants.push('Text');
  if ('Combine' in icon) variants.push('Combine');
  if ('Avatar' in icon) variants.push('Avatar');
  
  return variants;
};

// 有効なプロバイダーかどうかをチェック
const isValidProvider = (provider: string): boolean => {
  return provider === 'Rakuten' || !!IconLibrary[provider];
};

interface IconSelectProps {
  value: string;
  onChange: (value: string) => void;
}

const IconSelect: FC<IconSelectProps> = ({ value, onChange }) => {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const initializedRef = useRef(false);
  
  // OpenAI.Avatar用の追加状態
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [selectedShape, setSelectedShape] = useState<string | null>(null);
  
  // 現在の値を解析して初期状態を設定（マウント時のみ実行）
  useEffect(() => {
    if (!initializedRef.current && value) {
      initializedRef.current = true;
      
      try {
        const parts = value.split('.');
        const provider = parts[0];
        const variant = parts[1] || 'Default';
        
        // プロバイダーが有効かチェック
        if (provider === 'Rakuten' || Object.keys(IconLibrary).includes(provider)) {
          // 初期状態を設定（初期状態は選択画面を表示しないようにするためにnull）
          setSelectedProvider(null);
          setSelectedVariant(null);
          
          // OpenAI.Avatar用の追加パラメータを解析
          if (provider === 'OpenAI' && variant === 'Avatar') {
            const params = value.split(':');
            if (params.length > 1) {
              const options = params[1].split(',');
              
              // type
              const typeOption = options.find(opt => openAIAvatarTypes.includes(opt));
              if (typeOption) {
                setSelectedType(typeOption);
              }
              
              // shape
              const shapeOption = options.find(opt => openAIAvatarShapes.includes(opt));
              if (shapeOption) {
                setSelectedShape(shapeOption);
              }
            }
          }
        }
      } catch (error) {
        console.error('Error parsing icon value:', error);
      }
    }
  }, [value]);
  
  // 全アイコンプロバイダーのリスト（問題のあるアイコンを除外）
  const allProviders = ['Rakuten', ...Object.keys(IconLibrary).filter(key => 
    !problematicIcons.includes(key) && 
    // IまたはMから始まるアイコンを除外（特に問題が発生しやすい）
    !(key.startsWith('I') || key.startsWith('M'))
  )].sort();
  
  // 検索機能
  const filteredProviders = (() => {
    let providers = allProviders;
    
    if (!searchTerm) {
      // 検索がない場合は、featuredProvidersを先頭に表示
      const nonFeatured = providers.filter(p => !featuredProviders.includes(p));
      providers = [...featuredProviders, ...nonFeatured];
    } else {
      const fuse = new Fuse(providers, {
        threshold: 0.3,
      });
      
      providers = fuse.search(searchTerm).map(result => result.item);
    }
    
    return providers;
  })();
  
  // ページング
  // 1ページ目はデフォルト表示の8個だけ、それ以降は16個ずつ
  const getPageProviders = () => {
    if (currentPage === 0 && !searchTerm) {
      // 1ページ目で検索がない場合はfeaturedProvidersのみ
      return filteredProviders.slice(0, featuredProviders.length);
    } else {
      // それ以外は12個ずつ（3列×4行）
      const iconsPerPage = 12;
      const startIndex = currentPage === 0 && !searchTerm 
        ? featuredProviders.length 
        : currentPage * iconsPerPage;
      
      // 配列の範囲外アクセスを防止
      if (startIndex >= filteredProviders.length) {
        return [];
      }
      
      return filteredProviders.slice(startIndex, startIndex + iconsPerPage);
    }
  };
  
  const currentProviders = getPageProviders();
  
  // 総ページ数の計算
  const getTotalPages = () => {
    if (!searchTerm) {
      // 検索がない場合
      // 1ページ目はfeaturedProviders、残りは16個ずつ
      const remainingProviders = filteredProviders.length - featuredProviders.length;
      return remainingProviders > 0 
        ? 1 + Math.ceil(remainingProviders / 16) 
        : 1;
    } else {
      // 検索がある場合は16個ずつ
      return Math.ceil(filteredProviders.length / 16);
    }
  };
  
  const totalPages = getTotalPages();
  
  // 選択されたプロバイダーのバリアントを取得
  const variants = selectedProvider ? getVariants(selectedProvider) : [];
  
  // 現在の値を解析
  const [currentProvider, currentVariant] = (() => {
    if (!value) return [null, null];
    const parts = value.split('.');
    return [parts[0] || null, parts[1] || 'Default'];
  })();
  
  // アイコンコンポーネントを取得
  const getIconComponent = (provider: string, variant: string = 'Default', type?: string, shape?: string) => {
    try {
      // Rakutenの場合は特別処理
      if (provider === 'Rakuten') {
        // 関数コンポーネントを返す
        return () => <img src={RakutenSVG} alt="Rakuten" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />;
      }
      
      // プロバイダー名が有効かチェック
      if (!IconLibrary[provider]) {
        return null;
      }
      
      const icon = IconLibrary[provider];
      
      // OpenAI.Avatarの特別処理
      if (provider === 'OpenAI' && variant === 'Avatar') {
        const AvatarIcon = icon[variant];
        return (props: any) => <AvatarIcon {...props} type={type} shape={shape} />;
      }
      
      if (variant === 'Default') {
        return icon;
      }
      
      // バリアントが存在するかチェック
      if (variant in icon) {
        return icon[variant];
      }
      
      return null;
    } catch (error) {
      console.error(`Error getting icon component for ${provider}.${variant}:`, error);
      return null;
    }
  };
  
  // 安全にアイコンをレンダリングする関数
  const renderIcon = (provider: string, size: number = 32) => {
    try {
      if (!isValidProvider(provider)) {
        return <div style={{ width: size, height: size, backgroundColor: '#f0f0f0' }} />;
      }
      
      const IconComponent = getIconComponent(provider);
      if (!IconComponent) {
        return <div style={{ width: size, height: size, backgroundColor: '#f0f0f0' }} />;
      }
      
      return (
        <div style={{ width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <IconComponent size={size} style={{ maxWidth: '100%', maxHeight: '100%' }} />
        </div>
      );
    } catch (error) {
      console.error(`Error rendering icon for ${provider}:`, error);
      return <div style={{ width: size, height: size, backgroundColor: '#f0f0f0' }} />;
    }
  };
  
  // OpenAI.Avatarの追加オプションを選択した後のアイコン値を生成
  const getOpenAIAvatarValue = () => {
    let value = 'OpenAI.Avatar';
    const options = [];
    
    if (selectedType) {
      options.push(selectedType);
    }
    
    if (selectedShape) {
      options.push(selectedShape);
    }
    
    if (options.length > 0) {
      value += ':' + options.join(',');
    }
    
    return value;
  };
  
  // 安全にアイコンをレンダリングするためのラッパー
  const SafeIconRenderer = ({ provider }: { provider: string }) => {
    try {
      return (
        <div className="p-2 border rounded flex flex-col items-center cursor-pointer hover:bg-gray-100">
          {renderIcon(provider)}
          <span className="mt-1 text-sm truncate w-full text-center">{provider}</span>
        </div>
      );
    } catch (error) {
      console.error(`Error in SafeIconRenderer for ${provider}:`, error);
      return (
        <div className="p-2 border rounded flex flex-col items-center cursor-pointer hover:bg-gray-100">
          <div style={{ width: 32, height: 32, backgroundColor: '#f0f0f0' }} />
          <span className="mt-1 text-sm truncate w-full text-center">{provider}</span>
        </div>
      );
    }
  };
  
  return (
    <div className="flex flex-col gap-4">
      {/* 検索バー */}
      <div className="relative">
        <input
          type="text"
          className="w-full p-2 border rounded"
          placeholder={t('Search icons...')}
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setCurrentPage(0); // 検索時はページをリセット
          }}
        />
      </div>
      
      {/* プロバイダー選択（ステップ1） */}
      {!selectedProvider && (
        <>
          <div className="grid grid-cols-3 gap-2 max-h-80 overflow-y-auto">
            {currentProviders.length > 0 ? (
              currentProviders.map(provider => (
                <div
                  key={provider}
                  className={`p-2 border rounded flex flex-col items-center cursor-pointer hover:bg-gray-100 ${
                    provider === currentProvider ? 'border-blue-500 bg-blue-50' : ''
                  }`}
                  onClick={() => setSelectedProvider(provider)}
                >
                  {renderIcon(provider)}
                  <span className="mt-1 text-sm truncate w-full text-center">{provider}</span>
                </div>
              ))
            ) : (
              <div className="col-span-4 p-4 text-center text-gray-500">
                {t('No icons found')}
              </div>
            )}
          </div>
          
          {/* ページネーション */}
          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-2">
              <button
                className="px-2 py-1 border rounded disabled:opacity-50"
                onClick={() => setCurrentPage(prev => Math.max(0, prev - 1))}
                disabled={currentPage === 0}
                type="button"
              >
                {t('Previous')}
              </button>
              <span className="px-2 py-1">
                {currentPage + 1} / {totalPages}
              </span>
              <button
                className="px-2 py-1 border rounded disabled:opacity-50"
                onClick={() => setCurrentPage(prev => Math.min(totalPages - 1, prev + 1))}
                disabled={currentPage === totalPages - 1}
                type="button"
              >
                {t('Next')}
              </button>
            </div>
          )}
        </>
      )}
      
      {/* バリアント選択（ステップ2） */}
      {selectedProvider && !selectedVariant && (
        <>
          <div className="flex justify-between items-center">
            <h3 className="font-medium">{t('Select variant for')} {selectedProvider}</h3>
            <button
              className="text-blue-500"
              onClick={() => setSelectedProvider(null)}
              type="button"
            >
              {t('Back to providers')}
            </button>
          </div>
          
          <div className="grid grid-cols-3 gap-4">
            {variants.map(variant => {
              try {
                const IconComponent = getIconComponent(selectedProvider, variant);
                
                const handleClick = () => {
                  if (selectedProvider === 'OpenAI' && variant === 'Avatar') {
                    // OpenAI.Avatarの場合は追加オプションを選択するためにバリアントを保存
                    setSelectedVariant(variant);
                  } else {
                    // それ以外の場合は直接アイコンを選択
                    const iconValue = variant === 'Default' 
                      ? selectedProvider 
                      : `${selectedProvider}.${variant}`;
                    onChange(iconValue);
                  }
                };
                
                const iconValue = variant === 'Default' 
                  ? selectedProvider 
                  : `${selectedProvider}.${variant}`;
                
                return (
                  <div
                    key={variant}
                    className={`p-3 border rounded flex flex-col items-center cursor-pointer hover:bg-gray-100 ${
                      iconValue === value ? 'border-blue-500 bg-blue-50' : ''
                    }`}
                    onClick={handleClick}
                  >
                    {IconComponent ? (
                      <div style={{ width: 48, height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <IconComponent size={48} style={{ maxWidth: '100%', maxHeight: '100%' }} />
                      </div>
                    ) : (
                      <div style={{ width: 48, height: 48, backgroundColor: '#f0f0f0' }} />
                    )}
                    <span className="mt-2">{variant}</span>
                  </div>
                );
              } catch (error) {
                console.error(`Error rendering variant ${variant} for ${selectedProvider}:`, error);
                return (
                  <div
                    key={variant}
                    className="p-3 border rounded flex flex-col items-center cursor-pointer hover:bg-gray-100"
                  >
                    <div style={{ width: 48, height: 48, backgroundColor: '#f0f0f0' }} />
                    <span className="mt-2">{variant}</span>
                  </div>
                );
              }
            })}
          </div>
        </>
      )}
      
      {/* OpenAI.Avatar用の追加オプション選択（ステップ3） */}
      {selectedProvider === 'OpenAI' && selectedVariant === 'Avatar' && (
        <>
          <div className="flex justify-between items-center">
            <h3 className="font-medium">{t('OpenAI Avatar Options')}</h3>
            <button
              className="text-blue-500"
              onClick={() => setSelectedVariant(null)}
              type="button"
            >
              {t('Back to variants')}
            </button>
          </div>
          
          {/* Type選択 */}
          <div>
            <h4 className="font-medium mb-2">{t('Select Type')}</h4>
            <div className="grid grid-cols-3 gap-4">
              <div
                className={`p-3 border rounded flex flex-col items-center cursor-pointer hover:bg-gray-100 ${
                  selectedType === null ? 'border-blue-500 bg-blue-50' : ''
                }`}
                onClick={() => setSelectedType(null)}
              >
                {(() => {
                  try {
                    return (
                      <div style={{ width: 48, height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <IconLibrary.OpenAI.Avatar size={48} style={{ maxWidth: '100%', maxHeight: '100%' }} />
                      </div>
                    );
                  } catch (error) {
                    console.error('Error rendering OpenAI.Avatar:', error);
                    return <div style={{ width: 48, height: 48, backgroundColor: '#f0f0f0' }} />;
                  }
                })()}
                <span className="mt-2">Default</span>
              </div>
              
              {openAIAvatarTypes.map(type => {
                try {
                  const IconComponent = IconLibrary.OpenAI.Avatar;
                  return (
                    <div
                      key={type}
                      className={`p-3 border rounded flex flex-col items-center cursor-pointer hover:bg-gray-100 ${
                        selectedType === type ? 'border-blue-500 bg-blue-50' : ''
                      }`}
                      onClick={() => setSelectedType(type)}
                    >
                      <div style={{ width: 48, height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <IconComponent size={48} type={type} style={{ maxWidth: '100%', maxHeight: '100%' }} />
                      </div>
                      <span className="mt-2">{type}</span>
                    </div>
                  );
                } catch (error) {
                  console.error(`Error rendering OpenAI.Avatar with type ${type}:`, error);
                  return (
                    <div
                      key={type}
                      className="p-3 border rounded flex flex-col items-center cursor-pointer hover:bg-gray-100"
                    >
                      <div style={{ width: 48, height: 48, backgroundColor: '#f0f0f0' }} />
                      <span className="mt-2">{type}</span>
                    </div>
                  );
                }
              })}
            </div>
          </div>
          
          {/* Shape選択 */}
          <div>
            <h4 className="font-medium mb-2">{t('Select Shape')}</h4>
            <div className="grid grid-cols-3 gap-4">
              <div
                className={`p-3 border rounded flex flex-col items-center cursor-pointer hover:bg-gray-100 ${
                  selectedShape === null ? 'border-blue-500 bg-blue-50' : ''
                }`}
                onClick={() => setSelectedShape(null)}
              >
                {(() => {
                  try {
                    return (
                      <div style={{ width: 48, height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <IconLibrary.OpenAI.Avatar size={48} type={selectedType || undefined} style={{ maxWidth: '100%', maxHeight: '100%' }} />
                      </div>
                    );
                  } catch (error) {
                    console.error('Error rendering OpenAI.Avatar:', error);
                    return <div style={{ width: 48, height: 48, backgroundColor: '#f0f0f0' }} />;
                  }
                })()}
                <span className="mt-2">Default (Circle)</span>
              </div>
              
              {openAIAvatarShapes.map(shape => {
                try {
                  const IconComponent = IconLibrary.OpenAI.Avatar;
                  return (
                    <div
                      key={shape}
                      className={`p-3 border rounded flex flex-col items-center cursor-pointer hover:bg-gray-100 ${
                        selectedShape === shape ? 'border-blue-500 bg-blue-50' : ''
                      }`}
                      onClick={() => setSelectedShape(shape)}
                    >
                      <div style={{ width: 48, height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <IconComponent size={48} type={selectedType || undefined} shape={shape} style={{ maxWidth: '100%', maxHeight: '100%' }} />
                      </div>
                      <span className="mt-2">{shape}</span>
                    </div>
                  );
                } catch (error) {
                  console.error(`Error rendering OpenAI.Avatar with shape ${shape}:`, error);
                  return (
                    <div
                      key={shape}
                      className="p-3 border rounded flex flex-col items-center cursor-pointer hover:bg-gray-100"
                    >
                      <div style={{ width: 48, height: 48, backgroundColor: '#f0f0f0' }} />
                      <span className="mt-2">{shape}</span>
                    </div>
                  );
                }
              })}
            </div>
          </div>
          
          {/* 確定ボタン */}
          <div className="flex justify-end mt-4">
            <button
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              onClick={() => onChange(getOpenAIAvatarValue())}
              type="button"
            >
              {t('Confirm Selection')}
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default IconSelect;
