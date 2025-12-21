/* eslint-disable react/prop-types */

import { cx } from '~/utils'
import { FC, ReactNode, useEffect, memo, useMemo, useRef, useState } from 'react'
import { getUserThemeMode, ThemeMode } from '~services/theme'
import { isSystemDarkMode } from '~app/utils/color-scheme'
import { CopyToClipboard } from 'react-copy-to-clipboard-ts'
import { BsClipboard } from 'react-icons/bs'
import ReactMarkdown from 'react-markdown'
import reactNodeToString from 'react-node-to-string'
import rehypeHighlight from 'rehype-highlight'
import rehypeRaw from 'rehype-raw'
import remarkBreaks from 'remark-breaks'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import supersub from 'remark-supersub'
import remarkDirective from 'remark-directive';
import rehypeExternalLinks from 'rehype-external-links'
import Tooltip from '../Tooltip'
import './markdown.css'
import type { Pluggable } from 'unified';
import {
  CodeBlockProvider,
  useCodeBlockContext
} from './CodeBlockContext';
import CodeBlock from './Content/CodeBlock'


function CustomCode(props: { children: ReactNode; className?: string }) {
  const [copied, setCopied] = useState(false)

  const code = useMemo(() => reactNodeToString(props.children), [props.children])

  useEffect(() => {
    if (copied) {
      setTimeout(() => setCopied(false), 1000)
    }
  }, [copied])

  return (
    <div className="flex flex-col">
      <div className="bg-[#e6e7e8] dark:bg-[#444a5354] text-xs p-2">
        <CopyToClipboard text={code} onCopy={() => setCopied(true)}>
          <div className="flex flex-row items-center gap-2 cursor-pointer w-fit ml-1">
            <BsClipboard />
            <span>{copied ? 'copied' : 'copy code'}</span>
          </div>
        </CopyToClipboard>
      </div>
      <code className={cx(props.className, 'px-4')}>{props.children}</code>
    </div>
  )
}

export const handleDoubleClick: React.MouseEventHandler<HTMLElement> = (event) => {
  const range = document.createRange();
  range.selectNodeContents(event.target as Node);
  const selection = window.getSelection();
  if (!selection) {
    return;
  }
  selection.removeAllRanges();
  selection.addRange(range);
};

type TCodeProps = {
  inline?: boolean;
  className?: string;
  children: React.ReactNode;
};

export const code: React.ElementType = memo(({ className, children }: TCodeProps) => {
  const match = /language-(\w+)/.exec(className ?? '');
  const lang = match && match[1];
  const isMath = lang === 'math';
  const isSingleLine = typeof children === 'string' && children.split('\n').length === 1;

  const { getNextIndex, resetCounter } = useCodeBlockContext();
  const blockIndex = useRef(getNextIndex(isMath || isSingleLine)).current;

  useEffect(() => {
    resetCounter();
  }, [children, resetCounter]);

  if (isMath) {
    return <>{children}</>;
  } else if (isSingleLine) {
    return (
      <code onDoubleClick={handleDoubleClick} className={className}>
        {children}
      </code>
    );
  } else {
    const codeString = typeof children === 'string' 
      ? children 
      : reactNodeToString(children);
    
    return <CodeBlock language={lang ?? ''} code={codeString} />;
  }
});

// GitHub Markdown CSSの動的インポート管理
const importThemeCSS = async (themeMode: ThemeMode) => {
  // テーマに応じてダークモードかどうか判定
  let shouldUseDark = false;

  if (themeMode === ThemeMode.Dark) {
    shouldUseDark = true;
  } else if (themeMode === ThemeMode.Auto) {
    // Autoの場合は実際のシステムテーマまたは現在適用されているテーマを確認
    shouldUseDark = document.documentElement.classList.contains('dark') || isSystemDarkMode();
  }
  // Light の場合は shouldUseDark = false のまま

  // 既存のGitHub Markdown CSSを削除
  const existingStyles = document.querySelectorAll('link[data-github-markdown]');
  existingStyles.forEach(style => style.remove());

  // 新しいCSSを動的インポート
  try {
    if (shouldUseDark) {
      await import('github-markdown-css/github-markdown-dark.css');
    } else {
      await import('github-markdown-css/github-markdown-light.css');
    }
  } catch (error) {
    console.warn('Failed to load GitHub Markdown CSS:', error);
  }
};

const Markdown: FC<{ children: string; allowHtml?: boolean }> = ({ children, allowHtml = false }) => {
  const [currentTheme, setCurrentTheme] = useState<ThemeMode | null>(null);

  // 初期CSS読み込みとテーマ変更監視
  useEffect(() => {
    // 初期読み込み
    const initialTheme = getUserThemeMode();
    importThemeCSS(initialTheme);
    setCurrentTheme(initialTheme);

    // テーマ変更監視用のMutationObserver
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
          const newTheme = getUserThemeMode();
          if (newTheme !== currentTheme) {
            importThemeCSS(newTheme);
            setCurrentTheme(newTheme);
          }
        }
      });
    });

    // documentElementのclass属性変更を監視
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });

    return () => {
      observer.disconnect();
    };
  }, [currentTheme]);

  const remarkPlugins: Pluggable[] = useMemo(
    () => [
      supersub,
      remarkGfm,
      remarkDirective,
      [remarkMath, { singleDollarTextMath: true }],
    ],
    [],
  );
  return (
    <CodeBlockProvider>
    <div className={`markdown-body markdown-custom-styles code-block-no-margin !text-base font-normal`}>
    <ReactMarkdown
      /** @ts-ignore */
      remarkPlugins={
        // [[remarkMath, { singleDollarTextMath: true }],remarkBreaks, remarkGfm]

        remarkPlugins
      }
      rehypePlugins={allowHtml
        ? [
            rehypeRaw,
            [rehypeHighlight, { detect: false, ignoreMissing: true }],
            [rehypeExternalLinks, { target: '_blank', rel: ['noopener', 'noreferrer'] }]
          ]
        : [
            [rehypeHighlight, { detect: false, ignoreMissing: true }],
            [rehypeExternalLinks, { target: '_blank', rel: ['noopener', 'noreferrer'] }]
          ]
      }
      {...({ urlTransform: (url: string) => url } as any)}
      // linkTarget="_blank" // Deprecated at markdown 9.0.0
      components={{
        a: ({ node, ...props }) => {
          if (!props.title) {
            return <a {...props} />
          }
          return (
            <Tooltip content={props.title}>
              <a {...props} title={undefined} />
            </Tooltip>
          )
        },
        img: ({ node, ...props }) => {
          const src = (props as any).src as string | undefined
          const [url, setUrl] = useState<string | undefined>(src)
          useEffect(() => {
            let revoke: (() => void) | null = null
            const run = async () => {
              if (src && src.startsWith('data:')) {
                try {
                  const res = await fetch(src)
                  const blob = await res.blob()
                  const obj = URL.createObjectURL(blob)
                  setUrl(obj)
                  revoke = () => URL.revokeObjectURL(obj)
                } catch {
                  setUrl(src)
                }
              } else {
                setUrl(src)
              }
            }
            run()
            return () => { if (revoke) revoke() }
          }, [src])
          if (!url) return <img {...(props as any)} />
          return (
            <a href={url} target="_blank" rel="noopener noreferrer">
              <img {...(props as any)} src={url} />
            </a>
          )
        },
        code,
        table: ({ node, ...props }) => (
          <div className="table-wrapper">
            <table {...props} />
          </div>
        ),
      }}
    >
      {children}
    </ReactMarkdown>
    </div>
    </CodeBlockProvider>
  )
}

export default Markdown
