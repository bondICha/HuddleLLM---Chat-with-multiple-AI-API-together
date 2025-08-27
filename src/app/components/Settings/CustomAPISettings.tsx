// Removed duplicate import
import { useTranslation } from 'react-i18next'
import { FC, useState, useEffect } from 'react' // useEffect をインポート
import toast from 'react-hot-toast'
import {
    UserConfig,
    CustomApiProvider,
    MODEL_LIST, // 新しいモデルリストをインポート
} from '~services/user-config'
import { Input, Textarea } from '../Input'
import Dialog from '../Dialog'
import { SystemPromptMode } from '~services/user-config'
import { CHATGPT_API_MODELS, DEFAULT_SYSTEM_MESSAGE } from '~app/consts'
import TripleStateToggle from '../TripleStateToggle';
import Select from '../Select' 
import NestedDropdown, { NestedDropdownOption } from '../NestedDropdown'; 
import Blockquote from './Blockquote'
import Range from '../Range'
import Switch from '~app/components/Switch'
import AvatarSelect from './AvatarSelect'
import BotIcon from '../BotIcon'
import { BiPlus, BiTrash, BiHide, BiShow, BiInfoCircle } from 'react-icons/bi'
import Button from '../Button'
import { revalidateEnabledBots } from '~app/hooks/use-enabled-bots'
import { getTemplateOptions, getActivePresets, getPresetMapping } from '~services/preset-loader'


interface Props {
    userConfig: UserConfig
    updateConfigValue: (update: Partial<UserConfig>) => void
}

// 最大カスタムモデル数（上限を増やす）
const MAX_CUSTOM_MODELS = 50;

