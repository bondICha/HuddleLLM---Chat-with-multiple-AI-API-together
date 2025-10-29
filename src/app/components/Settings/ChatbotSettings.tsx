import { FC, useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { BiPlus, BiTrash, BiHide, BiShow, BiPencil, BiChevronDown, BiExpand } from 'react-icons/bi';
import toast from 'react-hot-toast';
import CopyIcon from '../icons/CopyIcon';
import { cx } from '~/utils';
import { UserConfig, CustomApiProvider, CustomApiConfig, SystemPromptMode, MODEL_LIST, type ProviderConfig } from '~services/user-config';
import { getDefaultImageModel } from '~services/image-tool-definitions';
import { Input, Textarea } from '../Input';
import Select from '../Select';
import Switch from '../Switch';
import Range from '../Range';
import Button from '../Button';
import NestedDropdown, { NestedDropdownOption } from '../NestedDropdown';
import TripleStateToggle from '../TripleStateToggle';
import ModelSearchInput from '../ModelSearchInput';
import DeveloperOptionsPanel from './DeveloperOptionsPanel';
import { getTemplateOptions, getActivePresets, getPresetMapping } from '~services/preset-loader';
import { useApiModels } from '~hooks/use-api-models';
import type { ApiModel } from '~utils/model-fetcher';
import { revalidateEnabledBots } from '~app/hooks/use-enabled-bots';
import SystemPromptEditorModal from './SystemPromptEditorModal';
import HostSearchInput from './HostSearchInput';
import IconSelectModal from './IconSelectModal';
import BotIcon from '../BotIcon';

interface Props {
  userConfig: UserConfig;
  updateConfigValue: (update: Partial<UserConfig>) => void;
}

const MAX_CUSTOM_MODELS = 50;
const TOOL_DEFINITION_EXPAND_OFFSET = 4000;

const providerIsImageMode = (providerConfig?: ProviderConfig) => {
  if (!providerConfig) return false;
  return providerConfig.outputType === 'image';
};

// Helper function to filter image providers (for Image Agent).
const getImageProviders = (providerConfigs: ProviderConfig[]) => {
  return providerConfigs.filter(providerIsImageMode);
};

const ChatbotSettings: FC<Props> = ({ userConfig, updateConfigValue }) => {
  const { t } = useTranslation();
  const [expandedSections, setExpandedSections] = useState<Record<number, boolean>>({});
  const [editingNameIndex, setEditingNameIndex] = useState<number | null>(null);
  const [editingPrompt, setEditingPrompt] = useState<{ index: number; text: string; isCommon: boolean } | null>(null);
  const [nestedTemplateOptions, setNestedTemplateOptions] = useState<NestedDropdownOption[]>([]);
  const [chatbotIconEditIndex, setChatbotIconEditIndex] = useState<number | null>(null);
  const [editingToolDefinition, setEditingToolDefinition] = useState<{ index: number; text: string } | null>(null);

  const { loading: modelsLoading, fetchSingleModel, modelsPerConfig, errorsPerConfig, isProviderSupported } = useApiModels();
  const prevModelsPerConfigRef = useRef<Record<number, ApiModel[]>>({});
  const prevErrorsPerConfigRef = useRef<Record<number, string | null>>({});

  const customApiConfigs = userConfig.customApiConfigs || [];

  const updateCustomApiConfigs = (newConfigs: CustomApiConfig[]) => {
    updateConfigValue({ customApiConfigs: newConfigs });
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (editingNameIndex !== null && !target.closest('input') && !target.closest('.editing-area')) {
        setEditingNameIndex(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [editingNameIndex]);

  useEffect(() => {
    const loadTemplateOptions = async () => {
      try {
        const templateData = await getTemplateOptions();
        setNestedTemplateOptions(templateData.nestedOptions || []);
      } catch (error) {
        console.warn('Failed to load template options:', error);
      }
    };
    loadTemplateOptions();
  }, []);

  // Show toast notifications when models are fetched or errors occur
  useEffect(() => {
    if (!modelsLoading) {
      // Check for new errors
      Object.keys(errorsPerConfig).forEach(key => {
        const index = parseInt(key);
        const error = errorsPerConfig[index];
        const prevError = prevErrorsPerConfigRef.current[index];

        if (error && error !== prevError) {
          toast.error(error);
        }
      });

      // Check for new models
      Object.keys(modelsPerConfig).forEach(key => {
        const index = parseInt(key);
        const models = modelsPerConfig[index];
        const prevModels = prevModelsPerConfigRef.current[index];
        const error = errorsPerConfig[index];

        if (!error && models && models.length > 0 && (!prevModels || prevModels.length === 0)) {
          toast.success(t('Found') + ` ${models.length} ` + t('models'));
        }
      });

      // Update refs
      prevModelsPerConfigRef.current = modelsPerConfig;
      prevErrorsPerConfigRef.current = errorsPerConfig;
    }
  }, [modelsLoading, modelsPerConfig, errorsPerConfig, t]);

  const handleFetchSingleModel = async (index: number) => {
    const config = customApiConfigs[index];
    const providerRef = config.providerRefId
      ? (userConfig.providerConfigs || []).find((p) => p.id === config.providerRefId)
      : undefined;

    // Resolve effective settings with fallback to common settings
    const effectiveHost = (providerRef?.host && providerRef.host.trim().length > 0)
      ? providerRef.host
      : (config.host && config.host.trim().length > 0)
        ? config.host
        : userConfig.customApiHost;

    const effectiveApiKey = (providerRef?.apiKey && providerRef.apiKey.trim().length > 0)
      ? providerRef.apiKey
      : (config.apiKey && config.apiKey.trim().length > 0)
        ? config.apiKey
        : userConfig.customApiKey;

    const effectiveIsHostFullPath = providerRef
      ? (providerRef.isHostFullPath ?? false)
      : (config.host && config.host.trim().length > 0)
        ? (config.isHostFullPath ?? false)
        : (userConfig.isCustomApiHostFullPath ?? false);

    const fetchConfig = {
      provider: providerRef?.provider ?? config.provider,
      apiKey: effectiveApiKey,
      host: effectiveHost,
      isHostFullPath: effectiveIsHostFullPath,
      geminiAuthMode: ((providerRef?.AuthMode || 'header') === 'default') ? 'query' : (config.geminiAuthMode || 'header'),
    };

    await fetchSingleModel(fetchConfig, index);
  };

  const createModelOptions = (configIndex?: number): NestedDropdownOption[] => {
    const options: NestedDropdownOption[] = [];
    if (configIndex !== undefined && modelsPerConfig[configIndex]?.length > 0) {
      const config = customApiConfigs[configIndex];
      if (config) {
        options.push({
          label: 'Fetched API Models',
          children: modelsPerConfig[configIndex].map((model: any) => ({
            label: model.id,
            value: model.id,
            icon: 'FiCode'
          })),
          icon: 'FiCode'
        });
      }
    }

    const getProviderIcon = (provider: string): string => {
      switch (provider.toLowerCase()) {
        case 'openai': return 'openai';
        case 'anthropic': return 'anthropic';
        case 'google': return 'gemini';
        case 'grok': return 'grok';
        case 'deepseek': return 'deepseek';
        case 'rakuten': return 'rakuten';
        case 'qwen': return 'qianwen';
        case 'perplexity': return 'perplexity';
        case 'custom': return 'huddlellm';
        default: return 'chatgpt';
      }
    };

    Object.keys(MODEL_LIST).forEach(provider => {
      const providerIcon = getProviderIcon(provider);
      const categoryOption: NestedDropdownOption = {
        label: provider,
        children: [],
        icon: providerIcon,
      };
      Object.entries(MODEL_LIST[provider]).forEach(([modelName, modelData]) => {
        const modelValue = typeof modelData === 'string' ? modelData : modelData.value;
        const modelIcon = typeof modelData === 'object' && modelData.icon ? modelData.icon : providerIcon;
        categoryOption.children?.push({
          label: modelName,
          value: modelValue,
          icon: modelIcon,
        });
      });
      if (categoryOption.children && categoryOption.children.length > 0) {
        options.push(categoryOption);
      }
    });
    return options;
  };

  const toggleSection = (index: number) => {
    setExpandedSections(prev => ({ ...prev, [index]: !prev[index] }));
  };

  const applyTemplate = async (templateType: string, index: number) => {
    if (templateType === 'none') return;
    const updatedConfigs = [...customApiConfigs];
    try {
      const activePresets = await getActivePresets();
      const presetMap = await getPresetMapping();
      const presetKey = presetMap[templateType];
      if (presetKey && activePresets[presetKey]) {
        const preset = activePresets[presetKey];
        updatedConfigs[index] = { ...updatedConfigs[index], ...preset };
        updateCustomApiConfigs(updatedConfigs);
      }
    } catch (error) {
      console.error('Failed to apply template:', error);
      toast.error(t('Failed to apply template'));
    }
  };

  const addNewCustomModel = () => {
    if (customApiConfigs.length >= MAX_CUSTOM_MODELS) {
      alert(t(`Maximum number of custom models (${MAX_CUSTOM_MODELS}) reached.`));
      return;
    }
    const newId = Math.max(...customApiConfigs.map(c => c.id ?? 0), 0) + 1;
    const newConfig: CustomApiConfig = {
      id: newId,
      name: `Custom AI ${newId}`,
      shortName: `Custom${newId}`,
      model: '',
      host: '',
      temperature: 0.7,
      systemMessage: '',
      systemPromptMode: SystemPromptMode.COMMON,
      avatar: '',
      apiKey: '',
      thinkingMode: false,
      thinkingBudget: 2000,
      provider: CustomApiProvider.OpenAI,
      webAccess: false,
      enabled: true,
    };
    updateCustomApiConfigs([...customApiConfigs, newConfig]);
  };

  const deleteCustomModel = async (index: number) => {
    if (customApiConfigs.length <= 1) {
      alert(t('Cannot delete the last custom model.'));
      return;
    }
    if (!window.confirm(t('Are you sure you want to delete this custom model?'))) {
      return;
    }
    const updatedConfigs = [...customApiConfigs];
    updatedConfigs.splice(index, 1);
    updateCustomApiConfigs(updatedConfigs);
    revalidateEnabledBots();
    toast.success(t('Model deleted. Please save changes to persist.'));
  };

  const toggleBotEnabledState = (index: number) => {
    const updatedConfigs = [...customApiConfigs];
    const config = updatedConfigs[index];
    const isEnabled = config.enabled === true;
    if (isEnabled && updatedConfigs.filter(c => c.enabled).length <= 1) {
      alert(t('At least one bot should be enabled'));
      return;
    }
    updatedConfigs[index].enabled = !isEnabled;
    updateCustomApiConfigs(updatedConfigs);
    revalidateEnabledBots();
  };

  const duplicateCustomModel = (index: number) => {
    const source = customApiConfigs[index];
    if (!source) return;

    const newId = Math.max(0, ...customApiConfigs.map(c => c.id ?? 0)) + 1;
    const baseShort = (source.shortName && source.shortName.trim().length > 0 ? source.shortName : source.name || `Custom${newId}`).replace(/\s+/g, '');
    const shortName = (baseShort ? `${baseShort}C` : `Custom${newId}`).slice(0, 10);

    const duplicatedConfig: CustomApiConfig = {
      ...source,
      id: newId,
      name: source.name ? `${source.name} Copy` : `Custom AI ${newId}`,
      shortName,
      enabled: false,
    };

    duplicatedConfig.advancedConfig = source.advancedConfig ? { ...source.advancedConfig } : undefined;
    duplicatedConfig.imageFunctionToolSettings = source.imageFunctionToolSettings
      ? {
          ...source.imageFunctionToolSettings,
          params: source.imageFunctionToolSettings.params
            ? { ...source.imageFunctionToolSettings.params }
            : undefined,
        }
      : undefined;
    duplicatedConfig.agenticImageBotSettings = source.agenticImageBotSettings
      ? {
          ...source.agenticImageBotSettings,
          promptGeneratorBotIndex: null,
        }
      : undefined;
    duplicatedConfig.toolDefinition = source.toolDefinition
      ? JSON.parse(JSON.stringify(source.toolDefinition))
      : undefined;

    const updated = [
      ...customApiConfigs.slice(0, index + 1),
      duplicatedConfig,
      ...customApiConfigs.slice(index + 1),
    ];
    updateCustomApiConfigs(updated);
    toast.success(t('Duplicated model created'));
  };

  const handleToolDefinitionSave = (newValue: string) => {
    if (editingToolDefinition === null) return true;
    try {
      const parsed = JSON.parse(newValue);
      const updatedConfigs = [...customApiConfigs];
      updatedConfigs[editingToolDefinition.index].toolDefinition = parsed;
      updateCustomApiConfigs(updatedConfigs);
      toast.success(t('Tool definition updated'));
      return true;
    } catch {
      toast.error(t('Invalid JSON'));
      return false;
    }
  };

  const formRowClass = "flex flex-col gap-2";
  const labelClass = "font-medium text-sm";
  const inputContainerClass = "flex-1";

  return (
    <>
      <div className="w-full">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-md font-semibold">{t('Individual Chatbot Settings')}</h3>
          <Button size="small" text={t('Add New Model')} icon={<BiPlus />} onClick={addNewCustomModel} color="primary" />
        </div>
        <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(480px, 1fr))' }}>
          {customApiConfigs.map((config, index) => {
            // ========== Conditional Flags ==========
            const providerRef = config.providerRefId
              ? userConfig.providerConfigs?.find(p => p.id === config.providerRefId)
              : undefined;
            const effectiveProvider = providerRef?.provider ?? config.provider;

            const isImageAgent = effectiveProvider === CustomApiProvider.ImageAgent;
            const isOpenAI = effectiveProvider === CustomApiProvider.OpenAI;
            const isAnthropic = effectiveProvider === CustomApiProvider.Anthropic;
            const isOpenRouter = effectiveProvider === CustomApiProvider.OpenRouter;
            const isGemini = effectiveProvider === CustomApiProvider.VertexAI_Gemini || effectiveProvider === CustomApiProvider.Google;
            const isOpenAIResponses = effectiveProvider === CustomApiProvider.OpenAI_Responses;

            // Show flags
            const showImageAgentSettings = isImageAgent;
            const showAIModelSelection = !isImageAgent;
            const showThinkingBudget = [
              CustomApiProvider.Anthropic,
              CustomApiProvider.Bedrock,
              CustomApiProvider.Anthropic_CustomAuth,
              CustomApiProvider.VertexAI_Claude,
              CustomApiProvider.VertexAI_Gemini,
              CustomApiProvider.GeminiOpenAI,
              CustomApiProvider.QwenOpenAI,
            ].includes(effectiveProvider);
            const showReasoningEffort = isOpenAI;

            // Image Function Tool settings (for OpenAI_Image, OpenRouter Image, etc.)
            const showImageFunctionSettings =
              effectiveProvider === CustomApiProvider.OpenAI_Image ||
              (isOpenRouter && !!config.advancedConfig?.openrouterIsImageModel);

            const showOnlyTemperature = !showThinkingBudget && !showReasoningEffort && !isImageAgent && !showImageFunctionSettings;

            const showAnthropicAuthHeader = !config.providerRefId && isAnthropic;
            const showGeminiAuthMode = !config.providerRefId && isGemini;
            const showApiHost = !config.providerRefId && !isImageAgent;
            const showApiKey = !config.providerRefId && !isImageAgent;
            const showOpenRouterMode = isOpenRouter;
            const showDeveloperOptions = [CustomApiProvider.OpenAI, CustomApiProvider.Anthropic, CustomApiProvider.VertexAI_Claude, CustomApiProvider.OpenRouter].includes(effectiveProvider);
            const showOpenAIResponsesOptions = isOpenAIResponses;
            // ========== End Conditional Flags ==========

            const linkedImageProvider = (userConfig.providerConfigs || []).find(
              p => p.id === config.agenticImageBotSettings?.imageGeneratorProviderId
            );

            const imageAgentMeta = (() => {
              if (!isImageAgent || !config.model || !linkedImageProvider) {
                return null;
              }
            const imageModelConfig = getDefaultImageModel(config.model, linkedImageProvider.provider);
            if (!imageModelConfig) {
              return {
                supportsEdit: false,
                endpoint: (linkedImageProvider.host || '').trim(),
                hasHost: (linkedImageProvider.host || '').trim().length > 0,
                isAsync: false,
              };
            }
            const host = (linkedImageProvider.host || '').trim();
            let endpoint = typeof imageModelConfig.apiConfig.endpoint === 'function'
              ? imageModelConfig.apiConfig.endpoint(false, host)
              : imageModelConfig.apiConfig.endpoint || host;

            // Replace %model placeholder with actual model name for preview
            if (endpoint.includes('%model') && config.model) {
              endpoint = endpoint.replace(/%model/g, encodeURIComponent(config.model));
            }

              return {
                supportsEdit: imageModelConfig.apiConfig.supportsEdit,
                endpoint,
                hasHost: host.length > 0,
                isAsync: imageModelConfig.apiConfig.isAsync,
              };
            })();

            const toolDefinitionText = (() => {
              if (config.toolDefinition) {
                return JSON.stringify(config.toolDefinition, null, 2);
              }
              if (config.model && linkedImageProvider) {
                const defaultModelConfig = getDefaultImageModel(config.model, linkedImageProvider.provider);
                if (defaultModelConfig) {
                  return JSON.stringify(defaultModelConfig.toolDefinition, null, 2);
                }
              }
              return '// Select Image Provider and Model first';
            })();

            const toolDefinitionExpanded = !!expandedSections[index + TOOL_DEFINITION_EXPAND_OFFSET];

            return (
            <div key={config.id || index} className={cx("bg-white/30 dark:bg-black/30 border border-gray-300 dark:border-gray-700 rounded-2xl shadow-lg dark:shadow-[0_10px_15px_-3px_rgba(255,255,255,0.07),0_4px_6px_-2px_rgba(255,255,255,0.04)] transition-all hover:shadow-xl dark:hover:shadow-[0_20px_25px_-5px_rgba(255,255,255,0.1),0_10px_10px_-5px_rgba(255,255,255,0.04)]")}>
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between px-3 pt-3 pb-2 border-b border-white/20 dark:border-white/10">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-xs font-semibold text-primary bg-primary/10 dark:bg-primary/30 px-2 py-1 rounded-full">#{index + 1}</span>
                  <div className="w-12 h-12 md:w-14 md:h-14 flex items-center justify-center rounded-lg bg-white/50 dark:bg-black/40 cursor-pointer" onClick={() => setChatbotIconEditIndex(index)}>
                    <BotIcon iconName={config.avatar} size={48} />
                  </div>
                  <div className="flex-1 min-w-0">
                    {editingNameIndex === index ? (
                      <div className="space-y-2 editing-area">
                        <div>
                          <label className="block text-xs font-medium mb-1 opacity-80">{t('Chatbot Name')}</label>
                          <Input
                            value={config.name}
                            onChange={(e) => {
                              const updatedConfigs = [...customApiConfigs];
                              updatedConfigs[index].name = e.currentTarget.value;
                              updateCustomApiConfigs(updatedConfigs);
                            }}
                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === 'Escape') setEditingNameIndex(null); }}
                            autoFocus
                            placeholder="Enter chatbot name"
                          />
                        </div>
                        <div>
                          <div className="flex items-center gap-1 mb-1">
                            <label className="text-xs font-medium opacity-80">{t('Short Name (10 chars)')}</label>
                            <span className="cursor-help text-xs group relative">ⓘ
                              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-64 hidden group-hover:block bg-gray-900 dark:bg-gray-800 text-white text-xs p-3 rounded-md shadow-xl z-50 border border-gray-600">
                                {t('Short name displayed when sidebar is collapsed. Will wrap to multiple lines if needed.')}
                              </div>
                            </span>
                          </div>
                          <Input
                            value={config.shortName}
                            onChange={(e) => {
                              const updatedConfigs = [...customApiConfigs];
                              updatedConfigs[index].shortName = e.currentTarget.value;
                              updateCustomApiConfigs(updatedConfigs);
                            }}
                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === 'Escape') setEditingNameIndex(null); }}
                            className="text-sm"
                            placeholder="Enter short name"
                            maxLength={10}
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start gap-2 min-w-0">
                        <button className="text-left min-w-0 flex-1" onClick={() => setEditingNameIndex(index)}>
                          <p className="font-semibold truncate">{config.name}</p>
                          <p className="text-xs opacity-60 truncate mt-0.5">{config.shortName}</p>
                        </button>
                        <button
                          className="p-1 rounded hover:bg-white/20"
                          onClick={() => setEditingNameIndex(index)}
                          title={t('Edit name')}
                          type="button"
                        >
                          <BiPencil size={14} />
                        </button>
                      </div>
                    )}
                    {!config.enabled && <span className="inline-flex items-center mt-2 text-[11px] px-2 py-0.5 rounded-full bg-gray-500 text-white">{t('Disabled')}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap justify-end">
                  <NestedDropdown
                    options={nestedTemplateOptions}
                    value={'none'}
                    onChange={(v) => { if (v && v !== 'none') applyTemplate(v, index); }}
                    placeholder={t('Choose a preset to apply')}
                    showModelId={false}
                    trigger={
                      <div className="px-3 py-2 rounded-lg hover:bg-white/20 flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16"><path d="M9.405 1.05c-.413-1.4-2.397-1.4-2.81 0l-.1.34a1.464 1.464 0 0 1-2.105.872l-.31-.17c-1.283-.698-2.686.705-1.987 1.987l.169.311c.446.82.023 1.841-.872 2.105l-.34.1c-1.4.413-1.4 2.397 0 2.81l.34.1a1.464 1.464 0 0 1 .872 2.105l-.17.31c-.698 1.283.705 2.686 1.987 1.987l.311-.169a1.464 1.464 0 0 1 2.105.872l.1.34c.413 1.4 2.397 1.4 2.81 0l.1-.34a1.464 1.464 0 0 1 2.105-.872l.31.17c1.283.698 2.686-.705 1.987-1.987l-.169-.311a1.464 1.464 0 0 1 .872-2.105l.34-.1c1.4-.413 1.4-2.397 0-2.81l-.34-.1a.5.5 0 0 1-.872-2.105l.17-.31c.698-1.283-.705-2.686-1.987-1.987l-.311.169a1.464 1.464 0 0 1-2.105-.872l-.1-.34zM8 10.93a2.929 2.929 0 1 1 0-5.86 2.929 2.929 0 0 1 0 5.858z" /></svg>
                        <span className="text-xs font-medium">{t('Preset')}</span>
                      </div>
                    }
                  />
                  <div className="flex items-center gap-1 flex-wrap">
                    <button className={`p-2 rounded hover:bg-white/20 ${index === 0 ? 'opacity-30 cursor-not-allowed' : ''}`} onClick={() => { if (index > 0) { const u = [...customApiConfigs];[u[index - 1], u[index]] = [u[index], u[index - 1]]; updateCustomApiConfigs(u); } }} disabled={index === 0} title={t('Move up')} type="button">
                      <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="currentColor" viewBox="0 0 16 16"><path fillRule="evenodd" d="M8 15a.5.5 0 0 0 .5-.5V2.707l3.146 3.147a.5.5 0 0 0 .708-.708l-4-4a.5.5 0 0 0-.708 0l-4 4a.5.5 0 1 0 .708.708L7.5 2.707V14.5a.5.5 0 0 0 .5.5z" /></svg>
                    </button>
                    <button className={`p-2 rounded hover:bg-white/20 ${index === customApiConfigs.length - 1 ? 'opacity-30 cursor-not-allowed' : ''}`} onClick={() => { if (index < customApiConfigs.length - 1) { const u = [...customApiConfigs];[u[index], u[index + 1]] = [u[index + 1], u[index]]; updateCustomApiConfigs(u); } }} disabled={index === customApiConfigs.length - 1} title={t('Move down')} type="button">
                      <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="currentColor" viewBox="0 0 16 16"><path fillRule="evenodd" d="M8 1a.5.5 0 0 1 .5.5v11.793l3.146-3.147a.5.5 0 0 1 .708.708l-4 4a.5.5 0 0 1-.708 0l-4-4a.5.5 0 0 1 .708-.708L7.5 13.293V1.5A.5.5 0 0 1 8 1z" /></svg>
                    </button>
                    <button className="p-2 rounded hover:bg-white/20" onClick={() => duplicateCustomModel(index)} title={t('Duplicate')} type="button">
                      <CopyIcon className="w-3.5 h-3.5" />
                    </button>
                    <button className="p-2 rounded hover:bg-white/20" onClick={() => toggleBotEnabledState(index)} title={config.enabled ? t('Disable') : t('Enable')} type="button">
                      {config.enabled ? <BiShow size={14} /> : <BiHide size={14} />}
                    </button>
                    <button className="p-2 rounded hover:bg-white/20 text-red-400" onClick={() => deleteCustomModel(index)} title={t('Delete')} type="button">
                      <BiTrash size={14} />
                    </button>
                  </div>
                </div>
              </div>
              <div className="px-4 pt-3 pb-4 space-y-6">
                <div className="space-y-4">
                    {/* API Provider - with Image Agent option */}
                    <div className={formRowClass}>
                      <p className={labelClass}>{t('API Provider')}</p>
                      <div className="relative">
                        {(() => {
                          const providers = userConfig.providerConfigs || [];
                          const options = [
                            { name: t('Individual Settings'), value: 'individual' },
                            { name: t('Image Generation (Agent)'), value: '__image_agent__' },
                            ...providers.map((p) => ({ name: p.name, value: p.id, icon: p.icon }))
                          ];

                          let currentValue = 'individual';
                          if (config.provider === CustomApiProvider.ImageAgent) {
                            currentValue = '__image_agent__';
                          } else if (config.providerRefId) {
                            currentValue = config.providerRefId;
                          }

                          return (
                            <Select
                              options={options}
                              value={currentValue}
                              onChange={(v) => {
                                const updatedConfigs = [...customApiConfigs];
                                if (v === 'individual') {
                                  updatedConfigs[index].providerRefId = undefined;
                                  if (updatedConfigs[index].provider === CustomApiProvider.ImageAgent) {
                                    updatedConfigs[index].provider = CustomApiProvider.OpenAI;
                                  }
                                } else if (v === '__image_agent__') {
                                  updatedConfigs[index].provider = CustomApiProvider.ImageAgent;
                                  updatedConfigs[index].providerRefId = undefined;
                                  updatedConfigs[index].agenticImageBotSettings = updatedConfigs[index].agenticImageBotSettings || {};
                                } else {
                                  updatedConfigs[index].providerRefId = v;
                                  if (updatedConfigs[index].provider === CustomApiProvider.ImageAgent) {
                                    updatedConfigs[index].provider = CustomApiProvider.OpenAI;
                                  }
                                }
                                updateCustomApiConfigs(updatedConfigs);
                              }}
                              showIcon={true}
                            />
                          );
                        })()}
                      </div>
                    </div>

                    {/* Image Agent Settings - Show when Image Agent is selected */}
                    {showImageAgentSettings && (
                      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 space-y-4">
                        <div className="flex items-center gap-2 mb-2">
                          <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M4 3a2 2 0 100 4h12a2 2 0 100-4H4z"/>
                            <path fillRule="evenodd" d="M3 8h14v7a2 2 0 01-2 2H5a2 2 0 01-2-2V8zm5 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" clipRule="evenodd"/>
                          </svg>
                          <p className="text-sm font-semibold text-blue-900 dark:text-blue-100">{t('Image Generation Settings')}</p>
                        </div>

                        <div className={formRowClass}>
                          <p className={labelClass}>{t('Image Provider')}</p>
                          <Select
                            options={[
                              { name: t('Select Image Provider'), value: '' },
                              ...getImageProviders(userConfig.providerConfigs || []).map(p => ({ name: p.name, value: p.id, icon: p.icon }))
                            ]}
                            value={config.agenticImageBotSettings?.imageGeneratorProviderId || ''}
                            onChange={(v) => {
                              const u = [...customApiConfigs];
                              u[index].agenticImageBotSettings = {
                                ...(u[index].agenticImageBotSettings || {}),
                                imageGeneratorProviderId: v || undefined
                              };
                              updateCustomApiConfigs(u);
                            }}
                            showIcon={true}
                          />
                          <span className="text-xs opacity-70">{t('Select which image generation API to use')}</span>
                        </div>

                        <div className={formRowClass}>
                          <p className={labelClass}>{t('Prompt Generator Bot')}</p>
                          <Select
                            options={[
                              { name: t('None (Use raw prompt)'), value: '-1' },
                              ...customApiConfigs
                                .map((c, i) => ({ name: `#${i + 1} ${c.name}`, value: String(i) }))
                                .filter((_, optIndex) => optIndex !== index)
                            ]}
                            value={
                              config.agenticImageBotSettings?.promptGeneratorBotIndex === null ||
                              config.agenticImageBotSettings?.promptGeneratorBotIndex === undefined
                                ? '-1'
                                : String(config.agenticImageBotSettings.promptGeneratorBotIndex)
                            }
                            onChange={(v) => {
                              const u = [...customApiConfigs];
                              u[index].agenticImageBotSettings = {
                                ...(u[index].agenticImageBotSettings || {}),
                                promptGeneratorBotIndex: v === '-1' ? null : parseInt(v)
                              };
                              updateCustomApiConfigs(u);
                            }}
                          />
                          <span className="text-xs opacity-70">{t('Chatbot to enhance/generate image prompts')}</span>
                        </div>

                        {/* Image Model Selection */}
                        <div className={formRowClass}>
                          <p className={labelClass}>{t('Image Model')}</p>
                          {(() => {
                            const imageProvider = (userConfig.providerConfigs || []).find(
                              p => p.id === config.agenticImageBotSettings?.imageGeneratorProviderId
                            );
                            const isNovita = imageProvider?.provider === CustomApiProvider.NovitaAI || /novita/i.test(imageProvider?.host || '');
                            const isReplicate = imageProvider?.provider === CustomApiProvider.Replicate || /replicate/i.test(imageProvider?.host || '');

                            if (isNovita) {
                              // Novita: Fixed list only
                              const novitaModels = [
                                { name: 'Qwen Image', value: 'qwen-image' },
                                { name: 'Hunyuan Image 3', value: 'hunyuan-image-3' },
                                { name: 'Seedream 4.0', value: 'seedream-4-0' },
                              ];

                              // Auto-set default model if not yet configured
                              if (!config.model && novitaModels.length > 0) {
                                const u = [...customApiConfigs];
                                u[index].model = novitaModels[0].value;
                                updateCustomApiConfigs(u);
                              }

                              return (
                                <>
                                  <Select
                                    options={novitaModels}
                                    value={config.model || novitaModels[0].value}
                                    onChange={(v) => {
                                      const u = [...customApiConfigs];
                                      u[index].model = v;
                                      updateCustomApiConfigs(u);
                                    }}
                                  />
                                  <span className="text-xs opacity-70">{t('Select Novita model. Tool definition will be set automatically.')}</span>
                                </>
                              );
                            } else if (isReplicate) {
                              // Replicate: Fixed list (currently only Imagen 4)
                              const replicateModels = [
                                { name: 'Google Imagen 4', value: 'google/imagen-4' },
                                // Future models can be added here
                              ];

                              // Auto-set default model if not yet configured
                              if (!config.model && replicateModels.length > 0) {
                                const u = [...customApiConfigs];
                                u[index].model = replicateModels[0].value;
                                updateCustomApiConfigs(u);
                              }

                              return (
                                <>
                                  <Select
                                    options={replicateModels}
                                    value={config.model || replicateModels[0].value}
                                    onChange={(v) => {
                                      const u = [...customApiConfigs];
                                      u[index].model = v;
                                      updateCustomApiConfigs(u);
                                    }}
                                  />
                                  <span className="text-xs opacity-70">{t('Select Replicate model. Tool definition will be set automatically.')}</span>
                                </>
                              );
                            } else {
                              // Chutes or others: Free input with suggestions
                              return (
                                <>
                                  <Input
                                    value={config.model || ''}
                                    onChange={(e) => {
                                      const u = [...customApiConfigs];
                                      u[index].model = e.currentTarget.value;
                                      updateCustomApiConfigs(u);
                                    }}
                                    placeholder="chroma, FLUX.1-dev, etc."
                                  />
                                  <span className="text-xs opacity-70">
                                    {t('Common models: chroma, FLUX.1-dev, FLUX.1-schnell. Tool definition will be auto-detected.')}
                                  </span>
                                </>
                              );
                            }
                          })()}
                        </div>

                        {/* Tool Definition Editor */}
                        <div className={formRowClass}>
                          <div className="flex items-center justify-between">
                            <p className={labelClass}>{t('Tool Definition (Advanced)')}</p>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => {
                                  setEditingToolDefinition({
                                    index,
                                    text: toolDefinitionText,
                                  });
                                }}
                                className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
                                title={t('Edit in full screen')}
                              >
                                <BiExpand size={16} />
                              </button>
                              <button
                                onClick={() => {
                                  const u = [...customApiConfigs];
                                  u[index].toolDefinition = undefined; // Clear to use auto-detected default
                                  updateCustomApiConfigs(u);
                                }}
                                className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                              >
                                {t('Restore Default')}
                              </button>
                            </div>
                          </div>
                          <textarea
                            value={toolDefinitionText}
                            onChange={(e) => {
                              const u = [...customApiConfigs];
                              try {
                                const parsed = JSON.parse(e.target.value);
                                u[index].toolDefinition = parsed;
                              } catch {
                                // Invalid JSON - don't update
                              }
                              updateCustomApiConfigs(u);
                            }}
                            className={`w-full p-2 text-xs font-mono border border-gray-300 dark:border-gray-700 border-b-0 rounded-t-md ${
                              config.toolDefinition ? 'bg-white dark:bg-gray-900' : 'bg-gray-50 dark:bg-gray-800'
                            } ${toolDefinitionExpanded ? 'h-64' : 'max-h-[10rem]'} overflow-y-auto`}
                            placeholder={'{\n  "name": "generate_image",\n  "description": "...",\n  "input_schema": {...}\n}'}
                            readOnly={!config.toolDefinition}
                          />
                          <div
                            className="h-3 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 cursor-pointer transition-colors flex items-center justify-center rounded-b-md"
                            onClick={() => toggleSection(index + TOOL_DEFINITION_EXPAND_OFFSET)}
                            title={toolDefinitionExpanded ? t('Collapse') : t('Expand')}
                          >
                            <BiChevronDown size={16} className={`text-gray-600 dark:text-gray-300 transition-transform ${toolDefinitionExpanded ? 'rotate-180' : ''}`} />
                          </div>
                          <span className="text-xs opacity-70">
                            {config.toolDefinition
                              ? t('Custom tool definition. Click "Restore Default" to use auto-detection.')
                              : t('Auto-detected from model. Click the expand button to copy and customize.')}
                          </span>
                        </div>
                      </div>
                    )}

                  {/* AI Model - Only show for non-Image-Agent bots */}
                  {showAIModelSelection && (
                  <div className={formRowClass}>
                    <div className="flex items-center justify-between">
                      <p className={labelClass}>{t('AI Model')}</p>
                      {isProviderSupported(config.provider) && (
                        <button
                          onClick={() => handleFetchSingleModel(index)}
                          disabled={modelsLoading}
                          className="px-3 py-1 text-xs rounded transition-colors bg-white dark:bg-black border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
                          title={errorsPerConfig[index] || t('Fetch models from API')}
                        >
                          {modelsLoading ? t('Loading...') : t('Fetch Models')}
                        </button>
                      )}
                    </div>
                    <div className="flex flex-col gap-3">
                      <NestedDropdown
                        options={createModelOptions(index)}
                        value={config.model}
                        onChange={(v) => {
                          if (!v || v.startsWith('header-')) return;
                          const updatedConfigs = [...customApiConfigs];
                          updatedConfigs[index].model = v;
                          updateCustomApiConfigs(updatedConfigs);
                        }}
                        placeholder={config.model && config.model.trim() !== '' ? t('user-defined-model') : t('Choose model')}
                        showModelId={true}
                      />
                      <ModelSearchInput
                        value={config.model}
                        onChange={(model) => {
                          const updatedConfigs = [...customApiConfigs];
                          updatedConfigs[index].model = model;
                          updateCustomApiConfigs(updatedConfigs);
                        }}
                        apiModels={modelsPerConfig[index]}
                        provider={config.provider}
                        placeholder={t('Search models...')}
                      />
                    </div>
                  </div>
                  )}

                  <div className={formRowClass}>
                    <div className="flex items-center justify-between">
                      <p className={labelClass}>{t('System Prompt')}</p>
                      <button onClick={() => setEditingPrompt({ index: index, text: config.systemMessage, isCommon: false })} className="p-1 rounded hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed" title={t('Edit in full screen')} disabled={config.systemPromptMode === SystemPromptMode.COMMON}>
                        <BiExpand size={16} />
                      </button>
                    </div>
                    <div className={inputContainerClass}>
                      <div className="space-y-2">
                        <div className="flex items-center gap-3">
                          <TripleStateToggle
                            value={config.systemPromptMode || SystemPromptMode.COMMON}
                            onChange={(v: SystemPromptMode) => {
                              const updatedConfigs = [...customApiConfigs];
                              updatedConfigs[index].systemPromptMode = v;
                              updateCustomApiConfigs(updatedConfigs);
                            }}
                          />
                          <div className="text-xs opacity-70">
                            {config.systemPromptMode === SystemPromptMode.COMMON && "Uses common system prompt only"}
                            {config.systemPromptMode === SystemPromptMode.APPEND && "Adds custom text to common prompt"}
                            {config.systemPromptMode === SystemPromptMode.OVERRIDE && "Uses custom prompt only"}
                          </div>
                        </div>
                        <div>
                          <Textarea
                            className={`w-full rounded-b-none ${config.systemPromptMode === SystemPromptMode.COMMON ? 'opacity-50 cursor-not-allowed' : ''} ${expandedSections[index + 2000] ? '' : 'max-h-[4.5rem]'}`}
                            maxRows={expandedSections[index + 2000] ? undefined : 3}
                            value={config.systemMessage}
                            onChange={(e) => {
                              if (config.systemPromptMode !== SystemPromptMode.COMMON) {
                                const updatedConfigs = [...customApiConfigs];
                                updatedConfigs[index].systemMessage = e.currentTarget.value;
                                updateCustomApiConfigs(updatedConfigs);
                              }
                            }}
                            disabled={config.systemPromptMode === SystemPromptMode.COMMON}
                            placeholder={
                              config.systemPromptMode === SystemPromptMode.COMMON
                                ? t('Disabled when using Common system message')
                                : config.systemPromptMode === SystemPromptMode.APPEND
                                  ? t('This text will be appended to the common system message')
                                  : t('This text will override the common system message')
                            }
                          />
                          <div className="h-3 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 cursor-pointer transition-colors flex items-center justify-center rounded-b-md" onClick={() => toggleSection(index + 2000)} title={expandedSections[index + 2000] ? t('Collapse') : t('Expand')}>
                            <BiChevronDown size={16} className={`text-gray-600 dark:text-gray-300 transition-transform ${expandedSections[index + 2000] ? 'rotate-180' : ''}`} />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {showThinkingBudget && (
                          <div className={formRowClass}>
                            <div className="flex items-center justify-between">
                              <p className={labelClass}>{config.thinkingMode ? t('Thinking Budget') : t('Temperature')}</p>
                              <div className="flex items-center gap-1">
                                <span className="text-sm">{t('Thinking Mode')}</span>
                                <Switch
                                  checked={config.thinkingMode ?? false}
                                  onChange={(checked) => {
                                    const updatedConfigs = [...customApiConfigs];
                                    updatedConfigs[index].thinkingMode = checked;
                                    updatedConfigs[index].reasoningEffort = undefined;
                                    updateCustomApiConfigs(updatedConfigs);
                                  }}
                                />
                                <span className="cursor-help group relative">ⓘ
                                  <div className="absolute top-full right-0 mt-2 w-72 hidden group-hover:block bg-gray-900 dark:bg-gray-800 text-white text-xs p-2 rounded shadow-lg z-50">
                                    {config.thinkingMode ? t('thinking_mode_support_note') : 'Temperature controls randomness. Higher = more creative, lower = more focused'}
                                  </div>
                                </span>
                              </div>
                            </div>
                            <div className={inputContainerClass}>
                              {config.thinkingMode ? (
                                <Range value={config.thinkingBudget ?? 2000} onChange={(value) => { const u = [...customApiConfigs]; u[index].thinkingBudget = value; updateCustomApiConfigs(u); }} min={2000} max={32000} step={1000} />
                              ) : (
                                <Range value={config.temperature} onChange={(value) => { const u = [...customApiConfigs]; u[index].temperature = value; updateCustomApiConfigs(u); }} min={0} max={2} step={0.1} />
                              )}
                              {config.thinkingMode && <div className="text-sm text-right mt-1">{config.thinkingBudget} tokens</div>}
                            </div>
                          </div>
                        )}
                        {showReasoningEffort && (
                          <div className={formRowClass}>
                            <div className="flex items-center justify-between">
                              <p className={labelClass}>{config.thinkingMode ? t('Reasoning Effort') : t('Temperature')}</p>
                              <div className="flex items-center gap-1">
                                <span className="text-sm">{t('Reasoning Mode')}</span>
                                <Switch
                                  checked={config.thinkingMode ?? false}
                                  onChange={(checked) => {
                                    const updatedConfigs = [...customApiConfigs];
                                    updatedConfigs[index].thinkingMode = checked;
                                    updatedConfigs[index].thinkingBudget = undefined;
                                    updateCustomApiConfigs(updatedConfigs);
                                  }}
                                />
                                <span className="cursor-help group relative">ⓘ
                                  <div className="absolute top-full right-0 mt-2 w-72 hidden group-hover:block bg-gray-900 dark:bg-gray-800 text-white text-xs p-2 rounded shadow-lg z-50">
                                    {config.thinkingMode ? 'OpenAI Reasoning models (o1-mini, o1-preview) support reasoning mode for better problem-solving' : 'Temperature controls randomness. Higher = more creative, lower = more focused'}
                                  </div>
                                </span>
                              </div>
                            </div>
                            <div className={inputContainerClass}>
                              <Range
                                value={config.thinkingMode ? (config.reasoningEffort === 'minimal' ? 0 : config.reasoningEffort === 'low' ? 1 : config.reasoningEffort === 'medium' ? 2 : config.reasoningEffort === 'high' ? 3 : 2) : config.temperature}
                                onChange={(value) => {
                                  const updatedConfigs = [...customApiConfigs];
                                  if (config.thinkingMode) {
                                    const effortMap: Record<number, 'minimal' | 'low' | 'medium' | 'high'> = { 0: 'minimal', 1: 'low', 2: 'medium', 3: 'high' };
                                    updatedConfigs[index].reasoningEffort = effortMap[value];
                                  } else {
                                    updatedConfigs[index].temperature = value;
                                  }
                                  updateCustomApiConfigs(updatedConfigs);
                                }}
                                min={config.thinkingMode ? 0 : 0}
                                max={config.thinkingMode ? 3 : 2}
                                step={config.thinkingMode ? 1 : 0.1}
                              />
                              <div className="flex justify-between text-xs opacity-70 mt-1" style={{ minHeight: '16px' }}>
                                {config.thinkingMode ? (
                                  <>
                                    <span>{t('Minimal')}</span>
                                    <span>{t('Low')}</span>
                                    <span>{t('Medium')}</span>
                                    <span>{t('High')}</span>
                                  </>
                                ) : (
                                  <span>&nbsp;</span>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                        {showOnlyTemperature && (
                          <div className={formRowClass}>
                            <div className="flex items-center gap-2 mb-2">
                              <p className={labelClass}>{t('Temperature')}</p>
                              <div className="relative">
                                <span className="cursor-help opacity-60 group">ⓘ
                                  <div className="absolute bottom-full mb-2 hidden group-hover:block bg-gray-800 text-white text-xs p-2 rounded shadow-lg w-64">
                                    {t('Temperature controls randomness. Higher = more creative, lower = more focused')}
                                  </div>
                                </span>
                              </div>
                            </div>
                            <div className={inputContainerClass}>
                              <Range value={config.temperature} onChange={(value) => { const u = [...customApiConfigs]; u[index].temperature = value; updateCustomApiConfigs(u); }} min={0} max={2} step={0.1} />
                              <div className="flex justify-between text-xs opacity-70 mt-1" style={{ minHeight: '16px' }}>
                                <span>&nbsp;</span>
                              </div>
                            </div>
                          </div>
                  )}

                  <div className="border-t pt-3">
                    <button className="flex items-center gap-2 w-full text-left text-sm font-medium opacity-80 hover:opacity-100" onClick={() => toggleSection(index)}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" className={`transition-transform ${expandedSections[index] ? 'rotate-90' : ''}`}><path d="M4.646 1.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1 0 .708l-6 6a.5.5 0 0 1-.708-.708L10.293 8 4.646 2.354a.5.5 0 0 1 0-.708z" /></svg>
                      {t('Advanced Settings')}
                    </button>
                    {expandedSections[index] ? (
                      <div className="mt-3 space-y-4">
                        {showAnthropicAuthHeader && (
                          <div className={formRowClass}>
                            <p className={labelClass}>{t('Anthropic Auth Header')}</p>
                            <div className="flex-1">
                              <Select
                                options={[{ name: 'x-api-key (Default)', value: 'false' }, { name: 'Authorization', value: 'true' }]}
                                value={config.isAnthropicUsingAuthorizationHeader ? 'true' : 'false'}
                                onChange={(v) => {
                                  const updatedConfigs = [...customApiConfigs];
                                  updatedConfigs[index].isAnthropicUsingAuthorizationHeader = v === 'true';
                                  updateCustomApiConfigs(updatedConfigs);
                                }}
                              />
                            </div>
                          </div>
                        )}
                        {showGeminiAuthMode && (
                          <div className={formRowClass}>
                            <p className={labelClass}>{t('Gemini Auth Mode')}</p>
                            <div className="flex-1">
                              <Select
                                options={[{ name: 'Header Auth (Authorization: <API Key>)', value: 'header' }, { name: 'Default (Query Param ?key=API_KEY)', value: 'default' }]}
                                value={config.geminiAuthMode === 'query' ? 'default' : (config.geminiAuthMode || 'header')}
                                onChange={(v) => {
                                  const updatedConfigs = [...customApiConfigs];
                                  updatedConfigs[index].geminiAuthMode = (v === 'default' ? 'query' : 'header') as any;
                                  updateCustomApiConfigs(updatedConfigs);
                                }}
                              />
                            </div>
                          </div>
                        )}
                        {showApiHost && (
                          <div className={formRowClass}>
                            <div className="flex items-center justify-between">
                              <p className={labelClass}>{t(config.isHostFullPath ? 'API Endpoint (Full Path)' : 'API Host')}</p>
                              {config.provider === CustomApiProvider.VertexAI_Claude ? (
                                <span className="text-sm">{t('Full Path')}</span>
                              ) : (
                                <div className="flex items-center gap-1">
                                  <span className="text-sm">{t('Full Path')}</span>
                                  <span className="cursor-help group relative">ⓘ
                                    <div className="absolute top-full right-0 mt-2 w-72 hidden group-hover:block bg-gray-900 dark:bg-gray-800 text-white text-xs p-2 rounded shadow-lg z-50">
                                      {t('If "Full Path" is ON, enter the complete API endpoint URL. Otherwise, enter only the base host. If host is blank, Common API Host settings will be used.')}
                                    </div>
                                  </span>
                                </div>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <div className='flex-1'>
                                <HostSearchInput
                                  className='w-full'
                                  placeholder={
                                    config.provider === CustomApiProvider.Google ? t("Not applicable for Google Gemini") :
                                    config.provider === CustomApiProvider.GeminiOpenAI ? "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions" :
                                    config.provider === CustomApiProvider.VertexAI_Gemini ? "https://generativelanguage.googleapis.com/v1beta/models/%model:generateContent" :
                                    config.provider === CustomApiProvider.QwenOpenAI ? "https://dashscope.aliyuncs.com/compatible-mode/v1" :
                                    config.isHostFullPath ? (
                                      config.provider === CustomApiProvider.OpenAI_Responses ? "https://api.example.com/v1/responses" :
                                      config.provider === CustomApiProvider.OpenAI_Image ? "https://api.example.com/v1/responses" :
                                      "https://api.example.com/v1/chat/completions"
                                    ) :
                                    "https://api.example.com"
                                  }
                                  value={config.host}
                                  onChange={(value) => {
                                    const updatedConfigs = [...customApiConfigs];
                                    updatedConfigs[index].host = value;
                                    updateCustomApiConfigs(updatedConfigs);
                                  }}
                                  disabled={config.provider === CustomApiProvider.Google}
                                />
                                {(config.provider === CustomApiProvider.VertexAI_Gemini || config.provider === CustomApiProvider.VertexAI_Claude) && (
                                  <>
                                    <p className="text-xs opacity-70 mt-1 break-words">
                                      {t('vertex_path_model_hint')}
                                    </p>
                                    {config.provider === CustomApiProvider.VertexAI_Gemini && (
                                      <p className="text-xs opacity-70 mt-1 break-words">
                                        {t('vertex_gemini_nonstream_notice')}
                                      </p>
                                    )}
                                  </>
                                )}
                              </div>
                              {config.provider !== CustomApiProvider.VertexAI_Claude && config.provider !== CustomApiProvider.GeminiOpenAI && config.provider !== CustomApiProvider.VertexAI_Gemini && (
                                <Switch
                                  checked={config.isHostFullPath ?? false}
                                  onChange={(checked) => {
                                    const updatedConfigs = [...customApiConfigs];
                                    updatedConfigs[index].isHostFullPath = checked;
                                    updateCustomApiConfigs(updatedConfigs);
                                  }}
                                />
                              )}
                            </div>
                          </div>
                        )}

                        {showApiKey && (
                          <div className={formRowClass}>
                            <p className={labelClass}>API Key</p>
                            <div className={inputContainerClass}>
                              <Input
                                className='w-full'
                                placeholder="Leave blank to use common API Key"
                                value={config.apiKey}
                                onChange={(e) => {
                                  const updatedConfigs = [...customApiConfigs];
                                  updatedConfigs[index].apiKey = e.currentTarget.value;
                                  updateCustomApiConfigs(updatedConfigs);
                                }}
                                type="password"
                              />
                            </div>
                          </div>
                        )}
                        {showOpenRouterMode && (
                            <div className="space-y-4">
                              <div className={formRowClass}>
                                <p className={labelClass}>{t('Mode')}</p>
                                <Select
                                  options={[
                                    { name: 'Chat', value: 'chat' },
                                    { name: 'Image', value: 'image' },
                                  ]}
                                  value={config.advancedConfig?.openrouterIsImageModel ? 'image' : 'chat'}
                                  onChange={(v) => {
                                    const u = [...customApiConfigs];
                                    const updated = {
                                      ...(u[index].advancedConfig || {}),
                                      openrouterIsImageModel: v === 'image',
                                    };
                                    u[index].advancedConfig = updated as any;
                                    updateCustomApiConfigs(u);
                                  }}
                                />
                              </div>
                            </div>
                        )}
                        {showDeveloperOptions && (
                            <DeveloperOptionsPanel
                              config={config}
                              index={index}
                              expandedSections={expandedSections}
                              toggleSection={toggleSection}
                              updateConfig={(updatedConfig: CustomApiConfig) => {
                                const updatedConfigs = [...customApiConfigs];
                                updatedConfigs[index] = updatedConfig;
                                updateCustomApiConfigs(updatedConfigs);
                              }}
                              effectiveProvider={effectiveProvider}
                            />
                        )}
                        {showOpenAIResponsesOptions && (
                            <div className="space-y-4">
                              <div className={formRowClass}>
                                <div className="flex items-center gap-2">
                                  <p className={labelClass}>Web Search</p>
                                </div>
                                <div className={inputContainerClass}>
                                  <Switch
                                    checked={!!config.responsesWebSearch}
                                    onChange={(checked) => {
                                      const u = [...customApiConfigs];
                                      u[index].responsesWebSearch = checked;
                                      updateCustomApiConfigs(u);
                                    }}
                                  />
                                  <p className="text-xs opacity-70 mt-1">Use web_search_preview tool with Responses API.</p>
                                </div>
                              </div>
                              <div className={formRowClass}>
                                <p className={labelClass}>Function Call Tools (JSON)</p>
                                <Textarea
                                  className='w-full font-mono text-xs'
                                  placeholder='[ { "type": "function", "function": { "name": "search", "parameters": {"type":"object","properties":{...}} } } ]'
                                  value={config.responsesFunctionTools || ''}
                                  onChange={(e) => {
                                    const u = [...customApiConfigs];
                                    u[index].responsesFunctionTools = e.currentTarget.value;
                                    updateCustomApiConfigs(u);
                                  }}
                                  rows={4}
                                />
                                <p className="text-xs opacity-70 mt-1">Optional. Raw JSON array for Responses API tools. If set, overrides the simple Web Search toggle.</p>
                              </div>
                            </div>
                        )}
                        {/* Image Agent Settings */}
                        {isImageAgent && (
                          <div className="space-y-4">
                              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 space-y-3">
                                <p className="text-sm font-semibold text-blue-900 dark:text-blue-100">{t('Image Provider Capabilities')}</p>
                                <div className="flex justify-between text-sm">
                                  <span className="opacity-70">{t('Edit Support')}</span>
                                  <span className="font-medium">
                                    {!linkedImageProvider || !config.model
                                      ? t('Select provider and model')
                                      : imageAgentMeta?.supportsEdit
                                        ? t('Enabled')
                                        : t('Disabled')}
                                  </span>
                                </div>
                                <div className="flex justify-between text-sm">
                                  <span className="opacity-70">{t('API Type')}</span>
                                  <span className="font-medium">
                                    {!linkedImageProvider || !config.model
                                      ? t('Select provider and model')
                                      : imageAgentMeta?.isAsync
                                        ? t('Async (task polling)')
                                        : t('Synchronous response')}
                                  </span>
                                </div>
                                <div className="flex justify-between text-sm">
                                  <span className="opacity-70">{t('Endpoint Preview')}</span>
                                  <span className="font-medium text-right break-all">
                                    {!linkedImageProvider || !config.model
                                      ? t('Select provider and model')
                                      : imageAgentMeta?.hasHost
                                        ? imageAgentMeta?.endpoint || t('Configured')
                                        : t('Set provider host to preview')}
                                  </span>
                                </div>
                                <p className="text-xs opacity-70">
                                  {t('Adjust tool parameters inside Tool Definition (Advanced) above.')}
                                </p>
                              </div>
                          </div>
                        )}

                        {/* Image Function Tool Settings (for OpenAI_Image, OpenRouter Image, etc.) */}
                        {showImageFunctionSettings && (
                          <div className="space-y-4">
                                <div className={formRowClass}>
                                  <p className={labelClass}>{t('Image Size')}</p>
                                  <Select
                                    options={[
                                      { name: t('auto'), value: 'auto' },
                                      { name: '1024x1024', value: '1024x1024' },
                                      { name: `1024x1536 ${t('portrait-suffix')}`, value: '1024x1536' },
                                      { name: `1536x1024 ${t('landscape-suffix')}`, value: '1536x1024' },
                                    ]}
                                    value={(config.imageFunctionToolSettings?.params as any)?.size || 'auto'}
                                    onChange={(v) => { const u = [...customApiConfigs]; const params = { ...((u[index].imageFunctionToolSettings?.params as any) || {}), size: v as any }; u[index].imageFunctionToolSettings = { ...(u[index].imageFunctionToolSettings || {}), params }; updateCustomApiConfigs(u); }}
                                  />
                                </div>

                                <div className={formRowClass}>
                                  <p className={labelClass}>{t('Image Quality')}</p>
                                  <Select
                                    options={[
                                      { name: t('auto'), value: 'auto' },
                                      { name: t('low'), value: 'low' },
                                      { name: t('medium'), value: 'medium' },
                                      { name: t('high'), value: 'high' },
                                      { name: 'standard', value: 'standard' },
                                      { name: 'hd', value: 'hd' },
                                    ]}
                                    value={(config.imageFunctionToolSettings?.params as any)?.quality || 'auto'}
                                    onChange={(v) => { const u = [...customApiConfigs]; const params = { ...((u[index].imageFunctionToolSettings?.params as any) || {}), quality: v as any }; u[index].imageFunctionToolSettings = { ...(u[index].imageFunctionToolSettings || {}), params }; updateCustomApiConfigs(u); }}
                                  />
                                </div>

                                <div className={formRowClass}>
                                  <p className={labelClass}>{t('Background')}</p>
                                  <Select
                                    options={[
                                      { name: t('auto'), value: 'auto' },
                                      { name: t('transparent'), value: 'transparent' },
                                    ]}
                                    value={(config.imageFunctionToolSettings?.params as any)?.background || 'auto'}
                                    onChange={(v) => { const u = [...customApiConfigs]; const params = { ...((u[index].imageFunctionToolSettings?.params as any) || {}), background: v as any }; u[index].imageFunctionToolSettings = { ...(u[index].imageFunctionToolSettings || {}), params }; updateCustomApiConfigs(u); }}
                                  />
                                </div>

                                <div className={formRowClass}>
                                  <p className={labelClass}>{t('Output Format')}</p>
                                  <Select
                                    options={[
                                      { name: 'none (default)', value: 'none' },
                                      { name: 'png', value: 'png' },
                                      { name: 'jpeg', value: 'jpeg' },
                                      { name: 'webp', value: 'webp' },
                                    ]}
                                    value={(config.imageFunctionToolSettings?.params as any)?.format || 'none'}
                                    onChange={(v) => { const u = [...customApiConfigs]; const params = { ...((u[index].imageFunctionToolSettings?.params as any) || {}), format: v as any }; u[index].imageFunctionToolSettings = { ...(u[index].imageFunctionToolSettings || {}), params }; updateCustomApiConfigs(u); }}
                                  />
                                </div>

                                <div className={formRowClass}>
                                  <p className={labelClass}>{t('Compression (0-100)')}</p>
                                  <Input
                                    type="number"
                                    min={0}
                                    max={100}
                                    value={typeof (config.imageFunctionToolSettings?.params as any)?.output_compression === 'number' ? String((config.imageFunctionToolSettings?.params as any).output_compression) : ''}
                                    placeholder={t('Only for jpeg/webp')}
                                    onChange={(e) => {
                                      const val = e.currentTarget.value
                                      const num = val === '' ? undefined : Math.max(0, Math.min(100, parseInt(val)))
                                      const u = [...customApiConfigs]
                                      const params = { ...((u[index].imageFunctionToolSettings?.params as any) || {}), output_compression: num }
                                      u[index].imageFunctionToolSettings = { ...(u[index].imageFunctionToolSettings || {}), params }
                                      updateCustomApiConfigs(u)
                                    }}
                                  />
                                </div>

                                <div className={formRowClass}>
                                  <p className={labelClass}>Provider Params (JSON)</p>
                                  <Textarea
                                    defaultValue={JSON.stringify(config.imageFunctionToolSettings?.params || {}, null, 2)}
                                    onBlur={(e) => {
                                      try {
                                        const json = e.currentTarget.value.trim() ? JSON.parse(e.currentTarget.value) : {}
                                        const u = [...customApiConfigs]
                                        u[index].imageFunctionToolSettings = { ...(u[index].imageFunctionToolSettings || {}), params: json }
                                        updateCustomApiConfigs(u)
                                      } catch (err) {
                                        toast.error('Invalid JSON')
                                      }
                                    }}
                                    placeholder={`{\n  \"size\": \"1024x1024\",\n  \"quality\": \"high\"\n}`}
                                  />
                                  <span className="text-xs opacity-70">Use any provider-specific keys. See docs/image generation.</span>
                                </div>
                          </div>
                        )}
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          );
          })}
        </div>
        <div className="flex justify-end mt-4">
          <Button size="small" text={t('Add New Model')} icon={<BiPlus />} onClick={addNewCustomModel} color="primary" />
        </div>
      </div>
      {editingPrompt && (
        <SystemPromptEditorModal
          open={editingPrompt !== null}
          onClose={() => setEditingPrompt(null)}
          value={editingPrompt.text}
          onSave={(newValue) => {
            if (editingPrompt.isCommon) {
              updateConfigValue({ commonSystemMessage: newValue });
            } else {
              const updatedConfigs = [...customApiConfigs];
              updatedConfigs[editingPrompt.index].systemMessage = newValue;
              updateCustomApiConfigs(updatedConfigs);
            }
            toast.success(t('System prompt updated'));
          }}
        />
      )}
      {editingToolDefinition && (
        <SystemPromptEditorModal
          open={editingToolDefinition !== null}
          onClose={() => setEditingToolDefinition(null)}
          value={editingToolDefinition.text}
          onSave={(newValue) => handleToolDefinitionSave(newValue)}
          title={t('Edit Tool Definition')}
        />
      )}
      <IconSelectModal
        open={chatbotIconEditIndex !== null}
        onClose={() => setChatbotIconEditIndex(null)}
        value={chatbotIconEditIndex !== null ? customApiConfigs[chatbotIconEditIndex]?.avatar || '' : ''}
        onChange={(val) => {
          if (chatbotIconEditIndex !== null) {
            const updated = [...customApiConfigs];
            updated[chatbotIconEditIndex] = { ...updated[chatbotIconEditIndex], avatar: val };
            updateCustomApiConfigs(updated);
          }
        }}
      />
    </>
  );
};

export default ChatbotSettings;
