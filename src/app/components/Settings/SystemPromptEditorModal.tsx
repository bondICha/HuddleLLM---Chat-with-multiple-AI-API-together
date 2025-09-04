import { useTranslation } from 'react-i18next';
import { FC, useState, useEffect } from 'react';
import { BiCollapse, BiExpand } from 'react-icons/bi';
import { FiMaximize2, FiMinimize2 } from 'react-icons/fi';
import Dialog from '../Dialog';
import { Textarea } from '../Input';
import Button from '../Button';
import { cx } from '~/utils';

interface Props {
  open: boolean;
  onClose: () => void;
  value: string;
  onSave: (newValue: string) => void;
  title?: string;
}

const SystemPromptEditorModal: FC<Props> = ({ open, onClose, value, onSave, title }) => {
  const { t } = useTranslation();
  const [tempValue, setTempValue] = useState(value);
  const [isMaximized, setIsMaximized] = useState(false);
  const [isWide, setIsWide] = useState(false);

  // Reset tempValue when modal opens with new value
  useEffect(() => {
    if (open) {
      setTempValue(value);
    }
  }, [open, value]);

  const handleSave = () => {
    onSave(tempValue);
    onClose();
  };

  return (
    <Dialog
      title={title || t('Edit System Prompt')}
      open={open}
      onClose={onClose}
      className={cx(
        "flex flex-col",
        isMaximized
            ? "w-screen h-screen max-w-full max-h-full rounded-none"
            : isWide
                ? "w-[90vw] max-w-[1600px] h-[80vh]"
                : "w-full max-w-3xl max-h-[800px]"
      )}
      titleBarAddon={
        <div className="flex items-center gap-2">
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
      <div className="flex-1 flex flex-col p-4 gap-4 overflow-y-auto">
        <Textarea
          className="w-full flex-1 resize-none min-h-[400px] pr-2" // pr-2 to avoid scrollbar overlapping
          value={tempValue}
          onChange={(e) => {
            setTempValue(e.target.value);
          }}
          autoFocus
        />
        <div className="flex justify-end gap-2 flex-shrink-0">
          <Button
            text={t('Cancel')}
            color="flat"
            onClick={onClose}
          />
          <Button
            text={t('Save')}
            color="primary"
            onClick={handleSave}
          />
        </div>
      </div>
    </Dialog>
  );
};

export default SystemPromptEditorModal;