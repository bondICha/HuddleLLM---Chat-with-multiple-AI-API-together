import { useTranslation } from 'react-i18next';
import { FC, useState, useEffect } from 'react';
import ExpandableDialog from '../ExpandableDialog';
import { Textarea } from '../Input';
import Button from '../Button';

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
    <ExpandableDialog
      title={title || t('Edit System Prompt')}
      open={open}
      onClose={onClose}
      className="w-full max-w-3xl max-h-[800px]"
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
    </ExpandableDialog>
  );
};

export default SystemPromptEditorModal;