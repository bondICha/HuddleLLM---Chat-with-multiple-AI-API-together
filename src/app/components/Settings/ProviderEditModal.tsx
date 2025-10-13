import { FC, useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { UserConfig, CustomApiProvider, ProviderConfig } from '~services/user-config';
import { getApiSchemeOptions } from './api-scheme-options';
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
              options={getApiSchemeOptions()}
              value={editingProvider.provider || CustomApiProvider.OpenAI}
              onChange={(v) => {
                const next = { ...editingProvider, provider: v as CustomApiProvider };
                if (v === CustomApiProvider.GeminiOpenAI || v === CustomApiProvider.VertexAI_Claude || v === CustomApiProvider.VertexAI_Gemini) {
                  next.isHostFullPath = true;
                }
                // Default Auth mode for Gemini-capable providers
                if (v === CustomApiProvider.VertexAI_Gemini || v === CustomApiProvider.Google) {
                  next.AuthMode = next.AuthMode || 'header';
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

          {/* Gemini Auth Mode */}
          {(editingProvider.provider === CustomApiProvider.VertexAI_Gemini || editingProvider.provider === CustomApiProvider.Google) && (
            <div className={formRowClass}>
              <p className={labelClass}>{t('Gemini Auth Mode')}</p>
              <Select
                options={[
                  { name: 'Header Auth (Authorization: <API Key>)', value: 'header' },
                  { name: 'Default (Query Param ?key=API_KEY)', value: 'default' },
                ]}
                value={editingProvider.AuthMode || 'header'}
                onChange={(v) => setEditingProvider({ ...editingProvider, AuthMode: v as any })}
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
              <div className="flex-1">
              <HostSearchInput
                  className='w-full'
                  placeholder={
                  editingProvider.provider === CustomApiProvider.OpenRouter ? "https://openrouter.ai/api" :
                  editingProvider.provider === CustomApiProvider.Google ? t("Not applicable for Google Gemini") :
                  editingProvider.provider === CustomApiProvider.GeminiOpenAI ? "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions" :
                  editingProvider.provider === CustomApiProvider.VertexAI_Gemini ? "https://api-provider.com/google-vertexai/v1/publishers/google/models/%model:generateContent" :
                  editingProvider.provider === CustomApiProvider.QwenOpenAI ? "https://dashscope.aliyuncs.com/compatible-mode/v1" :
                  editingProvider.isHostFullPath ? (
                    editingProvider.provider === CustomApiProvider.OpenAI_Responses ? "https://api.example.com/v1/responses" :
                    editingProvider.provider === CustomApiProvider.OpenAI_Image ? "https://api.example.com/v1/responses" :
                    "https://api.example.com/v1/chat/completions"
                  ) :
                  "https://api.example.com"
                  }
                  value={editingProvider.host}
                  onChange={(value) => {
                    setEditingProvider({ ...editingProvider, host: value });
                  }}
                  disabled={editingProvider.provider === CustomApiProvider.Google}
                />
                {(editingProvider.provider === CustomApiProvider.VertexAI_Gemini || editingProvider.provider === CustomApiProvider.VertexAI_Claude) && (
                  <>
                    <p className="text-xs opacity-70 mt-1 break-words">
                      {t('vertex_path_model_hint')}
                    </p>
                    {editingProvider.provider === CustomApiProvider.VertexAI_Gemini && (
                      <p className="text-xs opacity-70 mt-1 break-words">
                        {t('vertex_gemini_nonstream_notice')}
                      </p>
                    )}
                  </>
                )}
              </div>
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
