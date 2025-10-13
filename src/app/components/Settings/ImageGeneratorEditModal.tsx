import { FC, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ImageGenerator } from '~services/user-config';
import Dialog from '../Dialog';
import Button from '../Button';
import { Input, Textarea } from '../Input';
import Select from '../Select';

interface Props {
  open: boolean;
  onClose: () => void;
  generator: ImageGenerator;
  onSave: (generator: ImageGenerator) => void;
  isCreating: boolean;
}

const ImageGeneratorEditModal: FC<Props> = ({ open, onClose, generator, onSave, isCreating }) => {
  const { t } = useTranslation();
  const [editedGenerator, setEditedGenerator] = useState<ImageGenerator>(generator);

  useEffect(() => {
    setEditedGenerator(generator);
  }, [generator]);

  const handleSave = () => {
    onSave(editedGenerator);
  };

  const handleChange = (field: keyof ImageGenerator, value: any) => {
    setEditedGenerator((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={isCreating ? t('Add New Image Generator') : t('Edit Image Generator')}
      className="max-w-md"
    >
      <div className="p-4 space-y-4">
        <div className="space-y-2">
          <label className="font-medium">{t('Generator Name')}</label>
          <Input
            value={editedGenerator.name}
            onChange={(e) => handleChange('name', e.currentTarget.value)}
            placeholder="e.g., My Chutes AI"
          />
        </div>
        <div className="space-y-2">
          <label className="font-medium">{t('Generator Type')}</label>
          <Select
            options={[
              { name: 'Chutes', value: 'chutes' },
              { name: 'Seedream', value: 'seedream' },
            ]}
            value={editedGenerator.type}
            onChange={(v) => handleChange('type', v)}
          />
        </div>
        <div className="space-y-2">
          <label className="font-medium">{t('API Host')}</label>
          <Input
            value={editedGenerator.host}
            onChange={(e) => handleChange('host', e.currentTarget.value)}
            placeholder="https://api.example.com"
          />
        </div>
        <div className="space-y-2">
          <label className="font-medium">{t('API Key')}</label>
          <Input
            type="password"
            value={editedGenerator.apiKey}
            onChange={(e) => handleChange('apiKey', e.currentTarget.value)}
          />
        </div>
        <div className="space-y-2">
          <label className="font-medium">{t('Model')}</label>
          <Input
            value={editedGenerator.model}
            onChange={(e) => handleChange('model', e.currentTarget.value)}
            placeholder="e.g., realistic-vision-v5.1"
          />
        </div>
        <div className="space-y-2">
          <label className="font-medium">{t('Default Parameters (Optional)')}</label>
          <Textarea
            value={JSON.stringify(editedGenerator.defaults || {}, null, 2)}
            onChange={(e) => {
              try {
                const parsed = JSON.parse(e.currentTarget.value);
                setEditedGenerator((prev) => ({ ...prev, defaults: parsed }));
              } catch (error) {
                // Ignore invalid JSON
              }
            }}
            rows={5}
            placeholder='{&#10;  "width": 1024,&#10;  "height": 1024&#10;}'
          />
        </div>
      </div>
      <div className="flex justify-end gap-2 p-4 border-t border-primary-border">
        <Button text={t('Cancel')} onClick={onClose} />
        <Button text={t('Save')} onClick={handleSave} color="primary" />
      </div>
    </Dialog>
  );
};

export default ImageGeneratorEditModal;
