import { FC, useEffect, useState } from 'react';
import * as AllIcons from '@lobehub/icons';

// 型アサーションを使用してインデックスアクセスを可能にする
const IconLibrary = AllIcons as Record<string, any>;

// 問題のあるアイコンのリスト（IまたはMから始まるモデルを含む）
const problematicIcons: string[] = [];


const IconTest: FC = () => {
  const [iconNames, setIconNames] = useState<string[]>([]);
  const [selectedIcon, setSelectedIcon] = useState<string | null>(null);
  const [variants, setVariants] = useState<string[]>([]);
  const [errorLog, setErrorLog] = useState<string[]>([]);

  useEffect(() => {
    // @lobehub/iconsから利用可能なアイコン名を取得
    const names = Object.keys(IconLibrary).filter(key => 
      typeof IconLibrary[key] === 'function' || 
      typeof IconLibrary[key] === 'object'
    );
    setIconNames(names);
  }, []);

  useEffect(() => {
    if (selectedIcon && IconLibrary[selectedIcon]) {
      const icon = IconLibrary[selectedIcon];
      const variantNames = Object.keys(icon).filter(key => 
        typeof icon[key] === 'function' || 
        typeof icon[key] === 'object'
      );
      setVariants(['Default', ...variantNames]);
    } else {
      setVariants([]);
    }
  }, [selectedIcon]);

  // 安全にアイコンをレンダリングする関数
  const renderIconSafely = (iconName: string, variant: string) => {
    try {
      const IconComponent = variant === 'Default' 
        ? IconLibrary[iconName] 
        : IconLibrary[iconName][variant];
      
      if (!IconComponent) {
        throw new Error(`Component not found: ${iconName}.${variant}`);
      }
      
      return (
        <div className="flex flex-col items-center">
          <div style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <IconComponent size={32} style={{ maxWidth: '100%', maxHeight: '100%' }} />
          </div>
          <span className="mt-1">{variant}</span>
        </div>
      );
    } catch (error) {
      console.error(`Error rendering ${iconName}.${variant}:`, error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      setErrorLog(prev => [...prev, `Error: ${iconName}.${variant} - ${errorMessage}`]);
      return (
        <div className="flex flex-col items-center">
          <div style={{ width: 32, height: 32, backgroundColor: '#f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: '10px', color: 'red' }}>Error</span>
          </div>
          <span className="mt-1">{variant}</span>
        </div>
      );
    }
  };

  // 問題のあるアイコンをフィルタリングする
  const filterIcons = (filter: string) => {
    if (filter === 'all') {
      return iconNames;
    } else if (filter === 'problematic') {
      return iconNames.filter(name => problematicIcons.includes(name));
    } else if (filter === 'i-m') {
      return iconNames.filter(name => name.startsWith('I') || name.startsWith('M'));
    }
    return iconNames;
  };

  const [filter, setFilter] = useState<'all' | 'problematic' | 'i-m'>('all');
  const filteredIcons = filterIcons(filter);

  return (
    <div className="flex flex-col gap-4 p-4">
      <h2 className="text-xl font-bold">Icon Test</h2>
      
      <div className="flex gap-2">
        <button
          className={`px-2 py-1 border rounded ${filter === 'all' ? 'bg-blue-500 text-white' : ''}`}
          onClick={() => setFilter('all')}
        >
          All Icons
        </button>
        <button
          className={`px-2 py-1 border rounded ${filter === 'problematic' ? 'bg-blue-500 text-white' : ''}`}
          onClick={() => setFilter('problematic')}
        >
          Problematic Icons
        </button>
        <button
          className={`px-2 py-1 border rounded ${filter === 'i-m' ? 'bg-blue-500 text-white' : ''}`}
          onClick={() => setFilter('i-m')}
        >
          I/M Icons
        </button>
      </div>
      
      <div>
        <h3 className="text-lg font-semibold mb-2">Available Icons ({filteredIcons.length})</h3>
        <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto">
          {filteredIcons.map(name => (
            <button
              key={name}
              className={`px-2 py-1 border rounded ${selectedIcon === name ? 'bg-blue-500 text-white' : ''} ${
                problematicIcons.includes(name) ? 'border-red-500' : ''
              }`}
              onClick={() => setSelectedIcon(name)}
            >
              {name}
            </button>
          ))}
        </div>
      </div>

      {selectedIcon && (
        <div>
          <h3 className="text-lg font-semibold mb-2">Variants for {selectedIcon}</h3>
          <div className="flex flex-wrap gap-4">
            {variants.map(variant => renderIconSafely(selectedIcon, variant))}
          </div>
        </div>
      )}
      
      {errorLog.length > 0 && (
        <div className="mt-4">
          <h3 className="text-lg font-semibold mb-2">Error Log</h3>
          <div className="bg-red-50 p-2 rounded border border-red-200 max-h-40 overflow-y-auto">
            {errorLog.map((error, index) => (
              <div key={index} className="text-red-600 text-sm">{error}</div>
            ))}
          </div>
          <button
            className="mt-2 px-2 py-1 border rounded bg-red-100 hover:bg-red-200"
            onClick={() => setErrorLog([])}
          >
            Clear Errors
          </button>
        </div>
      )}
    </div>
  );
};

export default IconTest;
