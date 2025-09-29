import { FC, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { BiPlus, BiTrash, BiHide, BiShow, BiPencil, BiChevronDown, BiExpand } from 'react-icons/bi';
import toast from 'react-hot-toast';
import { cx } from '~/utils';
import { UserConfig, CustomApiProvider, CustomApiConfig, SystemPromptMode, MODEL_LIST } from '~services/user-config';
import { Input, Textarea } from '../Input';
import Select from '../Select';
import Switch from '../Switch';
import Range from '../Range';
import Button from '../Button';
import AvatarSelect from './AvatarSelect';
import NestedDropdown, { NestedDropdownOption } from '../NestedDropdown';
import TripleStateToggle from '../TripleStateToggle';
import ModelSearchInput from '../ModelSearchInput';
import DeveloperOptionsPanel from './DeveloperOptionsPanel';
import { getTemplateOptions, getActivePresets, getPresetMapping } from '~services/preset-loader';
import { useApiModels } from '~hooks/use-api-models';
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

const ChatbotSettings: FC<Props> = ({ userConfig, updateConfigValue }) => {
  const { t } = useTranslation();
  const [expandedSections, setExpandedSections] = useState<Record<number, boolean>>({});
  const [editingNameIndex, setEditingNameIndex] = useState<number | null>(null);
  const [editingPrompt, setEditingPrompt] = useState<{ index: number; text: string; isCommon: boolean } | null>(null);
  const [nestedTemplateOptions, setNestedTemplateOptions] = useState<NestedDropdownOption[]>([]);
  const [chatbotIconEditIndex, setChatbotIconEditIndex] = useState<number | null>(null);

  const { loading: modelsLoading, fetchAllModels, modelsPerConfig, errorsPerConfig, isProviderSupported } = useApiModels();

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

  const handleFetchAllModels = async () => {
    const configs = customApiConfigs.map(config => {
      const providerRef = (config.providerRefId)
        ? (userConfig.providerConfigs || []).find((p) => p.id === config.providerRefId)
        : undefined;

      return {
        provider: providerRef?.provider ?? config.provider,
        apiKey: providerRef?.apiKey ?? config.apiKey,
        host: providerRef?.host ?? config.host,
        isHostFullPath: providerRef?.isHostFullPath ?? config.isHostFullPath,
      };
    });
    await fetchAllModels(configs);
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
          {customApiConfigs.map((config, index) => (
            <div key={config.id || index} className={cx("bg-white/30 dark:bg-black/30 border border-gray-300 dark:border-gray-700 rounded-2xl shadow-lg dark:shadow-[0_10px_15px_-3px_rgba(255,255,255,0.07),0_4px_6px_-2px_rgba(255,255,255,0.04)] transition-all hover:shadow-xl dark:hover:shadow-[0_20px_25px_-5px_rgba(255,255,255,0.1),0_10px_10px_-5px_rgba(255,255,255,0.04)]")}>
              <div className="grid grid-cols-[60px_1fr_140px] items-center p-4 border-b border-white/20 dark:border-white/10 gap-2">
                <span className="font-bold text-lg text-primary text-center">#{index + 1}</span>
                <div className="flex flex-col items-center justify-center">
                  <div className="w-16 h-16 mb-2 cursor-pointer" onClick={() => setChatbotIconEditIndex(index)}>
                    <BotIcon iconName={config.avatar} size={64} />
                  </div>
                  <div className="relative w-full max-w-[200px]">
                    {editingNameIndex === index ? (
                      <div className="space-y-3 editing-area">
                        <div>
                          <label className="block text-xs font-medium text-center mb-1 opacity-80">{t('Chatbot Name')}</label>
                          <Input
                            value={config.name}
                            onChange={(e) => {
                              const updatedConfigs = [...customApiConfigs];
                              updatedConfigs[index].name = e.currentTarget.value;
                              updateCustomApiConfigs(updatedConfigs);
                            }}
                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === 'Escape') setEditingNameIndex(null); }}
                            autoFocus
                            className="text-center"
                            placeholder="Enter chatbot name"
                          />
                        </div>
                        <div>
                          <div className="flex items-center justify-center mb-1">
                            <label className="text-xs font-medium opacity-80 mr-1">{t('Short Name (10 chars)')}</label>
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
                            className="text-center text-sm"
                            placeholder="Enter short name"
                            maxLength={10}
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="relative group">
                        <div className="cursor-pointer" onClick={() => setEditingNameIndex(index)}>
                          <p className="font-semibold text-center truncate">{config.name}</p>
                          <p className="text-sm text-center truncate opacity-60 mt-1">{config.shortName}</p>
                        </div>
                        <BiPencil className="absolute right-0 top-1/2 transform -translate-y-1/2 opacity-0 group-hover:opacity-70 transition-opacity cursor-pointer" onClick={() => setEditingNameIndex(index)} />
                      </div>
                    )}
                  </div>
                  {!config.enabled && <span className="text-xs bg-gray-500 text-white px-2 py-0.5 rounded-full mt-2">{t('Disabled')}</span>}
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <NestedDropdown
                      options={nestedTemplateOptions}
                      value={'none'}
                      onChange={(v) => { if (v && v !== 'none') applyTemplate(v, index); }}
                      placeholder={t('Choose a preset to apply')}
                      showModelId={false}
                      trigger={
                        <div className="p-2 rounded-lg hover:bg-white/20 flex flex-col items-center justify-center min-w-[60px] w-full">
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16" className="mb-1"><path d="M9.405 1.05c-.413-1.4-2.397-1.4-2.81 0l-.1.34a1.464 1.464 0 0 1-2.105.872l-.31-.17c-1.283-.698-2.686.705-1.987 1.987l.169.311c.446.82.023 1.841-.872 2.105l-.34.1c-1.4.413-1.4 2.397 0 2.81l.34.1a1.464 1.464 0 0 1 .872 2.105l-.17.31c-.698 1.283.705 2.686 1.987 1.987l.311-.169a1.464 1.464 0 0 1 2.105.872l.1.34c.413 1.4 2.397 1.4 2.81 0l.1-.34a1.464 1.464 0 0 1 2.105-.872l.31.17c1.283.698 2.686-.705 1.987-1.987l-.169-.311a1.464 1.464 0 0 1 .872-2.105l.34-.1c1.4-.413 1.4-2.397 0-2.81l-.34-.1a1.464 1.464 0 0 1-.872-2.105l.17-.31c.698-1.283-.705-2.686-1.987-1.987l-.311.169a1.464 1.464 0 0 1-2.105-.872l-.1-.34zM8 10.93a2.929 2.929 0 1 1 0-5.86 2.929 2.929 0 0 1 0 5.858z" /></svg>
                          <span className="text-xs font-medium">Preset</span>
                        </div>
                      }
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-1 flex-shrink-0">
                    <button className={`p-2 rounded-lg ${index === 0 ? 'opacity-30 cursor-not-allowed' : 'hover:bg-white/20'} flex items-center justify-center`} onClick={() => { if (index > 0) { const u = [...customApiConfigs];[u[index - 1], u[index]] = [u[index], u[index - 1]]; updateCustomApiConfigs(u); } }} disabled={index === 0} title={t('Move up')}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16"><path fillRule="evenodd" d="M8 15a.5.5 0 0 0 .5-.5V2.707l3.146 3.147a.5.5 0 0 0 .708-.708l-4-4a.5.5 0 0 0-.708 0l-4 4a.5.5 0 1 0 .708.708L7.5 2.707V14.5a.5.5 0 0 0 .5.5z" /></svg>
                    </button>
                    <button className={`p-2 rounded-lg ${index === customApiConfigs.length - 1 ? 'opacity-30 cursor-not-allowed' : 'hover:bg-white/20'} flex items-center justify-center`} onClick={() => { if (index < customApiConfigs.length - 1) { const u = [...customApiConfigs];[u[index], u[index + 1]] = [u[index + 1], u[index]]; updateCustomApiConfigs(u); } }} disabled={index === customApiConfigs.length - 1} title={t('Move down')}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16"><path fillRule="evenodd" d="M8 1a.5.5 0 0 1 .5.5v11.793l3.146-3.147a.5.5 0 0 1 .708.708l-4 4a.5.5 0 0 1-.708 0l-4-4a.5.5 0 0 1 .708-.708L7.5 13.293V1.5A.5.5 0 0 1 8 1z" /></svg>
                    </button>
                    <button className="p-2 rounded-lg hover:bg-white/20 flex items-center justify-center" onClick={() => toggleBotEnabledState(index)} title={config.enabled ? t('Disable') : t('Enable')}>
                      {config.enabled ? <BiShow size={14} /> : <BiHide size={14} />}
                    </button>
                    <button className="p-2 rounded-lg hover:bg-white/20 text-red-400 flex items-center justify-center" onClick={() => deleteCustomModel(index)} title={t('Delete')}>
                      <BiTrash size={14} />
                    </button>
                  </div>
                </div>
              </div>
              <div className="p-4 space-y-6">
                <div className="space-y-4">
                  <div className="space-y-4">
                    <div className={formRowClass}>
                      <p className={labelClass}>{t('API Provider')}</p>
                      <Select
                        options={[
                          // Individual Settings のときはアイコンを表示しない（undefined）
                          { name: t('Individual Settings'), value: 'individual' },
                          ...(userConfig.providerConfigs || []).map((p) => ({ name: p.name, value: p.id, icon: p.icon }))
                        ]}
                        value={config.providerRefId || 'individual'}
                        onChange={(v) => {
                          const updatedConfigs = [...customApiConfigs];
                          if (v === 'individual') {
                            updatedConfigs[index].providerRefId = undefined;
                          } else {
                            updatedConfigs[index].providerRefId = v;
                          }
                          updateCustomApiConfigs(updatedConfigs);
                        }}
                        showIcon={true}
                      />
                    </div>
                  </div>
                  <div className={formRowClass}>
                    <div className="flex items-center justify-between">
                      <p className={labelClass}>{t('AI Model')}</p>
                      {isProviderSupported(config.provider) && (
                        <button onClick={handleFetchAllModels} disabled={modelsLoading} className={`px-3 py-1 text-xs rounded transition-colors ${errorsPerConfig[index] ? 'bg-gray-400 text-gray-600 hover:bg-gray-500 disabled:bg-gray-300' : 'bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white'}`} title={errorsPerConfig[index] || t('Fetch models from API for all chatbots')}>
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
                  {(() => {
                    const isAnthropicProvider = config.provider === CustomApiProvider.Anthropic || config.provider === CustomApiProvider.Bedrock || config.provider === CustomApiProvider.Anthropic_CustomAuth || config.provider === CustomApiProvider.VertexAI_Claude;
                    const isGeminiOpenAIProvider = config.provider === CustomApiProvider.GeminiOpenAI;
                    const isQwenOpenAIProvider = config.provider === CustomApiProvider.QwenOpenAI;
                    const isOpenAIProvider = config.provider === CustomApiProvider.OpenAI;
                    return (
                      <>
                        {(isAnthropicProvider || isGeminiOpenAIProvider || isQwenOpenAIProvider) && (
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
                        {isOpenAIProvider ? (
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
                        ) : !isAnthropicProvider && !isGeminiOpenAIProvider && !isQwenOpenAIProvider && (
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
                      </>
                    );
                  })()}
                  <div className="border-t pt-3">
                    <button className="flex items-center gap-2 w-full text-left text-sm font-medium opacity-80 hover:opacity-100" onClick={() => toggleSection(index)}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" className={`transition-transform ${expandedSections[index] ? 'rotate-90' : ''}`}><path d="M4.646 1.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1 0 .708l-6 6a.5.5 0 0 1-.708-.708L10.293 8 4.646 2.354a.5.5 0 0 1 0-.708z" /></svg>
                      {t('Advanced Settings')}
                    </button>
                    {expandedSections[index] ? (
                      <div className="mt-3 space-y-4">
                        {!config.providerRefId && (
                          <div className={formRowClass}>
                            <p className={labelClass}>{t('API Scheme')}</p>
                            <div className="flex-1">
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
                                value={config.provider || CustomApiProvider.OpenAI}
                                onChange={(v) => {
                                  const updatedConfigs = [...customApiConfigs];
                                  updatedConfigs[index].provider = v as CustomApiProvider;
                                  if (v === CustomApiProvider.GeminiOpenAI || v === CustomApiProvider.VertexAI_Claude) {
                                    updatedConfigs[index].isHostFullPath = true;
                                  }
                                  updateCustomApiConfigs(updatedConfigs);
                                }}
                              />
                            </div>
                          </div>
                        )}
                        {!config.providerRefId && config.provider === CustomApiProvider.Anthropic && (
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
                        {!config.providerRefId && (
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
                              <HostSearchInput
                                className='flex-1'
                                placeholder={
                                  config.provider === CustomApiProvider.Google ? t("Not applicable for Google Gemini") :
                                  config.provider === CustomApiProvider.GeminiOpenAI ? "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions" :
                                  config.provider === CustomApiProvider.QwenOpenAI ? "https://dashscope.aliyuncs.com/compatible-mode/v1" :
                                  config.isHostFullPath ? "https://api.example.com/v1/chat/completions" :
                                  "https://api.openai.com"
                                }
                                value={config.host}
                                onChange={(value) => {
                                  const updatedConfigs = [...customApiConfigs];
                                  updatedConfigs[index].host = value;
                                  updateCustomApiConfigs(updatedConfigs);
                                }}
                                disabled={config.provider === CustomApiProvider.Google}
                              />
                              {config.provider !== CustomApiProvider.VertexAI_Claude && config.provider !== CustomApiProvider.GeminiOpenAI && (
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
                        {!config.providerRefId && (
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
                        {!config.providerRefId && (config.provider === CustomApiProvider.OpenAI || config.provider === CustomApiProvider.Anthropic || config.provider === CustomApiProvider.VertexAI_Claude) && (
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
                          />
                        )}
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          ))}
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