const CustomAPISettings: FC<Props> = ({ userConfig, updateConfigValue }) => {
    const { t } = useTranslation()
    const [expandedSections, setExpandedSections] = useState<Record<number, boolean>>({});
    // 選択されたモデルのプロバイダーを保持するステートを追加
    const [selectedProviderForModel, setSelectedProviderForModel] = useState<Record<number, string | null>>({});
    // デフォルトに戻す確認ダイアログのstate
    const [showResetDialog, setShowResetDialog] = useState(false);
    // 変数一覧の表示状態
    const [showVariables, setShowVariables] = useState(false);

    // テンプレートオプションの状態
    const [templateOptions, setTemplateOptions] = useState([
        { name: t('Apply Template Settings'), value: 'none' }
    ]);
    const [nestedTemplateOptions, setNestedTemplateOptions] = useState<NestedDropdownOption[]>([]);
    const [isHierarchical, setIsHierarchical] = useState(false);

    // コンポーネント初期化時にテンプレートオプションを読み込み
    useEffect(() => {
        const loadTemplateOptions = async () => {
            try {
                const templateData = await getTemplateOptions();
                setTemplateOptions(templateData.flatOptions);
                setNestedTemplateOptions(templateData.nestedOptions || []);
                setIsHierarchical(templateData.isHierarchical);
            } catch (error) {
                console.warn('Failed to load template options:', error);
            }
        };
        loadTemplateOptions();
    }, []);

    // 防御的チェック: customApiConfigsが未定義の場合は空配列として扱う
    const customApiConfigs = userConfig.customApiConfigs || [];

    const updateCustomApiConfigs = (newConfigs: UserConfig['customApiConfigs']) => {
        updateConfigValue({ customApiConfigs: newConfigs });
    }

    // Common System Messageをデフォルトに戻す関数
    const resetToDefaultSystemMessage = () => {
        updateConfigValue({ commonSystemMessage: DEFAULT_SYSTEM_MESSAGE });
        setShowResetDialog(false);
        toast.success(t('Common System Message has been reset to default'));
    }

    const formRowClass = "grid grid-cols-[1fr_4fr] items-center gap-4"
    // const formRowClass = "grid grid-cols-[200px_1fr] items-center gap-4"
    const labelClass = "font-medium text-sm text-right self-start pt-2"
    const inputContainerClass = "flex-1"

    // モデル選択用のオプションを作成する関数（NestedDropdown用）
    const createModelOptions = (): NestedDropdownOption[] => {
        const options: NestedDropdownOption[] = [];

        Object.keys(MODEL_LIST).forEach(provider => {
            // プロバイダーカテゴリを作成
            const categoryOption: NestedDropdownOption = {
                label: provider, // プロバイダー名をラベルに
                // カテゴリ自体は選択できないように value を設定しないか、disabled: true を設定
                disabled: true, // カテゴリ行を選択不可にする
                children: [], // 子要素（モデル）を格納する配列
            };

            // そのプロバイダーのモデルを子要素として追加
            Object.entries(MODEL_LIST[provider]).forEach(([modelName, modelValue]) => {
                categoryOption.children?.push({
                    label: modelName, // モデル名をラベルに
                    value: modelValue, // モデル値を value に
                });
            });

            // モデルが存在する場合のみカテゴリを追加
            if (categoryOption.children && categoryOption.children.length > 0) {
              options.push(categoryOption);
            }
        });

        return options;
    };

    // セクションの展開/折りたたみを切り替える関数
    const toggleSection = (index: number) => {
        setExpandedSections(prev => ({
            ...prev,
            [index]: !prev[index]
        }));
    };


    // テンプレートを適用する関数
    const applyTemplate = async (templateType: string, index: number) => {
        if (templateType === 'none') return;

        const updatedConfigs = [...userConfig.customApiConfigs];
        
        try {
            // 動的にプリセットとマッピングを取得
            const activePresets = await getActivePresets();
            const presetMap = await getPresetMapping();
            
            const presetKey = presetMap[templateType];
            if (presetKey && activePresets[presetKey]) {
                const preset = activePresets[presetKey];


            // オブジェクト全体を上書きするのではなく、各プロパティを個別に更新
            // モデル名と同じように個別のプロパティを更新することで、onChange と同じ動作にする
            updatedConfigs[index].name = preset.name;
            updatedConfigs[index].shortName = preset.shortName;
            updatedConfigs[index].model = preset.model;
            updatedConfigs[index].host = preset.host;
            updatedConfigs[index].temperature = preset.temperature;
            updatedConfigs[index].systemMessage = preset.systemMessage;
            updatedConfigs[index].systemPromptMode = preset.systemPromptMode;
            updatedConfigs[index].avatar = preset.avatar;
            updatedConfigs[index].thinkingMode = preset.thinkingMode;
            updatedConfigs[index].thinkingBudget = preset.thinkingBudget;
                updatedConfigs[index].provider = preset.provider;

                updateConfigValue({ customApiConfigs: updatedConfigs });
            }
        } catch (error) {
            console.error('Failed to apply template:', error);
            toast.error('テンプレートの適用に失敗しました');
        }
    };

    // 新しいカスタムモデルを追加
    const addNewCustomModel = () => {
        if (customApiConfigs.length >= MAX_CUSTOM_MODELS) {
            alert(t(`Maximum number of custom models (${MAX_CUSTOM_MODELS}) reached.`));
            return;
        }

        const newId = Math.max(...customApiConfigs.map(c => c.id ?? 0), 0) + 1;
        const newConfig = {
            id: newId,
            name: `Custom AI ${newId}`,
            shortName: `Cus${newId}`,
            model: 'gpt-4o',
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
            enabled: true // 新しいモデルはデフォルトで有効
        };

        // カスタムモデル設定のみを更新
        updateConfigValue({
            customApiConfigs: [...customApiConfigs, newConfig]
        });
    };

    // カスタムモデルを削除
    const deleteCustomModel = async (index: number) => {
        if (userConfig.customApiConfigs.length <= 1) {
            alert(t('Cannot delete the last custom model.'));
            return;
        }

        if (!window.confirm(t('Are you sure you want to delete this custom model?'))) {
            return;
        }

        const updatedConfigs = [...userConfig.customApiConfigs];
        // 設定から削除
        updatedConfigs.splice(index, 1);

        // ローカルのReactステートを更新（「Save changes」で永続化）
        updateConfigValue({
            customApiConfigs: updatedConfigs,
        });

        // サイドバーの再検証を実行
        revalidateEnabledBots();

        // 保存を促すトースト
        toast.success(t('Model deleted. Please save changes to persist.'));
    };

    // モデルの有効/無効を切り替え
    const toggleBotEnabledState = (index: number) => {
        const updatedConfigs = [...userConfig.customApiConfigs];
        const currentConfig = updatedConfigs[index];
        const isCurrentlyEnabled = currentConfig.enabled === true;

        if (isCurrentlyEnabled) {
            // 無効にする前に、有効なボットが他にもあるかチェック
            const enabledCount = updatedConfigs.filter(config => config.enabled === true).length;
            if (enabledCount <= 1) {
                alert(t('At least one bot should be enabled'));
                return;
            }
            updatedConfigs[index].enabled = false;
        } else {
            // 有効にする
            updatedConfigs[index].enabled = true;
        }
        
        updateCustomApiConfigs(updatedConfigs);
        revalidateEnabledBots(); // Sidebarの更新をトリガー
    };



    // Removed duplicate useEffect hook

    return (
        <>
        <div className="flex flex-col gap-4">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-bold">{t('Custom API Models')}</h2>
                <Button
                    size="small"
                    text={t('Add New Model')}
                    icon={<BiPlus />}
                    onClick={addNewCustomModel}
                    color="primary"
                />
            </div>
            <div className="flex flex-col gap-3">
                {/* Common API Settings */}
                <div className="space-y-3">
                    <div className={formRowClass}>
                        <p className={labelClass}>{t("Common API Key")}</p>
                        <div className={inputContainerClass}>
                            <Input
                                className='w-full'
                                placeholder="AIxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                                value={userConfig.customApiKey}
                                onChange={(e) => updateConfigValue({ customApiKey: e.currentTarget.value })}
                                type="password"
                            />
                        </div>

                    </div>
                    <Blockquote className="mt-1 ml-[25%]">{t('Your keys are stored locally')}</Blockquote>

                    <div className={formRowClass}>
                        <p className={labelClass}>{t('Common System Message')}</p>
                        <div className="w-full">
                            <button
                                onClick={() => setShowVariables(!showVariables)}
                                className="flex items-center gap-1 opacity-70 hover:opacity-90 cursor-pointer transition-opacity mb-2"
                            >
                                <BiInfoCircle className="w-4 h-4" />
                                <span className="text-xs">{showVariables ? t('Hide') : t('Show available variables')}</span>
                            </button>
                            <div className="flex flex-col gap-2 w-full">
                                {/* 変数一覧の展開可能セクション */}
                                {showVariables && (
                                    <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border">
                                        <p className="font-medium mb-2 text-sm">{t('Variables description')}</p>
                                        <div className="grid grid-cols-1 gap-1 text-xs">
                                            <div className="flex items-center gap-2">
                                                <code className="bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 px-1 rounded">{'{current_date}'}</code>
                                                <span className="opacity-70">- Current date (YYYY-MM-DD)</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <code className="bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 px-1 rounded">{'{current_time}'}</code>
                                                <span className="opacity-70">- Current time (HH:MM:SS)</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <code className="bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 px-1 rounded">{'{modelname}'}</code>
                                                <span className="opacity-70">- AI model name</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <code className="bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 px-1 rounded">{'{chatbotname}'}</code>
                                                <span className="opacity-70">- Chatbot display name</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <code className="bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 px-1 rounded">{'{language}'}</code>
                                                <span className="opacity-70">- User language setting</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <code className="bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 px-1 rounded">{'{timezone}'}</code>
                                                <span className="opacity-70">- User timezone</span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                                <Textarea
                                    className='w-full'
                                    maxRows={5}
                                    value={userConfig.commonSystemMessage}
                                    onChange={(e) => updateConfigValue({ commonSystemMessage: e.currentTarget.value })}
                                />
                                <Button
                                    text={t('Reset Common system prompt to default')}
                                    color="flat"
                                    size="small"
                                    onClick={() => setShowResetDialog(true)}
                                    className="self-start"
                                />
                            </div>
                        </div>
                    </div>

                    <div className={formRowClass}>
                        <p className={labelClass}>{t(userConfig.isCustomApiHostFullPath ? 'API Endpoint (Full Path)' : 'Common API Host')}</p>
                        <div className="flex items-center gap-2 flex-1"> {/* Changed from inputContainerClass to allow flex items */}
                            <Input
                                className='flex-1'
                                placeholder={userConfig.isCustomApiHostFullPath ? t("https://api.example.com/v1/chat/completions") : "https://api.openai.com"}
                                value={userConfig.customApiHost}
                                onChange={(e) => updateConfigValue({ customApiHost: e.currentTarget.value })}
                            />
                            <Switch
                                checked={userConfig.isCustomApiHostFullPath ?? false}
                                onChange={(checked) => updateConfigValue({ isCustomApiHostFullPath: checked })}
                            />
                            <span className="text-sm">{t('Full Path')}</span>
                            <div className="relative group">
                                <span className="cursor-help opacity-60">ⓘ</span>
                                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-72 hidden group-hover:block bg-gray-700 text-white text-xs p-2 rounded shadow-lg z-10">
                                    {t('If "Full Path" is ON, enter the complete API endpoint URL. Otherwise, enter only the base host (e.g., https://api.openai.com) and the standard path (e.g., /v1/chat/completions) will be appended automatically.')}
                                </div>
                            </div>
                        </div>
                    </div>


                </div>

                {/* Custom Chatbots */}
                <div className="w-full">
                    <div className="flex flex-wrap gap-2">
                        {userConfig.customApiConfigs.map((config, index) => (
                            <div key={index} className="min-w-[600px] flex-1 max-w-[800px] p-3 border border-gray-600 rounded-lg hover:shadow-lg transition-shadow space-y-4">
                                <div className="flex justify-between items-center mb-4">
                                    <div className="flex items-center gap-2">
                                        <p className="font-semibold text-base">{t(`Custom Chatbot No. ${index + 1}`)}</p>
                                        {!config.enabled && (
                                            <span className="text-xs bg-gray-600 text-white px-2 py-0.5 rounded">
                                                {t('Disabled')}
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex gap-2">
                                        {/* テンプレート選択ドロップダウン */}
                                        <div className="mr-2">
                                            {isHierarchical && nestedTemplateOptions.length > 0 ? (
                                                <NestedDropdown
                                                    options={nestedTemplateOptions}
                                                    value={'none'}
                                                    onChange={(v) => {
                                                        if (v !== 'none') {
                                                            applyTemplate(v, index);
                                                        }
                                                    }}
                                                    placeholder={t('Apply Template Settings')}
                                                    showModelId={true}
                                                />
                                            ) : (
                                                <Select
                                                    options={templateOptions}
                                                    value={'none'}
                                                    onChange={(v) => {
                                                        if (v !== 'none') {
                                                            applyTemplate(v, index);
                                                        }
                                                    }}
                                                    position="top"
                                                />
                                            )}
                                        </div>
                                        

                                        {/* 表示/非表示ボタン */}
                                        <button
                                            className="p-1 rounded hover:bg-gray-700"
                                            onClick={() => toggleBotEnabledState(index)}
                                            title={config.enabled ? t('Disable') : t('Enable')}
                                        >
                                            {config.enabled ? <BiShow size={16} /> : <BiHide size={16} />}
                                        </button>

                                        {/* 削除ボタン */}
                                        <button
                                            className="p-1 rounded hover:bg-gray-700 text-red-400"
                                            onClick={() => deleteCustomModel(index)}
                                            title={t('Delete')}
                                        >
                                            <BiTrash size={16} />
                                        </button>
                                        <button
                                            className={`p-1 rounded ${index === 0 ? 'opacity-40 cursor-not-allowed' : 'hover:bg-gray-700'}`}
                                            onClick={() => {
                                                if (index > 0) {
                                                    const updatedConfigs = [...customApiConfigs];
                                                    // 設定を入れ替え
                                                    [updatedConfigs[index - 1], updatedConfigs[index]] = [updatedConfigs[index], updatedConfigs[index - 1]];
                                                    
                                                    // カスタムAPI設定のみを更新
                                                    updateCustomApiConfigs(updatedConfigs);
                                                }
                                            }}
                                            disabled={index === 0}
                                            title={t('Move up')}
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                                                <path fillRule="evenodd" d="M8 15a.5.5 0 0 0 .5-.5V2.707l3.146 3.147a.5.5 0 0 0 .708-.708l-4-4a.5.5 0 0 0-.708 0l-4 4a.5.5 0 1 0 .708.708L7.5 2.707V14.5a.5.5 0 0 0 .5.5z" />
                                            </svg>
                                        </button>
                                        <button
                                            className={`p-1 rounded ${index === customApiConfigs.length - 1 ? 'opacity-40 cursor-not-allowed' : 'hover:bg-gray-700'}`}
                                            onClick={() => {
                                                if (index < customApiConfigs.length - 1) {
                                                    const updatedConfigs = [...customApiConfigs];
                                                    // 設定を入れ替え
                                                    [updatedConfigs[index], updatedConfigs[index + 1]] = [updatedConfigs[index + 1], updatedConfigs[index]];
                                                    
                                                    // カスタムAPI設定のみを更新
                                                    updateCustomApiConfigs(updatedConfigs);
                                                }
                                            }}
                                            disabled={index === userConfig.customApiConfigs.length - 1}
                                            title={t('Move down')}
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                                                <path fillRule="evenodd" d="M8 1a.5.5 0 0 1 .5.5v11.793l3.146-3.147a.5.5 0 0 1 .708.708l-4 4a.5.5 0 0 1-.708 0l-4-4a.5.5 0 0 1 .708-.708L7.5 13.293V1.5A.5.5 0 0 1 8 1z" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    {/* 基本設定セクション（常に表示） */}
                                    <div className="space-y-4">
                                        {/* Name Row */}
                                        <div className={formRowClass}>
                                            <p className={labelClass}>{t('Custom Chatbot Name')}</p>
                                            <div className="flex gap-1">
                                                <Input
                                                    className="flex-1"
                                                    value={config.name}
                                                    onChange={(e) => {
                                                        const updatedConfigs = [...userConfig.customApiConfigs]
                                                        updatedConfigs[index].name = e.currentTarget.value;
                                                        updateCustomApiConfigs(updatedConfigs); // ヘルパー関数を使用
                                                    }}
                                                />
                                                <div className="w-[80px]">
                                                    <Input
                                                        className='w-full'
                                                        value={config.shortName}
                                                        placeholder="5char"
                                                        maxLength={5}
                                                        onChange={(e) => {
                                                            const updatedConfigs = [...userConfig.customApiConfigs]
                                                            updatedConfigs[index].shortName = e.currentTarget.value;
                                                            updateCustomApiConfigs(updatedConfigs); // ヘルパー関数を使用
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Avatar */}
                                        <div className={formRowClass}>
                                            <p className={labelClass}>{t('Avatar')}</p>
                                            <div className="flex flex-col gap-2">
                                                <AvatarSelect
                                                    value={config.avatar}
                                                    onChange={(value) => {
                                                        const updatedConfigs = [...userConfig.customApiConfigs]
                                                        updatedConfigs[index].avatar = value;
                                                        updateCustomApiConfigs(updatedConfigs); // ヘルパー関数を使用
                                                    }}
                                                />
                                            </div>
                                        </div>

                                        {/* Model Selection */}
                                        <div className={formRowClass}>
                                            <p className={labelClass}>{t('AI Model')}</p>
                                            {/* Changed grid to flex for horizontal layout, align items to end */}
                                            <div className="flex items-end gap-4">
                                                {/* Dropdown Section - Wrapped in flex-1 div */}
                                                <div className="flex-1">
                                                    <div>
                                                        <p className="text-sm opacity-70 mb-1">{t('Choose model')}</p>
                                                        <div className="relative">
                                                            {/* NestedDropdown コンポーネントを使用 */}
                                                            <NestedDropdown
                                                                options={createModelOptions()}
                                                                value={config.model}
                                                                onChange={(v) => {
                                                                    // カテゴリ行や無効な値が選択された場合は無視
                                                                    if (!v || v.startsWith('header-')) {
                                                                      return;
                                                                    }
                                                                    const updatedConfigs = [...userConfig.customApiConfigs]
                                                                    updatedConfigs[index].model = v;
                                                                    updateCustomApiConfigs(updatedConfigs); // ヘルパー関数を使用
                                                                }}
                                                                placeholder={t('Select a model')}
                                                                showModelId={true} // モデルIDを表示する設定
                                                            />
                                                        </div>
                                                    </div>
                                                </div> {/* End Dropdown Section Wrapper */}

                                                {/* Manual Input Section - Wrapped in flex-1 div */}
                                                <div className="flex-1">
                                                    {/* Removed mt-2 */}
                                                    <div> {/* Wrap label and input */}
                                                        <p className="text-sm opacity-70 mb-1">{t('Or enter model name manually')}</p>
                                                        <Input
                                                            className='w-full'
                                                            placeholder="Custom model name"
                                                            value={config.model}
                                                            onChange={(e) => {
                                                                const updatedConfigs = [...userConfig.customApiConfigs]
                                                                updatedConfigs[index].model = e.currentTarget.value;
                                                                updateCustomApiConfigs(updatedConfigs); // ヘルパー関数を使用
                                                            }}
                                                        />
                                                    </div> {/* End label and input wrapper */}
                                                </div> {/* End Manual Input Section Wrapper */}
                                            </div>
                                        </div>

                                        {/* System Message Mode (moved from advanced settings) */}
                                        <div className={formRowClass}>
                                            <p className={labelClass}>{t('System Message Mode')}</p>
                                            <div className={inputContainerClass}>
                                                <TripleStateToggle
                                                    value={config.systemPromptMode || SystemPromptMode.COMMON}
                                                    onChange={(v: SystemPromptMode) => {
                                                        const updatedConfigs = [...userConfig.customApiConfigs];
                                                        updatedConfigs[index].systemPromptMode = v;
                                                        updateCustomApiConfigs(updatedConfigs);
                                                    }}
                                                />
                                            </div>
                                        </div>

                                        {/* 詳細設定セクション（展開可能） */}
                                        <div className="border-t pt-3">
                                            <button
                                                className="flex items-center gap-2 w-full text-left text-sm font-medium opacity-80 hover:opacity-100"
                                                onClick={() => toggleSection(index)}
                                            >
                                                <svg
                                                    xmlns="http://www.w3.org/2000/svg"
                                                    width="16"
                                                    height="16"
                                                    fill="currentColor"
                                                    viewBox="0 0 16 16"
                                                    className={`transition-transform ${expandedSections[index] ? 'rotate-90' : ''}`}
                                                >
                                                    <path d="M4.646 1.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1 0 .708l-6 6a.5.5 0 0 1-.708-.708L10.293 8 4.646 2.354a.5.5 0 0 1 0-.708z" />
                                                </svg>
                                                {t('Advanced Settings')}
                                            </button>

                                            {expandedSections[index] && (
                                                <div className="mt-3 space-y-4">
                                                    {/* Provider Selection */}
                                                    <div className={formRowClass}>
                                                        <p className={labelClass}>{t('API Provider')}</p>
                                                        <div className="flex-1">
                                                            <Select
                                                                options={[
                                                                    { name: 'OpenAI Compatible', value: CustomApiProvider.OpenAI },
                                                                    { name: 'Anthropic Claude API', value: CustomApiProvider.Anthropic },
                                                                    { name: 'AWS Bedrock (Anthropic)', value: CustomApiProvider.Bedrock },
                                                                    { name: 'Google Gemini API', value: CustomApiProvider.Google },
                                                                    { name: 'Perplexity API', value: CustomApiProvider.Perplexity },
                                                                    { name: 'VertexAI (Claude)', value: CustomApiProvider.VertexAI_Claude }
                                                                ]}
                                                                value={config.provider || CustomApiProvider.OpenAI}
                                                                onChange={(v) => {
                                                                    console.log(`Provider changed for index ${index}: Selected value (v) = ${v}`); // Debug log
                                                                    const updatedConfigs = [...userConfig.customApiConfigs]
                                                                    updatedConfigs[index].provider = v as CustomApiProvider;
                                                                    console.log(`Provider changed for index ${index}: updatedConfigs[${index}].provider = ${updatedConfigs[index].provider}`); // Debug log remains
                                                                    updateCustomApiConfigs(updatedConfigs); // ヘルパー関数を使用
                                                                }}
                                                            />
                                                        </div>
                                                    </div>

                                                    {config.provider === CustomApiProvider.Anthropic && (
                                                        <div className={formRowClass}>
                                                            <p className={labelClass}>{t('Anthropic Auth Header')}</p>
                                                            <div className="flex-1">
                                                                <Select
                                                                    options={[
                                                                        { name: 'x-api-key (Default)', value: 'false' },
                                                                        { name: 'Authorization', value: 'true' }
                                                                    ]}
                                                                    value={config.isAnthropicUsingAuthorizationHeader ? 'true' : 'false'}
                                                                    onChange={(v) => {
                                                                        const updatedConfigs = [...userConfig.customApiConfigs]
                                                                        updatedConfigs[index].isAnthropicUsingAuthorizationHeader = v === 'true';
                                                                        updateCustomApiConfigs(updatedConfigs); // ヘルパー関数を使用
                                                                    }}
                                                                />
                                                            </div>
                                                        </div>
                                                    )}
                                                    {/* Removed redundant provider display and closing tag */}

                                                    {/* API Host */}
                                                    <div className={formRowClass}>
                                                        <p className={labelClass}>{t(config.isHostFullPath ? 'API Endpoint (Full Path)' : 'API Host')}</p>
                                                        <div className="flex items-center gap-2 flex-1"> {/* Changed from inputContainerClass */}
                                                            <Input
                                                                className='flex-1'
                                                                placeholder={
                                                                    config.provider === CustomApiProvider.Google ? t("Not applicable for Google Gemini") :
                                                                    config.isHostFullPath ? t("https://api.example.com/v1/chat/completions") :
                                                                    t("Leave blank for Common Host, or e.g., https://api.openai.com")
                                                                }
                                                                value={config.host}
                                                                onChange={(e) => {
                                                                    const updatedConfigs = [...userConfig.customApiConfigs]
                                                                    updatedConfigs[index].host = e.currentTarget.value;
                                                                    updateCustomApiConfigs(updatedConfigs);
                                                                }}
                                                                disabled={config.provider === CustomApiProvider.Google}
                                                            />
                                                            {config.provider === CustomApiProvider.VertexAI_Claude ? (
                                                                <span className="text-sm">{t('Full Path')}</span>
                                                            ) : (
                                                                <>
                                                                    <Switch
                                                                        checked={config.isHostFullPath ?? false}
                                                                        onChange={(checked) => {
                                                                            const updatedConfigs = [...userConfig.customApiConfigs];
                                                                            updatedConfigs[index].isHostFullPath = checked;
                                                                            updateCustomApiConfigs(updatedConfigs);
                                                                        }}
                                                                    />
                                                                    <span className="text-sm">{t('Full Path')}</span>
                                                                </>
                                                            )}
                                                            <div className="relative group">
                                                                <span className="cursor-help opacity-60">ⓘ</span>
                                                                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-72 hidden group-hover:block bg-gray-700 text-white text-xs p-2 rounded shadow-lg z-10">
                                                                    {t('If "Full Path" is ON, enter the complete API endpoint URL. Otherwise, enter only the base host. If host is blank, Common API Host settings will be used.')}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    {/* Blockquote removed as per user request */}

                                                    {/* API Key */}
                                                    <div className={formRowClass}>
                                                        <p className={labelClass}>API Key</p>
                                                        <div className={inputContainerClass}>
                                                            <Input
                                                                className='w-full'
                                                                placeholder="Leave blank to use common API Key"
                                                                value={config.apiKey}
                                                                onChange={(e) => {
                                                                    const updatedConfigs = [...userConfig.customApiConfigs]
                                                                    updatedConfigs[index].apiKey = e.currentTarget.value;
                                                                    updateCustomApiConfigs(updatedConfigs); // ヘルパー関数を使用
                                                                }}
                                                                type="password"
                                                            />
                                                        </div>
                                                    </div>

                                                    {(() => {
                                                        const isAnthropicProvider = config.provider === CustomApiProvider.Anthropic ||
                                                                                  config.provider === CustomApiProvider.Bedrock ||
                                                                                  config.provider === CustomApiProvider.Anthropic_CustomAuth;

                                                        return (
                                                            <>
                                                                {isAnthropicProvider && (
                                                                    <div className={formRowClass}>
                                                                        <p className={labelClass}>{t('Thinking Mode')}</p>
                                                                        <div className="flex items-center gap-3">
                                                                            <Switch
                                                                                checked={config.thinkingMode ?? false}
                                                                                onChange={(enabled) => {
                                                                                    const updatedConfigs = [...userConfig.customApiConfigs]
                                                                                    updatedConfigs[index].thinkingMode = enabled;
                                                                                    updateCustomApiConfigs(updatedConfigs);
                                                                                }}
                                                                            />
                                                                            <span className="text-sm font-medium">
                                                                                {config.thinkingMode ? t('Enabled') : t('hidden')}
                                                                            </span>
                                                                            <div className="relative group">
                                                                                <span className="cursor-help opacity-60">ⓘ</span>
                                                                                <div className="absolute bottom-full mb-2 hidden group-hover:block bg-gray-800 text-white text-xs p-2 rounded shadow-lg w-64">
                                                                                    {t('Currently only supported by Claude(Bedrock)')}
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                )}

                                                                {(isAnthropicProvider && config.thinkingMode) ? (
                                                                    <div className={formRowClass}>
                                                                        <p className={labelClass}>{t('Thinking Budget')}</p>
                                                                        <div className={inputContainerClass}>
                                                                            <Range
                                                                                value={config.thinkingBudget ?? 2000}
                                                                                onChange={(value) => {
                                                                                    const updatedConfigs = [...userConfig.customApiConfigs]
                                                                                    updatedConfigs[index].thinkingBudget = value;
                                                                                    updateCustomApiConfigs(updatedConfigs);
                                                                                }}
                                                                                min={2000}
                                                                                max={32000}
                                                                                step={1000}
                                                                            />
                                                                            <div className="text-sm text-right mt-1">{config.thinkingBudget} tokens</div>
                                                                        </div>
                                                                    </div>
                                                                ) : (
                                                                    // Show Temperature if not Anthropic provider OR if Anthropic provider and Thinking Mode is off
                                                                    <div className={formRowClass}>
                                                                        <p className={labelClass}>{t('Temperature')}</p>
                                                                        <div className={inputContainerClass}>
                                                                            <Range
                                                                                value={config.temperature}
                                                                                onChange={(value) => {
                                                                                    const updatedConfigs = [...userConfig.customApiConfigs]
                                                                                    updatedConfigs[index].temperature = value;
                                                                                    updateCustomApiConfigs(updatedConfigs);
                                                                                }}
                                                                                min={0}
                                                                                max={2}
                                                                                step={0.1}
                                                                            />
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </>
                                                        );
                                                    })()}

                                                    {/* System Message Text Field */}
                                                    <div className={formRowClass}>
                                                        <p className={labelClass}>{t('System Message Text')}</p>
                                                        <div className={inputContainerClass}>
                                                            <Textarea
                                                                className={`w-full ${config.systemPromptMode === SystemPromptMode.COMMON ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                                maxRows={5}
                                                                value={config.systemMessage}
                                                                onChange={(e) => {
                                                                    if (config.systemPromptMode !== SystemPromptMode.COMMON) {
                                                                        const updatedConfigs = [...userConfig.customApiConfigs]
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
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div> {/* Close space-y-4 div (line 363) */}
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="flex justify-end mt-4">
                        <Button
                            size="small"
                            text={t('Add New Model')}
                            icon={<BiPlus />}
                            onClick={addNewCustomModel}
                            color="primary"
                        />
                    </div>
                </div>
            </div>
        </div>

        {/* Reset to Default Confirmation Dialog */}
        <Dialog
            title={t('Confirm Reset')}
            open={showResetDialog}
            onClose={() => setShowResetDialog(false)}
        >
            <div className="space-y-4">
                <p>{t('Are you sure you want to reset the Common System Message to the default value? This action cannot be undone.')}</p>
                <div className="flex justify-end gap-2">
                    <Button
                        text={t('Cancel')}
                        color="flat"
                        onClick={() => setShowResetDialog(false)}
                    />
                    <Button
                        text={t('Reset to Default')}
                        color="primary"
                        onClick={resetToDefaultSystemMessage}
                    />
                </div>
            </div>
        </Dialog>
        </>
    );
};

export default CustomAPISettings;
