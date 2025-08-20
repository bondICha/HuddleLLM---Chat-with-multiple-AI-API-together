import { cx } from '~/utils'
import { FC, useState, useEffect } from 'react'
import { Layout } from '~app/consts'
import layoutFourIcon from '~assets/icons/layout-four.svg'
import layoutThreeIcon from '~assets/icons/layout-three.svg'
import layoutTwoIcon from '~assets/icons/layout-two.svg'
import layoutOneIcon from '~assets/icons/layout-one.svg'
import layoutTwoHorizonIcon  from '~assets/icons/layout-two-vertical.svg'
import layoutSixIcon from '~assets/icons/layout-six.svg'

const Item: FC<{ icon: string; active: boolean; onClick: () => void }> = (props) => {
  return (
    <a className={cx(!!props.active && 'bg-[#00000014] dark:bg-[#ffffff26] rounded-[6px]')} onClick={props.onClick}>
      <img src={props.icon} className="w-8 h-8 cursor-pointer" />
    </a>
  )
}

interface Props {
  layout: Layout
  onChange: (layout: Layout) => void
}

const LayoutSwitch: FC<Props> = (props) => {
  const [isExpanded, setIsExpanded] = useState(true); // デフォルトで展開

  // 画面幅を監視してデフォルトの展開状態を決定
  useEffect(() => {
    const checkScreenWidth = () => {
      const isNarrow = window.innerWidth < 768; // md breakpoint
      // 狭い画面では自動的に折りたたむ
      if (isNarrow) {
        setIsExpanded(false);
      } else {
        setIsExpanded(true);
      }
    };

    checkScreenWidth();
    window.addEventListener('resize', checkScreenWidth);
    return () => window.removeEventListener('resize', checkScreenWidth);
  }, []);

  const togglePanel = () => {
    setIsExpanded(!isExpanded);
  };

  const handleItemClick = (layout: Layout) => {
    props.onChange(layout);
    // 選択後は常に閉じる（水平展開の場合）
    setIsExpanded(false);
  };


  return (
    <div className="flex items-center gap-0 bg-primary-background rounded-2xl overflow-hidden">
      {/* 折りたたみボタン（常に表示） */}
      <button
        className="flex items-center px-2 py-1 shrink-0"
        onClick={togglePanel}
        title={isExpanded ? "レイアウト選択を折りたたむ" : "レイアウト選択を展開"}
      >
        {/* 展開アイコン（水平方向の矢印） */}
        <div className={cx(
          "transition-transform duration-200",
          isExpanded ? "rotate-180" : "rotate-0"
        )}>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </button>

      {/* レイアウトスイッチパネル（水平展開） */}
      {isExpanded && (
        <div
          className="flex items-center gap-2 transition-all duration-200 ease-in-out overflow-hidden"
          style={{
            transform: 'translateX(0)',
          }}
        >
        <Item
          icon={layoutOneIcon}
          active={props.layout === 'single'}
          onClick={() => handleItemClick('single')}
        />
        <Item
          icon={layoutTwoIcon}
          active={props.layout === 2 || props.layout === 'twoVertical'}
          onClick={() => handleItemClick(2)}
        />
        <Item 
          icon={layoutTwoHorizonIcon} 
          active={props.layout === 'twoHorizon'} 
          onClick={() => handleItemClick('twoHorizon')} 
        />
        <Item 
          icon={layoutThreeIcon} 
          active={props.layout === 3} 
          onClick={() => handleItemClick(3)} 
        />
        <Item 
          icon={layoutFourIcon} 
          active={props.layout === 4} 
          onClick={() => handleItemClick(4)} 
        />
        <Item 
          icon={layoutSixIcon} 
          active={props.layout === 'sixGrid'} 
          onClick={() => handleItemClick('sixGrid')} 
        />
        </div>
      )}
    </div>
  )
}

export default LayoutSwitch
