import React, { useState } from 'react';
import { Prism, SyntaxHighlighterProps } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { CopyToClipboard } from 'react-copy-to-clipboard-ts';
import { FiCopy, FiCheck, FiMaximize2, FiMinimize2 } from 'react-icons/fi';
import { BiCollapse, BiExpand } from 'react-icons/bi';
import Dialog from '~/app/components/Dialog';
import { cx } from '~/utils';
import { syntaxHighlighterStyle } from './styles';

const SyntaxHighlighter = (Prism as any) as React.FC<SyntaxHighlighterProps>;

interface Props {
  code: string;
  language: string;
  open: boolean;
  onClose: () => void;
}

const CodeBlockModal: React.FC<Props> = ({ code, language, open, onClose }) => {
  const [copied, setCopied] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [isWide, setIsWide] = useState(false);

  const handleCopy = () => {
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog
      title={language}
      open={open}
      onClose={onClose}
      className={cx(
        "flex flex-col",
        isMaximized
            ? "w-screen h-screen max-w-full max-h-full rounded-none"
            : isWide
                ? "w-[90vw] max-w-[1600px] h-[80vh]"
                : "w-full max-w-4xl h-[80vh]"
      )}
      titleBarAddon={
        <div className="flex items-center gap-2">
            <button
                className="p-1.5 rounded-full hover:bg-black/10 dark:hover:bg-white/10"
                onClick={handleCopy}
                title={copied ? "Copied" : "Copy"}
            >
                {copied ? <FiCheck /> : <FiCopy />}
            </button>
            <button
                className="p-1.5 rounded-full hover:bg-black/10 dark:hover:bg-white/10"
                onClick={() => setIsWide(!isWide)}
                title={isWide ? "Shrink Horizontally" : "Expand Horizontally"}
            >
                {isWide ? <FiMinimize2 /> : <FiMaximize2 />}
            </button>
            <button
                className="p-1.5 rounded-full hover:bg-black/10 dark:hover:bg-white/10"
                onClick={() => setIsMaximized(!isMaximized)}
                title={isMaximized ? "Restore" : "Maximize"}
            >
                {isMaximized ? <BiCollapse /> : <BiExpand />}
            </button>
        </div>
      }
    >
      <div className="flex-1 overflow-auto">
        <SyntaxHighlighter
          language={language}
          style={vscDarkPlus}
          customStyle={{
            ...syntaxHighlighterStyle,
            height: '100%',
            width: '100%',
          }}
          wrapLines={true}
          lineProps={{ style: { whiteSpace: 'pre-wrap', wordBreak: 'break-all' } }}
        >
          {code}
        </SyntaxHighlighter>
      </div>
    </Dialog>
  );
};

export default CodeBlockModal;