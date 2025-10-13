import { FC, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BiPlus } from 'react-icons/bi';
import { UserConfig, ImageGenerator } from '~services/user-config';
import Button from '../Button';
import ChatbotSettings from './ChatbotSettings';
import ProviderEditModal from './ProviderEditModal';
import IconSelectModal from './IconSelectModal';
import BotIcon from '../BotIcon';
import { ProviderConfig } from '~services/user-config';
import Blockquote from './Blockquote';
import ImageGeneratorEditModal from './ImageGeneratorEditModal';

interface Props {
  userConfig: UserConfig;
  updateConfigValue: (update: Partial<UserConfig>) => void;
}

const CustomAPISettings: FC<Props> = ({ userConfig, updateConfigValue }) => {
  const { t } = useTranslation();
  const [showProviderModal, setShowProviderModal] = useState(false);
  const [editingProvider, setEditingProvider] = useState<ProviderConfig | undefined>(undefined);
  const [providerIconEditIndex, setProviderIconEditIndex] = useState<number | null>(null);
  const [showGenModal, setShowGenModal] = useState<{ open: boolean; idx: number | null }>({ open: false, idx: null });

  const handleSaveProvider = (provider: ProviderConfig) => {
    const updatedProviders = [...(userConfig.providerConfigs || [])];
    if (editingProvider) {
      const index = updatedProviders.findIndex((p) => p.id === editingProvider.id);
      if (index > -1) {
        updatedProviders[index] = provider;
      }
    } else {
      updatedProviders.push({ ...provider, id: `provider-${Date.now()}` });
    }
    updateConfigValue({ providerConfigs: updatedProviders });
    setEditingProvider(undefined);
    setShowProviderModal(false);
  };

  const handleDeleteProvider = (id: string) => {
    if (window.confirm(t('Are you sure you want to delete this provider?'))) {
      const updatedProviders = (userConfig.providerConfigs || []).filter((p) => p.id !== id);
      updateConfigValue({ providerConfigs: updatedProviders });
    }
  };

  return (
    <>
      <div className="flex flex-col gap-4 w-full">
        <p className="font-bold text-lg">{t('API Providers')}</p>
        <div className="p-4 rounded-lg bg-white/20 dark:bg-black/20 border border-gray-300 dark:border-gray-700 space-y-3">
          <Blockquote>{t('API Providers allow you to centrally manage API credentials and settings, then apply them to multiple chatbots.')}</Blockquote>
          <div className="space-y-2">
            {(userConfig.providerConfigs || []).map((provider, idx) => (
              <div key={provider.id} className="flex items-center justify-between rounded-md border border-gray-300 dark:border-gray-700 px-3 py-2">
                <div className="flex items-center gap-3">
                  <div className="cursor-pointer" title={t('Change icon') as string} onClick={() => setProviderIconEditIndex(idx)}>
                    <BotIcon iconName={provider.icon || ''} size={20} />
                  </div>
                  <span className="text-sm font-medium">{provider.name}</span>
                  <span className="text-xs opacity-70">{provider.provider}</span>
                  <span className="text-xs opacity-70">{provider.host}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="small"
                    color="flat"
                    text={t('Edit')}
                    onClick={() => {
                      setEditingProvider(provider);
                      setShowProviderModal(true);
                    }}
                  />
                  <Button
                    size="small"
                    color="flat"
                    text={t('Delete')}
                    onClick={() => handleDeleteProvider(provider.id)}
                  />
                </div>
              </div>
            ))}
            <div className="flex justify-end">
              <Button
                size="small"
                color="primary"
                text={t('Add New Provider')}
                icon={<BiPlus />}
                onClick={() => {
                  setEditingProvider(undefined);
                  setShowProviderModal(true);
                }}
              />
            </div>
          </div>
        </div>
      </div>

      <ChatbotSettings userConfig={userConfig} updateConfigValue={updateConfigValue} />

      <ProviderEditModal
        open={showProviderModal}
        onClose={() => setShowProviderModal(false)}
        provider={editingProvider}
        onSave={handleSaveProvider}
      />

      <IconSelectModal
        open={providerIconEditIndex !== null}
        onClose={() => setProviderIconEditIndex(null)}
        value={providerIconEditIndex !== null ? (userConfig.providerConfigs || [])[providerIconEditIndex!]?.icon || '' : ''}
        onChange={(val) => {
          if (providerIconEditIndex !== null) {
            const updated = [...(userConfig.providerConfigs || [])]
            if (updated[providerIconEditIndex]) {
              updated[providerIconEditIndex] = { ...updated[providerIconEditIndex], icon: val }
              updateConfigValue({ providerConfigs: updated })
            }
          }
        }}
      />

      {/* Image Generators moved under API Providers (to avoid duplication) */}
    </>
  );
};

export default CustomAPISettings;
