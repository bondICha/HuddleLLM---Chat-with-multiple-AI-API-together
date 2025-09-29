import { FC, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BiPlus, BiTrash, BiEdit } from 'react-icons/bi';
import toast from 'react-hot-toast';
import { UserConfig, CustomApiProvider, ProviderConfig } from '~services/user-config';
import Button from '../Button';
import Blockquote from './Blockquote';
import IconSelectModal from './IconSelectModal';
import BotIcon from '../BotIcon';
import ProviderEditModal from './ProviderEditModal';

interface Props {
  userConfig: UserConfig;
  updateConfigValue: (update: Partial<UserConfig>) => void;
}

const ApiProviderSettings: FC<Props> = ({ userConfig, updateConfigValue }) => {
  const { t } = useTranslation();
  const [providerIconEditIndex, setProviderIconEditIndex] = useState<number | null>(null);
  const [editingProviderIndex, setEditingProviderIndex] = useState<number | null>(null);

  const providerConfigs = userConfig.providerConfigs || [];

  const updateProviderConfigs = (newProviders: ProviderConfig[]) => {
    updateConfigValue({ providerConfigs: newProviders });
  };

  const genId = () => `prov_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  const formRowClass = "flex flex-col gap-2";
  const labelClass = "font-medium text-sm";
  const inputContainerClass = "flex-1";

  return (
    <>
      <div className="p-4 rounded-lg bg-white/20 dark:bg-black/20 border border-gray-300 dark:border-gray-700 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-md font-semibold">{t('API Providers')}</h3>
          <Button
            size="small"
            text={t('Add Provider')}
            icon={<BiPlus />}
            onClick={() => {
              const defProvider: ProviderConfig = {
                id: genId(),
                name: `Provider ${providerConfigs.length + 1}`,
                provider: CustomApiProvider.OpenAI,
                host: '',
                isHostFullPath: false,
                apiKey: '',
                icon: 'OpenAI.Black',
                isAnthropicUsingAuthorizationHeader: false,
              };
              updateProviderConfigs([...providerConfigs, defProvider]);
            }}
            color="primary"
          />
        </div>
        <Blockquote>{t('Manage your API provider configurations here. These can be referenced by individual chatbots.')}</Blockquote>

        <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))' }}>
          {providerConfigs.map((prov, pIndex) => (
            <div key={prov.id} className="bg-white/30 dark:bg-black/30 border border-gray-300 dark:border-gray-700 rounded-lg shadow transition-all">
              <div className="p-3">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 cursor-pointer" onClick={() => setProviderIconEditIndex(pIndex)}>
                    <BotIcon iconName={prov.icon} size={32} />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-sm truncate">{prov.name}</h4>
                    <p className="text-xs opacity-60 truncate">
                      {prov.provider === CustomApiProvider.OpenAI && 'OpenAI Compatible'}
                      {prov.provider === CustomApiProvider.Anthropic && 'Anthropic Claude API'}
                      {prov.provider === CustomApiProvider.Bedrock && 'AWS Bedrock (Anthropic)'}
                      {prov.provider === CustomApiProvider.GeminiOpenAI && 'Google Gemini (OpenAI Format)'}
                      {prov.provider === CustomApiProvider.QwenOpenAI && 'Qwen (OpenAI Format)'}
                      {prov.provider === CustomApiProvider.VertexAI_Claude && 'VertexAI (Claude)'}
                      {prov.provider === CustomApiProvider.Google && 'Google Gemini API (Deprecated)'}
                    </p>
                  </div>
                  <span className="text-xs font-mono opacity-40">#{pIndex + 1}</span>
                </div>
 
                <div className="text-xs opacity-60 mb-3 space-y-1">
                  <div className="truncate">Host: {prov.host || t('Not set')}</div>
                  <div className="text-primary">API Key: {prov.apiKey ? '••••••••' : t('Not set')}</div>
                </div>
 
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <button
                      className={`p-1 rounded ${pIndex === 0 ? 'opacity-30 cursor-not-allowed' : 'hover:bg-white/20'}`}
                      onClick={() => {
                        if (pIndex > 0) {
                          const updated = [...providerConfigs];
                          [updated[pIndex - 1], updated[pIndex]] = [updated[pIndex], updated[pIndex - 1]];
                          updateProviderConfigs(updated);
                        }
                      }}
                      disabled={pIndex === 0}
                      title={t('Move up')}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" viewBox="0 0 16 16"><path fillRule="evenodd" d="M8 15a.5.5 0 0 0 .5-.5V2.707l3.146 3.147a.5.5 0 0 0 .708-.708l-4-4a.5.5 0 0 0-.708 0l-4 4a.5.5 0 1 0 .708.708L7.5 2.707V14.5a.5.5 0 0 0 .5.5z" /></svg>
                    </button>
                    <button
                      className={`p-1 rounded ${pIndex === providerConfigs.length - 1 ? 'opacity-30 cursor-not-allowed' : 'hover:bg-white/20'}`}
                      onClick={() => {
                        if (pIndex < providerConfigs.length - 1) {
                          const updated = [...providerConfigs];
                          [updated[pIndex], updated[pIndex + 1]] = [updated[pIndex + 1], updated[pIndex]];
                          updateProviderConfigs(updated);
                        }
                      }}
                      disabled={pIndex === providerConfigs.length - 1}
                      title={t('Move down')}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" viewBox="0 0 16 16"><path fillRule="evenodd" d="M8 1a.5.5 0 0 1 .5.5v11.793l3.146-3.147a.5.5 0 0 1 .708.708l-4 4a.5.5 0 0 1-.708 0l-4-4a.5.5 0 0 1 .708-.708L7.5 13.293V1.5A.5.5 0 0 1 8 1z" /></svg>
                    </button>
                    <button
                      className="p-1 rounded hover:bg-white/20"
                      onClick={() => {
                        const copy = { ...prov, id: genId(), name: `${prov.name} Copy` };
                        updateProviderConfigs([
                          ...providerConfigs.slice(0, pIndex + 1),
                          copy,
                          ...providerConfigs.slice(pIndex + 1),
                        ]);
                      }}
                      title={t('Duplicate')}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" viewBox="0 0 16 16"><path d="M4 1a2 2 0 0 0-2 2v8h1V3a1 1 0 0 1 1-1h8V1H4z" /><path d="M6 5a2 2 0 0 1 2-2h5a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V5z" /></svg>
                    </button>
                    <button
                      className="p-1 rounded hover:bg-white/20 text-red-400"
                      onClick={() => {
                        if (!window.confirm(t('Are you sure you want to delete this provider?'))) return;
                        const updatedProviders = [...providerConfigs];
                        updatedProviders.splice(pIndex, 1);
 
                        const updatedBots = (userConfig.customApiConfigs || []).map((c) => {
                          if (c.providerRefId === prov.id) {
                            return {
                              ...c,
                              providerRefId: undefined,
                            };
                          }
                          return c;
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
        provider={editingProviderIndex !== null ? providerConfigs[editingProviderIndex] : null}
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