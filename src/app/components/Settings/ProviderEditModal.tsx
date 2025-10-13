import { FC, useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { UserConfig, CustomApiProvider, ProviderConfig } from '~services/user-config';
import { Input } from '../Input';
import Select from '../Select';
import Switch from '../Switch';
import Button from '../Button';
import ExpandableDialog from '../ExpandableDialog';
import HostSearchInput from './HostSearchInput';
import BotIcon from '../BotIcon';
import IconSelectModal from './IconSelectModal';
import ModelPreview from './ModelPreview';

interface Props {
  open: boolean;
  onClose: () => void;
  provider?: ProviderConfig;
  onSave: (provider: ProviderConfig) => void;
}

const ProviderEditModal: FC<Props> = ({ open, onClose, provider, onSave }) => {
  const { t } = useTranslation();
  const [editingProvider, setEditingProvider] = useState<ProviderConfig | null>(null);
  const [iconModalOpen, setIconModalOpen] = useState(false);
  const iconModalClosingRef = useRef(false);

  // Update editingProvider when provider prop changes
  useEffect(() => {
    if (provider) {
      setEditingProvider({ ...provider });
    } else {
      setEditingProvider(null);
    }
  }, [provider]);

  const handleSave = () => {
    if (editingProvider) {
      onSave(editingProvider);
      onClose();
    }
  };

  const handleClose = () => {
    // 親モーダルのクローズ要求を、子モーダル(アイコン選択)表示/クローズ中は無視
    if (iconModalOpen || iconModalClosingRef.current) return;
    setEditingProvider(null);
    onClose();
  };

  if (!editingProvider || !open) return null;

  const formRowClass = "flex flex-col gap-2";
  const labelClass = "font-medium text-sm";

  return (
    <>
      <ExpandableDialog
        open={open}
        onClose={handleClose}
        title={provider ? t('Edit Provider') : t('Add New Provider')}
      >
        <div className="p-4 space-y-4">
          <div className={formRowClass}>
            <label className={labelClass}>{t('Provider Name')}</label>
            <Input
              value={editingProvider.name}
              onChange={(e) => setEditingProvider({ ...editingProvider, name: e.currentTarget.value })}
            />
          </div>
          <div className={formRowClass}>
            <label className={labelClass}>{t('Icon')}</label>
            <div className="flex items-center gap-2">
              <BotIcon iconName={editingProvider.icon} size={32} />
              <Button text={t('Select Icon')} onClick={() => setIconModalOpen(true)} />
            </div>
          </div>
          <div className={formRowClass}>
            <label className={labelClass}>{t('API Scheme')}</label>
            <Select
              options={[
                { name: 'OpenAI Compatible', value: CustomApiProvider.OpenAI },
                { name: 'Anthropic Claude API', value: CustomApiProvider.Anthropic },
                { name: 'AWS Bedrock (Anthropic)', value: CustomApiProvider.Bedrock },
                { name: 'Google Gemini (OpenAI Format)', value: CustomApiProvider.GeminiOpenAI },
                { name: 'Qwen (OpenAI Format)', value: CustomApiProvider.QwenOpenAI },
                { name: 'VertexAI (Claude)', value: CustomApiProvider.VertexAI_Claude },
              ]}
              value={editingProvider.provider}
              onChange={(v) => setEditingProvider({ ...editingProvider, provider: v as CustomApiProvider })}
            />
          </div>
          <div className={formRowClass}>
            <label className={labelClass}>{t('API Host')}</label>
            <HostSearchInput
              value={editingProvider.host}
              onChange={(v) => setEditingProvider({ ...editingProvider, host: v })}
            />
          </div>
          <div className={formRowClass}>
            <label className={labelClass}>{t('API Key')}</label>
            <Input
              type="password"
              value={editingProvider.apiKey}
              onChange={(e) => setEditingProvider({ ...editingProvider, apiKey: e.currentTarget.value })}
            />
          </div>
          <div className="flex items-center gap-2">
            <Switch
              checked={editingProvider.isHostFullPath}
              onChange={(v) => setEditingProvider({ ...editingProvider, isHostFullPath: v })}
            />
            <span className="text-sm">{t('Use full path for API endpoint')}</span>
          </div>
        </div>
        <div className="flex justify-end p-4 border-t border-primary-border">
          <Button text={t('Save')} onClick={handleSave} color="primary" />
        </div>
      </ExpandableDialog>
      <IconSelectModal
        open={iconModalOpen}
        onClose={() => setIconModalOpen(false)}
        value={editingProvider.icon}
        onChange={(v) => setEditingProvider({ ...editingProvider, icon: v })}
      />
    </>
  );
};

export default ProviderEditModal;
