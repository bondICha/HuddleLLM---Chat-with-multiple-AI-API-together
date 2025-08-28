import { FC, useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { cx } from '~/utils';
import BotIcon from './BotIcon';

// インターフェースをエクスポート
export interface NestedDropdownOption {
  label: string;
  value?: string;
  children?: NestedDropdownOption[];
  disabled?: boolean;
  icon?: string;
}

interface Props {
  options: NestedDropdownOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  showModelId?: boolean;
}

const NestedDropdown: FC<Props> = ({
  options,
  value,
  onChange,
  placeholder = 'Select...',
  showModelId = true,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0, width: 0 });

  // 現在選択されている値に対応するラベルを探す
  const findSelectedOption = (opts: NestedDropdownOption[]): NestedDropdownOption | null => {
    for (const option of opts) {
      if (option.value === value) {
        return option;
      }
      if (option.children) {
        const found = findSelectedOption(option.children);
        if (found) return found;
      }
    }
    return null;
  };

  const selectedOption = findSelectedOption(options);
  const selectedLabel = selectedOption ? selectedOption.label : placeholder;
  
  // 外部クリックでドロップダウンを閉じる
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleToggle = () => {
    if (dropdownRef.current) {
      const rect = dropdownRef.current.getBoundingClientRect();
      setMenuPosition({
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX,
        width: rect.width,
      });
    }
    setIsOpen(!isOpen);
  };
  
  return (
    <div className="relative" ref={dropdownRef}>
      {/* トリガーボタン */}
      <button
        type="button"
        className="w-full flex items-center justify-between rounded-md bg-white dark:bg-gray-700 py-2 px-3 text-sm text-gray-900 dark:text-gray-200 shadow-sm ring-1 ring-inset ring-gray-300 dark:ring-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600"
        onClick={handleToggle}
      >
        <div className="flex items-center gap-2">
          {selectedOption && selectedOption.icon && <BotIcon iconName={selectedOption.icon} size={20} />}
          <span className="truncate">{selectedLabel}</span>
        </div>
        <svg className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
          <path
            fillRule="evenodd"
            d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
            clipRule="evenodd"
          />
        </svg>
      </button>
      
      {/* ドロップダウンメニュー */}
      {isOpen && createPortal(
        <div
          className="absolute z-[9999] mt-1 rounded-md bg-white dark:bg-gray-800 shadow-lg ring-1 ring-black dark:ring-gray-600 ring-opacity-5 focus:outline-none"
          style={{ top: menuPosition.top, left: menuPosition.left, width: menuPosition.width }}
        >
          <div className="py-1">
            {options.map((option, idx) => (
              <div key={idx} className="relative group">
                <div
                  className={cx(
                    'px-4 py-2 text-sm text-gray-900 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer font-medium',
                    option.disabled && 'opacity-70 cursor-not-allowed'
                  )}
                >
                  {option.label}
                  {option.children && option.children.length > 0 && (
                    <span className="absolute right-2">▶</span>
                  )}
                </div>
                {option.children && option.children.length > 0 && (
                  <SubMenu
                    option={option}
                    value={value}
                    onChange={onChange}
                    setIsOpen={setIsOpen}
                    showModelId={showModelId}
                  />
                )}
              </div>
            ))}
          </div>
        </div>,
        document.body
      )}
      {/* Tailwind CSSでスタイリングするため不要 */}
    </div>
  );
};

export default NestedDropdown;

const SubMenu: FC<{
  option: NestedDropdownOption;
  value: string;
  onChange: (value: string) => void;
  setIsOpen: (isOpen: boolean) => void;
  showModelId?: boolean;
}> = ({ option, value, onChange, setIsOpen, showModelId }) => {
  const subMenuRef = useRef<HTMLDivElement>(null);
  const [showOnLeft, setShowOnLeft] = useState(false);
  const [showOnTop, setShowOnTop] = useState(false);
  const [maxHeight, setMaxHeight] = useState('37.5rem');

  // 位置と高さを計算する関数
  const calculatePosition = () => {
    if (subMenuRef.current) {
      const parentElement = subMenuRef.current.parentElement;
      if (parentElement) {
        const parentRect = parentElement.getBoundingClientRect();
        const subMenuWidth = 256; // 予想されるサブメニュー幅 (w-64 = 16rem = 256px)
        const estimatedSubMenuHeight = Math.min(600, (option.children?.length || 0) * 40); // 各項目約40px
        const margin = 20;
        
        // 左右の位置計算
        const wouldBeRightEdge = parentRect.right + subMenuWidth;
        setShowOnLeft(wouldBeRightEdge + margin > window.innerWidth);
        
        // 上下の位置計算
        const wouldBeBottomEdge = parentRect.top + estimatedSubMenuHeight;
        const availableSpaceBelow = window.innerHeight - parentRect.top - margin;
        const availableSpaceAbove = parentRect.bottom - margin;
        
        if (wouldBeBottomEdge + margin > window.innerHeight) {
          // 下にはみ出る場合
          if (availableSpaceAbove > availableSpaceBelow && availableSpaceAbove > 150) {
            // 上に十分なスペースがある場合は上に表示
            setShowOnTop(true);
            setMaxHeight(`${Math.min(600, availableSpaceAbove)}px`);
          } else {
            // 上にも十分なスペースがない場合は下のまま、高さ制限
            setShowOnTop(false);
            setMaxHeight(`${Math.max(200, availableSpaceBelow)}px`);
          }
        } else {
          // はみ出ない場合は通常通り下に表示
          setShowOnTop(false);
          setMaxHeight('37.5rem');
        }
      }
    }
  };

  // マウスエンターのハンドラー
  const handleMouseEnter = () => {
    // 少し遅延させて DOM が更新されてから計算
    requestAnimationFrame(() => {
      calculatePosition();
    });
  };

  // 初期化とウィンドウリサイズ時の再計算
  useEffect(() => {
    calculatePosition(); // 初期化時に一度計算
    
    const handleResize = () => calculatePosition();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div
      ref={subMenuRef}
      className={cx(
        'absolute w-64 max-w-sm rounded-md bg-white dark:bg-gray-700 shadow-lg ring-1 ring-black dark:ring-gray-600 ring-opacity-5 focus:outline-none hidden group-hover:block z-[10000] overflow-hidden',
        showOnLeft ? 'right-full' : 'left-full',
        showOnTop ? 'bottom-0' : 'top-0'
      )}
      style={{
        maxHeight: maxHeight,
        overflowY: 'auto'
      }}
      onMouseEnter={handleMouseEnter}
    >
      <div className="py-1">
        {option.children?.map((child, childIdx) => (
          <div
            key={childIdx}
            className={cx(
              'px-4 py-2 text-sm text-gray-900 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer',
              child.value === value && 'bg-blue-100 text-blue-900 dark:bg-blue-600 dark:text-white',
              child.disabled && 'opacity-70 cursor-not-allowed'
            )}
            onClick={() => {
              if (!child.disabled && child.value) {
                onChange(child.value);
                setIsOpen(false);
              }
            }}
          >
            <div className="flex items-center gap-2">
              {child.icon && <BotIcon iconName={child.icon} size={20} />}
              <div className="flex-1">
                <div>{child.label}</div>
                {showModelId && child.value && (
                  <div className="text-xs text-gray-500 dark:text-gray-400">{child.value}</div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
