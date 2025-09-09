import { useTranslation } from 'react-i18next'
import { FC } from 'react'
import { CustomApiProvider, CustomApiConfig } from '~services/user-config'
import { Input, Textarea } from '../Input'
import Blockquote from './Blockquote'
import { ChevronRight } from 'lucide-react'

interface Props {
    config: CustomApiConfig
    index: number
    expandedSections: Record<number, boolean>
    toggleSection: (index: number) => void
    updateConfig: (updatedConfig: CustomApiConfig) => void
}

const DeveloperOptionsPanel: FC<Props> = ({ 
    config, 
    index, 
    expandedSections, 
    toggleSection, 
    updateConfig 
}) => {
    const { t } = useTranslation()
    const formRowClass = "flex flex-col gap-2"
    const labelClass = "font-medium text-sm"
    const inputContainerClass = "flex-1"

    const sectionKey = index + 3000

    return (
        <div className="border-t pt-3 mt-4">
            <button
                className="flex items-center gap-2 w-full text-left text-sm font-medium text-gray-500 dark:text-gray-400 hover:opacity-100"
                onClick={() => toggleSection(sectionKey)}
            >
                <ChevronRight 
                    className={`w-4 h-4 transition-transform ${expandedSections[sectionKey] ? 'rotate-90' : ''}`}
                />
                {t('Developer Options (Dangerous)')}
            </button>
            {expandedSections[sectionKey] && (
                <div className="mt-3 space-y-4 pl-5">
                    {/* OpenAI Compatible Options */}
                    {(config.provider === CustomApiProvider.OpenAI ||
                      config.provider === CustomApiProvider.QwenOpenAI ||
                      config.provider === CustomApiProvider.GeminiOpenAI) && (
                        <div className={formRowClass}>
                            <p className={labelClass}>{t('Allow Only Specific Providers (OpenRouter)')}</p>
                            <div className={inputContainerClass}>
                                <Input
                                    className='w-full'
                                    placeholder="openai,anthropic,google"
                                    value={config.advancedConfig?.openrouterProviderOnly || ''}
                                    onChange={(e) => {
                                        const updatedConfig = {
                                            ...config,
                                            advancedConfig: {
                                                ...config.advancedConfig,
                                                openrouterProviderOnly: e.currentTarget.value,
                                            }
                                        };
                                        updateConfig(updatedConfig);
                                    }}
                                />
                                <Blockquote>{t('Comma-separated list of providers to allow. See OpenRouter docs.')}</Blockquote>
                            </div>
                        </div>
                    )}

                    {/* Anthropic Specific Options */}
                    {(config.provider === CustomApiProvider.Anthropic || 
                      config.provider === CustomApiProvider.VertexAI_Claude) && (
                        <div className={formRowClass}>
                            <p className={labelClass}>{t('Anthropic Beta Headers')}</p>
                            <div className={inputContainerClass}>
                                <Textarea
                                    className='w-full font-mono text-sm'
                                    placeholder="context-1m-2025-08-07,context-1m-2025-08-07"
                                    value={config.advancedConfig?.anthropicBetaHeaders || ''}
                                    onChange={(e) => {
                                        const updatedConfig = {
                                            ...config,
                                            advancedConfig: {
                                                ...config.advancedConfig,
                                                anthropicBetaHeaders: e.currentTarget.value,
                                            }
                                        };
                                        updateConfig(updatedConfig);
                                    }}
                                />
                                <Blockquote>{t('Comma-separated beta feature names (e.g., context-1m-2025-08-07,context-1m-2025-08-07)')}</Blockquote>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}

export default DeveloperOptionsPanel