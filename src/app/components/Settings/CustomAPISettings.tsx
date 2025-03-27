import { FC, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CustomAPIModel, UserConfig, CustomApiProvider } from '~services/user-config'
import { Input, Textarea } from '../Input'
import { DEFAULT_CHATGPT_SYSTEM_MESSAGE } from '~app/consts';
import Select from '../Select'
import Blockquote from './Blockquote'
import Range from '../Range'
import Switch from '~app/components/Switch'
import AvatarSelect from './AvatarSelect'
import BotIcon from '../BotIcon'


interface Props {
    userConfig: UserConfig
    updateConfigValue: (update: Partial<UserConfig>) => void
}

const CustomAPISettings: FC<Props> = ({ userConfig, updateConfigValue }) => {
    const { t } = useTranslation()
    const [expandedSections, setExpandedSections] = useState<Record<number, boolean>>({});

    const formRowClass = "grid grid-cols-[1fr_3fr] items-center gap-4"
    // const formRowClass = "grid grid-cols-[200px_1fr] items-center gap-4"
    const labelClass = "font-medium text-sm text-right"
    const inputContainerClass = "flex-1"

    // セクションの展開/折りたたみを切り替える関数
    const toggleSection = (index: number) => {
        setExpandedSections(prev => ({
            ...prev,
            [index]: !prev[index]
        }));
    };

    return (
        <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-3">
                {/* Common API Settings */}
                <div className="space-y-3 max-w-[800px]">
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
                        <p className={labelClass}>{t('Common API Host')}</p>
                        <div className={inputContainerClass}>
                            <Input
                                className='w-full'
                                placeholder="https://api.openai.com"
                                value={userConfig.customApiHost}
                                onChange={(e) => updateConfigValue({ customApiHost: e.currentTarget.value })}
                            />
                        </div>

                    </div>
                    <Blockquote className="mt-1 ml-[25%]">{t('Host works both with /v1 or without /v1')}</Blockquote>


                </div>

                {/* Custom Chatbots */}
                <div className="w-full">
                <div className="flex flex-wrap gap-2">
                    {userConfig.customApiConfigs.map((config, index) => (
                        <div key={index} className="min-w-[600px] flex-1 max-w-[800px] p-3 border border-gray-600 rounded-lg hover:shadow-lg transition-shadow space-y-4">
                            <div className="flex justify-between items-center mb-4">
                                <p className="font-semibold text-base">{t(`Custom Chatbot No. ${index + 1}`)}</p>
                                <div className="flex gap-2">
                                    <button 
                                        className={`p-1 rounded ${index === 0 ? 'text-gray-400 cursor-not-allowed' : 'hover:bg-gray-700'}`}
                                        onClick={() => {
                                            if (index > 0) {
                                                const updatedConfigs = [...userConfig.customApiConfigs];
                                                // 設定を入れ替え
                                                [updatedConfigs[index - 1], updatedConfigs[index]] = [updatedConfigs[index], updatedConfigs[index - 1]];
                                                // idプロパティも更新
                                                if (updatedConfigs[index - 1].id !== undefined && updatedConfigs[index].id !== undefined) {
                                                    [updatedConfigs[index - 1].id, updatedConfigs[index].id] = [updatedConfigs[index].id, updatedConfigs[index - 1].id];
                                                } else {
                                                    // idがない場合は新しく割り当て
                                                    updatedConfigs.forEach((config, i) => {
                                                        config.id = i + 1;
                                                    });
                                                }
                                                updateConfigValue({ customApiConfigs: updatedConfigs });
                                            }
                                        }}
                                        disabled={index === 0}
                                        title={t('Move up')}
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                                            <path fillRule="evenodd" d="M8 15a.5.5 0 0 0 .5-.5V2.707l3.146 3.147a.5.5 0 0 0 .708-.708l-4-4a.5.5 0 0 0-.708 0l-4 4a.5.5 0 1 0 .708.708L7.5 2.707V14.5a.5.5 0 0 0 .5.5z"/>
                                        </svg>
                                    </button>
                                    <button 
                                        className={`p-1 rounded ${index === userConfig.customApiConfigs.length - 1 ? 'text-gray-400 cursor-not-allowed' : 'hover:bg-gray-700'}`}
                                        onClick={() => {
                                            if (index < userConfig.customApiConfigs.length - 1) {
                                                const updatedConfigs = [...userConfig.customApiConfigs];
                                                // 設定を入れ替え
                                                [updatedConfigs[index], updatedConfigs[index + 1]] = [updatedConfigs[index + 1], updatedConfigs[index]];
                                                // idプロパティも更新
                                                if (updatedConfigs[index].id !== undefined && updatedConfigs[index + 1].id !== undefined) {
                                                    [updatedConfigs[index].id, updatedConfigs[index + 1].id] = [updatedConfigs[index + 1].id, updatedConfigs[index].id];
                                                } else {
                                                    // idがない場合は新しく割り当て
                                                    updatedConfigs.forEach((config, i) => {
                                                        config.id = i + 1;
                                                    });
                                                }
                                                updateConfigValue({ customApiConfigs: updatedConfigs });
                                            }
                                        }}
                                        disabled={index === userConfig.customApiConfigs.length - 1}
                                        title={t('Move down')}
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                                            <path fillRule="evenodd" d="M8 1a.5.5 0 0 1 .5.5v11.793l3.146-3.147a.5.5 0 0 1 .708.708l-4 4a.5.5 0 0 1-.708 0l-4-4a.5.5 0 0 1 .708-.708L7.5 13.293V1.5A.5.5 0 0 1 8 1z"/>
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
                                                    updatedConfigs[index].name = e.currentTarget.value
                                                    updateConfigValue({ customApiConfigs: updatedConfigs })
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
                                                        updatedConfigs[index].shortName = e.currentTarget.value
                                                        updateConfigValue({ customApiConfigs: updatedConfigs })
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
                                                    updatedConfigs[index].avatar = value
                                                    updateConfigValue({ customApiConfigs: updatedConfigs })
                                                }}
                                            />
                                        </div>
                                    </div>

                                    {/* Model Selection */}
                                    <div className={formRowClass}>
                                        <p className={labelClass}>{t('AI Model')}</p>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <p className="text-sm text-gray-300 mb-1">{t('Choose a model')}</p>
                                                <Select
                                                options={Object.entries(CustomAPIModel).map(([k, v]) => ({ name: k, value: v }))}
                                                value={Object.values(CustomAPIModel).includes(config.model as CustomAPIModel) ? config.model : 'custom'}
                                                onChange={(v) => {
                                                    const updatedConfigs = [...userConfig.customApiConfigs]
                                                    updatedConfigs[index].model = v
                                                    // モデル名に基づいてプロバイダーを自動設定
                                                    if (v.includes('anthropic.claude') || v.includes('us.anthropic.claude')) {
                                                        updatedConfigs[index].provider = CustomApiProvider.Bedrock
                                                    } else if (v.includes('claude-')) {
                                                        updatedConfigs[index].provider = CustomApiProvider.Anthropic
                                                    } else {
                                                        updatedConfigs[index].provider = CustomApiProvider.OpenAI
                                                    }
                                                    updateConfigValue({ customApiConfigs: updatedConfigs })
                                                    }}
                                                />
                                            </div>
                                            <div>
                                                <p className="text-sm text-gray-300 mb-1">{t('Or enter model name manually')}</p>
                                                <Input
                                                    className='w-full'
                                                    placeholder="Custom model name (optional)"
                                                    value={config.model}
                                                    onChange={(e) => {
                                                        const updatedConfigs = [...userConfig.customApiConfigs]
                                                        updatedConfigs[index].model = e.currentTarget.value
                                                        updateConfigValue({ customApiConfigs: updatedConfigs })
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* 詳細設定セクション（展開可能） */}
                                <div className="border-t pt-3">
                                    <button
                                        className="flex items-center gap-2 w-full text-left text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100"
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
                                                            { name: 'AWS Bedrock', value: CustomApiProvider.Bedrock }
                                                        ]}
                                                        value={config.provider || CustomApiProvider.OpenAI}
                                                        onChange={(v) => {
                                                            const updatedConfigs = [...userConfig.customApiConfigs]
                                                            updatedConfigs[index].provider = v as CustomApiProvider
                                                            updateConfigValue({ customApiConfigs: updatedConfigs })
                                                        }}
                                                    />
                                                </div>
                                            </div>

                                            {/* API Host */}
                                            <div className={formRowClass}>
                                                <p className={labelClass}>API Host</p>
                                                <div className={inputContainerClass}>
                                                    <Input
                                                        className='w-full'
                                                        placeholder="Leave blank to use API Host (Common)"
                                                        value={config.host}
                                                        onChange={(e) => {
                                                            const updatedConfigs = [...userConfig.customApiConfigs]
                                                            updatedConfigs[index].host = e.currentTarget.value
                                                            updateConfigValue({ customApiConfigs: updatedConfigs })
                                                        }}
                                                    />
                                                </div>
                                            </div>

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
                                                            updatedConfigs[index].apiKey = e.currentTarget.value
                                                            updateConfigValue({ customApiConfigs: updatedConfigs })
                                                        }}
                                                        type="password"
                                                    />
                                                </div>
                                            </div>

                                            {/* Thinking Mode Toggle */}
                                            <div className={formRowClass}>
                                                <p className={labelClass}>{t('Thinking Mode')}</p>
                                                <div className="flex items-center gap-3">
                                                    <Switch
                                                        checked={config.thinkingMode ?? false}
                                                        onChange={(enabled) => {
                                                            const updatedConfigs = [...userConfig.customApiConfigs]
                                                            updatedConfigs[index].thinkingMode = enabled
                                                            updateConfigValue({ customApiConfigs: updatedConfigs })
                                                        }}
                                                    />
                                                    <span className="text-sm font-medium">
                                                        {config.thinkingMode ? t('Enabled') : t('Disabled')}
                                                    </span>
                                                    <div className="relative group">
                                                        <span className="cursor-help text-gray-400">ⓘ</span>
                                                        <div className="absolute bottom-full mb-2 hidden group-hover:block bg-gray-800 text-white text-xs p-2 rounded shadow-lg w-64">
                                                            {t('Currently only supported by Claude(Bedrock)')}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Conditional rendering based on Thinking Mode */}
                                            {config.thinkingMode ? (
                                                <div className={formRowClass}>
                                                    <p className={labelClass}>{t('Thinking Budget')}</p>
                                                    <div className={inputContainerClass}>
                                                        <Range
                                                            value={config.thinkingBudget ?? 2000}
                                                            onChange={(value) => {
                                                                const updatedConfigs = [...userConfig.customApiConfigs]
                                                                updatedConfigs[index].thinkingBudget = value
                                                                updateConfigValue({ customApiConfigs: updatedConfigs })
                                                            }}
                                                            min={2000}
                                                            max={32000}
                                                            step={1000}
                                                        />
                                                        <div className="text-sm text-right mt-1">{config.thinkingBudget} tokens</div>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className={formRowClass}>
                                                    <p className={labelClass}>{t('Temperature')}</p>
                                                    <div className={inputContainerClass}>
                                                        <Range
                                                            value={config.temperature}
                                                            onChange={(value) => {
                                                                const updatedConfigs = [...userConfig.customApiConfigs]
                                                                updatedConfigs[index].temperature = value
                                                                updateConfigValue({ customApiConfigs: updatedConfigs })
                                                            }}
                                                            min={0}
                                                            max={2}
                                                            step={0.1}
                                                        />
                                                    </div>
                                                </div>
                                            )}

                                            {/* System Message */}
                                            <div className={formRowClass}>
                                                <p className={labelClass}>{t('System Message')}</p>
                                                <div className={inputContainerClass}>
                                                    <Textarea
                                                        className='w-full'
                                                        maxRows={5}
                                                        value={config.systemMessage || DEFAULT_CHATGPT_SYSTEM_MESSAGE}
                                                        onChange={(e) => {
                                                            const updatedConfigs = [...userConfig.customApiConfigs]
                                                            updatedConfigs[index].systemMessage = e.currentTarget.value
                                                            updateConfigValue({ customApiConfigs: updatedConfigs })
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
                </div>
            </div>
        </div>
    )
}

export default CustomAPISettings
