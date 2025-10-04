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
  provider: ProviderConfig | null;
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
        title={t('Edit Provider')}
        size="lg"
        footer={
          <div className="flex justify-end gap-2">
            <Button
              text={t('Cancel')}
              color="flat"
              onClick={handleClose}
            />
            <Button
              text={t('Save')}
              color="primary"
              onClick={handleSave}
            />
          </div>
        }
      >
        <div className="space-y-4">
          {/* Provider Icon and Name */}
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 cursor-pointer" onClick={() => setIconModalOpen(true)}>
              <BotIcon iconName={editingProvider.icon} size={64} />
            </div>
            <div className="flex-1">
              <div className={formRowClass}>
                <p className={labelClass}>{t('Provider name')}</p>
                <Input
                  value={editingProvider.name}
                  onChange={(e) => setEditingProvider({ ...editingProvider, name: e.currentTarget.value })}
                  placeholder={t('Provider name')}
                />
              </div>
            </div>
          </div>

          {/* API Scheme */}
          <div className={formRowClass}>
            <p className={labelClass}>{t('API Scheme')}</p>
            <Select
              options={[
                { name: 'OpenAI Compatible', value: CustomApiProvider.OpenAI },
                { name: 'Anthropic Claude API', value: CustomApiProvider.Anthropic },
                { name: 'AWS Bedrock (Anthropic)', value: CustomApiProvider.Bedrock },
                { name: 'Google Gemini (OpenAI Format)', value: CustomApiProvider.GeminiOpenAI },
                { name: 'Qwen (OpenAI Format)', value: CustomApiProvider.QwenOpenAI },
                { name: 'VertexAI (Claude)', value: CustomApiProvider.VertexAI_Claude },
                { name: 'Google Gemini API (Deprecated)', value: CustomApiProvider.Google },
              ]}
              value={editingProvider.provider || CustomApiProvider.OpenAI}
              onChange={(v) => {
                const next = { ...editingProvider, provider: v as CustomApiProvider };
                if (v === CustomApiProvider.GeminiOpenAI || v === CustomApiProvider.VertexAI_Claude) {
                  next.isHostFullPath = true;
                }
                setEditingProvider(next);
              }}
            />
          </div>

          {/* Anthropic Auth Header */}
          {editingProvider.provider === CustomApiProvider.Anthropic && (
            <div className={formRowClass}>
              <p className={labelClass}>{t('Anthropic Auth Header')}</p>
              <Select
                options={[
                  { name: 'x-api-key (Default)', value: 'false' },
                  { name: 'Authorization', value: 'true' }
                ]}
                value={editingProvider.isAnthropicUsingAuthorizationHeader ? 'true' : 'false'}
                onChange={(v) => {
                  setEditingProvider({ 
                    ...editingProvider, 
                    isAnthropicUsingAuthorizationHeader: v === 'true' 
                  });
                }}
                size="small"
              />
            </div>
          )}

          {/* API Host */}
          <div className={formRowClass}>
            <div className="flex items-center justify-between">
              <p className={labelClass}>{t(editingProvider.isHostFullPath ? 'API Endpoint (Full Path)' : 'API Host')}</p>
              {editingProvider.provider === CustomApiProvider.VertexAI_Claude ? (
                <span className="text-sm">{t('Full Path')}</span>
              ) : (
                <div className="flex items-center gap-1">
                  <span className="text-sm">{t('Full Path')}</span>
                  <span className="cursor-help group relative">ⓘ
                    <div className="absolute top-full right-0 mt-2 w-72 hidden group-hover:block bg-gray-900 dark:bg-gray-800 text-white text-xs p-2 rounded shadow-lg z-50">
                      {t('If "Full Path" is ON, enter the complete API endpoint URL. Otherwise, enter only the base host.')}
                    </div>
                  </span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <HostSearchInput
                className='flex-1'
                placeholder={
                  editingProvider.provider === CustomApiProvider.Google ? t("Not applicable for Google Gemini") :
                  editingProvider.provider === CustomApiProvider.GeminiOpenAI ? "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions" :
                  editingProvider.provider === CustomApiProvider.QwenOpenAI ? "https://dashscope.aliyuncs.com/compatible-mode/v1" :
                  editingProvider.isHostFullPath ? "https://api.example.com/v1/chat/completions" :
                  "https://api.openai.com"
                }
                value={editingProvider.host}
                onChange={(value) => {
                  setEditingProvider({ ...editingProvider, host: value });
                }}
                disabled={editingProvider.provider === CustomApiProvider.Google}
              />
              {editingProvider.provider !== CustomApiProvider.VertexAI_Claude && editingProvider.provider !== CustomApiProvider.GeminiOpenAI && (
                <Switch
                  checked={editingProvider.isHostFullPath ?? false}
                  onChange={(checked) => {
                    setEditingProvider({ ...editingProvider, isHostFullPath: checked });
                  }}
                />
              )}
            </div>
          </div>

          {/* API Key */}
          <div className={formRowClass}>
            <p className={labelClass}>API Key</p>
            <Input
              className='w-full'
              placeholder={t('Enter API Key for this provider')}
              value={editingProvider.apiKey}
              onChange={(e) => {
                setEditingProvider({ ...editingProvider, apiKey: e.currentTarget.value });
              }}
              type="password"
            />
          </div>

          {/* Model Preview */}
          <div className="border-t pt-4">
            <ModelPreview
              provider={editingProvider.provider || CustomApiProvider.OpenAI}
              apiKey={editingProvider.apiKey}
              host={editingProvider.host}
              isHostFullPath={editingProvider.isHostFullPath}
            />
          </div>
        </div>
      </ExpandableDialog>

      <IconSelectModal
        open={iconModalOpen}
        onClose={() => {
          // Prevent parent modal from closing when child modal (icon selector) is closing
          iconModalClosingRef.current = true;
          setIconModalOpen(false);
          // reset guard after the child modal fully unmounts/animations complete
          setTimeout(() => {
            iconModalClosingRef.current = false;
          }, 300);
        }}
        value={editingProvider.icon || ''}
        onChange={(val) => {
          setEditingProvider({ ...editingProvider, icon: val });
        }}
      />
    </>
  );
};

export default ProviderEditModal;