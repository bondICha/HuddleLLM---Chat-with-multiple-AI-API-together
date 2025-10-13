import { FC, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BiPlus, BiEdit, BiTrash } from 'react-icons/bi';
import { UserConfig, ProviderConfig, CustomApiConfig, CustomApiProvider } from '~services/user-config';
import Button from '../Button';
import ProviderEditModal from './ProviderEditModal';
import IconSelectModal from './IconSelectModal';
import BotIcon from '../BotIcon';
import toast from 'react-hot-toast';

interface Props {
  userConfig: UserConfig;
  updateConfigValue: (update: Partial<UserConfig>) => void;
}

const ApiProviderSettings: FC<Props> = ({ userConfig, updateConfigValue }) => {
  const { t } = useTranslation();
  const [editingProviderIndex, setEditingProviderIndex] = useState<number | null>(null);
  const [providerIconEditIndex, setProviderIconEditIndex] = useState<number | null>(null);

  const providerConfigs = userConfig.providerConfigs || [];

  const updateProviderConfigs = (newConfigs: ProviderConfig[]) => {
    updateConfigValue({ providerConfigs: newConfigs });
  };

  return (
    <>
      <div className="flex flex-col gap-4 w-full">
        <div className="flex justify-between items-center">
          <h3 className="text-md font-semibold">{t('API Providers')}</h3>
          <Button
            size="small"
            text={t('Add New Provider')}
            icon={<BiPlus />}
            onClick={() => {
              const newProvider: ProviderConfig = {
                id: `provider-${Date.now()}`,
                name: 'New Provider',
                provider: CustomApiProvider.OpenAI,
                host: '',
                apiKey: '',
                icon: 'openai',
                isHostFullPath: false,
              };
              updateProviderConfigs([...providerConfigs, newProvider]);
              setEditingProviderIndex(providerConfigs.length);
            }}
            color="primary"
          />
        </div>
        <div className="space-y-3">
          {providerConfigs.map((p, pIndex) => (
            <div key={p.id} className="p-3 rounded-lg bg-white/20 dark:bg-black/20 border border-gray-300 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="cursor-pointer" onClick={() => setProviderIconEditIndex(pIndex)}>
                    <BotIcon iconName={p.icon} size={24} />
                  </div>
                  <span className="font-semibold">{p.name}</span>
                  <span className="text-sm opacity-70">{p.provider}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    <button
                      className="p-1.5 rounded-md hover:bg-gray-300 dark:hover:bg-gray-700"
                      onClick={() => {
                        const updated = [...providerConfigs];
                        const current = updated.splice(pIndex, 1)[0];
                        updated.splice(Math.max(0, pIndex - 1), 0, current);
                        updateProviderConfigs(updated);
                      }}
                      disabled={pIndex === 0}
                      title={t('Move up')}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" viewBox="0 0 16 16"><path fillRule="evenodd" d="M8 15a.5.5 0 0 0 .5-.5V2.707l3.146 3.147a.5.5 0 0 0 .708-.708l-4-4a.5.5 0 0 0-.708 0l-4 4a.5.5 0 1 0 .708.708L7.5 2.707V14.5a.5.5 0 0 0 .5.5z" /></svg>
                    </button>
                    <button
                      className="p-1.5 rounded-md hover:bg-gray-300 dark:hover:bg-gray-700"
                      onClick={() => {
                        const updated = [...providerConfigs];
                        const current = updated.splice(pIndex, 1)[0];
                        updated.splice(pIndex + 1, 0, current);
                        updateProviderConfigs(updated);
                      }}
                      disabled={pIndex === providerConfigs.length - 1}
                      title={t('Move down')}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" viewBox="0 0 16 16"><path fillRule="evenodd" d="M8 1a.5.5 0 0 1 .5.5v11.793l3.146-3.147a.5.5 0 0 1 .708.708l-4 4a.5.5 0 0 1-.708 0l-4-4a.5.5 0 0 1 .708-.708L7.5 13.293V1.5A.5.5 0 0 1 8 1z" /></svg>
                    </button>
                    <button
                      className="p-1.5 rounded-md text-red-500 hover:bg-red-500/10"
                      onClick={() => {
                        const updatedProviders = providerConfigs.filter((_, i) => i !== pIndex);
                        const updatedBots = (userConfig.customApiConfigs || []).map(bot => {
                          if (bot.providerRefId === p.id) {
                            return { ...bot, providerRefId: undefined };
                          }
                          return bot;
                        });
                        updateConfigValue({
                          providerConfigs: updatedProviders,
                          customApiConfigs: updatedBots,
                        });
                        toast.success(t('Provider deleted. Bots referencing it have been switched to individual settings.'));
                      }}
                      title={t('Delete')}
                    >
                      <BiTrash size={12} />
                    </button>
                  </div>
                  <Button
                    size="small"
                    text={t('Edit Provider')}
                    icon={<BiEdit />}
                    onClick={() => setEditingProviderIndex(pIndex)}
                    color="primary"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <IconSelectModal
        open={providerIconEditIndex !== null}
        onClose={() => setProviderIconEditIndex(null)}
        value={providerIconEditIndex !== null ? providerConfigs[providerIconEditIndex]?.icon || '' : ''}
        onChange={(val) => {
          if (providerIconEditIndex !== null) {
            const updated = [...providerConfigs];
            updated[providerIconEditIndex] = { ...updated[providerIconEditIndex], icon: val };
            updateProviderConfigs(updated);
          }
        }}
      />

      <ProviderEditModal
        open={editingProviderIndex !== null}
        onClose={() => setEditingProviderIndex(null)}
        provider={editingProviderIndex !== null ? providerConfigs[editingProviderIndex] : undefined}
        onSave={(updatedProvider) => {
          if (editingProviderIndex !== null) {
            const updated = [...providerConfigs];
            updated[editingProviderIndex] = updatedProvider;
            updateProviderConfigs(updated);
            toast.success(t('Provider updated successfully'));
          }
        }}
      />
    </>
  );
};

export default ApiProviderSettings;