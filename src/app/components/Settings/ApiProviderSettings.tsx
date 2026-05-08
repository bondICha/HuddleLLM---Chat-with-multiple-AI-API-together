import { FC, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BiPlus, BiTrash, BiEdit } from 'react-icons/bi';
import toast from 'react-hot-toast';
import { UserConfig, CustomApiProvider, ProviderConfig } from '~services/user-config';
import { PROVIDER_DEFAULTS } from '~/../config/providers/provider-defaults';
import { getApiSchemeOptions } from './api-scheme-options';
import Button from '../Button';
import Blockquote from './Blockquote';
import IconSelectModal from './IconSelectModal';
import BotIcon from '../BotIcon';
import ProviderEditModal from './ProviderEditModal';
import CopyIcon from '../icons/CopyIcon';
import { resolveActiveKeyForProvider, maskKey } from '~/utils/active-api-key';
import { cx } from '~/utils';

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

  const createDefaultProvider = (
    baseProvider: CustomApiProvider = CustomApiProvider.OpenAI,
    name?: string,
  ): ProviderConfig => {
    const providerDefaults = PROVIDER_DEFAULTS[baseProvider];
    const schemeOption = getApiSchemeOptions().find(opt => opt.value === baseProvider);

    return {
      id: genId(),
      name: name || `Provider ${providerConfigs.length + 1}`,
      provider: baseProvider,
      host: providerDefaults?.host ?? '',
      isHostFullPath: providerDefaults?.isHostFullPath ?? false,
      apiKey: '',
      icon: 'OpenAI.Black',
      isAnthropicUsingAuthorizationHeader: false,
      outputType: schemeOption?.outputType,
    };
  };

  const formRowClass = "flex flex-col gap-2";
  const labelClass = "font-medium text-sm";
  const inputContainerClass = "flex-1";

  const resolveProviderMode = (prov: ProviderConfig): 'chat' | 'image' => {
    return prov.outputType === 'image' ? 'image' : 'chat';
  };

  const schemeLookup = useMemo(() => {
    const map = new Map<CustomApiProvider, string>();
    getApiSchemeOptions().forEach(opt => {
      map.set(opt.value, opt.name);
    });
    return map;
  }, []);

  const getProviderScheme = (prov: ProviderConfig) => {
    return schemeLookup.get(prov.provider) || prov.provider;
  };

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
              const defProvider = createDefaultProvider(CustomApiProvider.OpenAI);
              updateProviderConfigs([...providerConfigs, defProvider]);
            }}
            color="primary"
          />
        </div>
        <Blockquote>{t('Manage your API provider configurations here. These can be referenced by individual chatbots.')}</Blockquote>

        <div className="flex flex-col gap-3">
          {providerConfigs.map((prov, pIndex) => {
            const active = resolveActiveKeyForProvider(prov, userConfig.customApiKey || '');
            const usingIndividual = active.source === 'individual';
            const usingCommon = active.source === 'common';
            const apiKeyBadgeColor = usingIndividual
              ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'
              : usingCommon
                ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300'
                : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300';
            const apiKeyText = usingIndividual
              ? `${t('Active Key')}: ${t('Individual')}`
              : usingCommon
                ? `${t('Active Key')}: ${t('Common')} (${maskKey(userConfig.customApiKey || '')})`
                : t('No API Key configured');
            return (
            <div key={prov.id} id={`provider-setting-${pIndex}`} className="scroll-mt-3 bg-white/30 dark:bg-black/30 border border-gray-300 dark:border-gray-700 rounded-lg shadow transition-all">
              <div className="p-3 grid grid-cols-1 lg:grid-cols-12 gap-3 items-center">
                {/* Icon + Name */}
                <div className="lg:col-span-4 flex items-center gap-2 min-w-0">
                  <div className="w-8 h-8 cursor-pointer flex-shrink-0" onClick={() => setProviderIconEditIndex(pIndex)}>
                    <BotIcon iconName={prov.icon} size={32} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <h4 className="font-medium text-sm truncate">{prov.name}</h4>
                      {prov.provider === CustomApiProvider.Replicate && resolveProviderMode(prov) === 'image' && (
                        <span className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-1.5 py-0.5 rounded whitespace-nowrap flex-shrink-0">
                          {t('Recommended')}
                        </span>
                      )}
                    </div>
                    <p className="text-xs opacity-60 truncate">{getProviderScheme(prov)}</p>
                  </div>
                  <span className="text-xs font-mono opacity-40 flex-shrink-0">#{pIndex + 1}</span>
                </div>

                {/* Type chip */}
                <div className="lg:col-span-1">
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-white/40 dark:bg-black/40 border border-gray-300 dark:border-gray-700 whitespace-nowrap">
                    {resolveProviderMode(prov) === 'image' ? t('Image Generation') : t('Chat')}
                  </span>
                </div>

                {/* Host display */}
                <div className="lg:col-span-4 min-w-0">
                  <p className="text-xs opacity-60 mb-0.5">Host</p>
                  <p className="text-xs truncate font-mono">{prov.host || <span className="opacity-50 italic">{t('Not set')}</span>}</p>
                </div>

                {/* API Key status */}
                <div className="lg:col-span-2 min-w-0">
                  <span className={cx('inline-block text-[10px] px-1.5 py-0.5 rounded-sm font-medium truncate max-w-full', apiKeyBadgeColor)} title={apiKeyText}>
                    {apiKeyText}
                  </span>
                </div>

                {/* Actions */}
                <div className="lg:col-span-1 flex items-center gap-0.5 justify-end">
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
                    <CopyIcon className="w-3 h-3" />
                  </button>
                  <button
                    className="p-1 rounded hover:bg-white/20 text-red-400"
                    onClick={() => {
                      if (!window.confirm(t('Are you sure you want to delete this provider?'))) return;
                      const updatedProviders = [...providerConfigs];
                      updatedProviders.splice(pIndex, 1);
                      const updatedBots = (userConfig.customApiConfigs || []).map((c) => {
                        if (c.providerRefId === prov.id) return { ...c, providerRefId: undefined };
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

                {/* Replicate hint (only when applicable) */}
                {prov.provider === CustomApiProvider.Replicate && resolveProviderMode(prov) === 'image' && (
                  <div className="lg:col-span-12 text-xs text-blue-600 dark:text-blue-400">
                    💡 {t('Easy setup with API integration - supports a wide range of models')}
                  </div>
                )}

                {/* Edit button on its own row to keep main row compact */}
                <div className="lg:col-span-12 flex justify-end -mt-1">
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
          );})}
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
        commonApiKey={userConfig.customApiKey || ''}
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
