import { FC } from 'react'
import { useTranslation } from 'react-i18next'
import { BotId } from '~app/bots'
import { UserConfig } from '~services/user-config'
import { Input } from '../Input'
import Select from '../Select'
import Blockquote from './Blockquote'

// Perplexityのモデルを定義
export enum PerplexityAPIModel {
  'sonar-reasoning-pro' = 'sonar-reasoning-pro',
  'sonar-reasoning' = 'sonar-reasoning',
  'sonar-pro' = 'sonar-pro',
  'sonar' = 'sonar',
  'llama-3.1-sonar-huge-128k-online' = 'llama-3.1-sonar-huge-128k-online',
  'llama-3.1-sonar-large-128k-online' = 'llama-3.1-sonar-large-128k-online',
  'llama-3.1-sonar-large-128k-chat' = 'llama-3.1-sonar-large-128k-chat',
}

interface Props {
  userConfig: UserConfig
  updateConfigValue: (update: Partial<UserConfig>) => void
}

const PerplexityAPISettings: FC<Props> = ({ userConfig, updateConfigValue }) => {
  const { t } = useTranslation()
  const isEnabled = (botId: BotId) => userConfig.enabledBots?.includes(botId) ?? false
  const enableBot = (botId: BotId) => {
    updateConfigValue({
      enabledBots: [...(userConfig.enabledBots || []), botId]
    })
  }

  const standardEnabled = isEnabled('perplexity')
  const reasoningEnabled = isEnabled('perplexity-reasoning')
  return (
    <div className="flex flex-col gap-2">
      <div className={`flex flex-col gap-1 ${!standardEnabled && !reasoningEnabled ? 'opacity-50' : ''}`}>
        <div className="flex items-center justify-between">
          <p className="font-medium text-sm">
            API Key (
            <a
              href="https://docs.perplexity.ai/docs/getting-started"
              target="_blank"
              rel="noreferrer"
              className="underline"
            >
              how to create key
            </a>
            )
          </p>
          {!standardEnabled && !reasoningEnabled && (
            <button
              className="px-3 py-1 text-sm bg-blue-500 hover:bg-blue-600 text-white rounded"
              onClick={() => enableBot('perplexity' as BotId)}
            >
              {t('Enable Perplexity Bot')}
            </button>
          )}
        </div>
        <Input
          className="w-[300px]"
          placeholder="pplx-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
          value={userConfig.perplexityApiKey}
          onChange={(e) => updateConfigValue({ perplexityApiKey: e.currentTarget.value })}
          type="password"
        />
        <Blockquote className="mt-1">{t('Your keys are stored locally')}</Blockquote>
      </div>
      {/* Standard Model Selection */}
      <div className={`flex flex-col gap-1 ${!standardEnabled ? 'opacity-50' : ''}`}>
        <div className="flex items-center justify-between">
          <p className="font-medium text-sm">{t('Standard Model')}</p>
          {!standardEnabled && (
            <button
              className="px-3 py-1 text-sm bg-blue-500 hover:bg-blue-600 text-white rounded"
              onClick={() => enableBot('perplexity' as BotId)}
            >
              {t('Enable Perplexity Bot')}
            </button>
          )}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-300 mb-1">{t('Choose a model')}</p>
            <Select
              options={Object.entries(PerplexityAPIModel).map(([k, v]) => ({ name: k, value: v }))}
              value={Object.values(PerplexityAPIModel).includes(userConfig.perplexityModel as PerplexityAPIModel) ? userConfig.perplexityModel : 'custom'}
              onChange={(v) => updateConfigValue({ perplexityModel: v })}
            />
          </div>
          <div>
            <p className="text-sm text-gray-300 mb-1">{t('Or enter model name manually')}</p>
            <Input
              className='w-full'
              placeholder="Custom model name (optional)"
              value={userConfig.perplexityModel}
              onChange={(e) => updateConfigValue({ perplexityModel: e.currentTarget.value })}
            />
          </div>
        </div>
        <Blockquote className="mt-1">
          {t('For Perplexity bot: Standard model for normal chat')}
        </Blockquote>
      </div>

      {/* Reasoning Model Selection */}
      <div className={`flex flex-col gap-1 ${!reasoningEnabled ? 'opacity-50' : ''}`}>
        <div className="flex items-center justify-between">
          <p className="font-medium text-sm">{t('Reasoning Model')}</p>
          {!reasoningEnabled && (
            <button
              className="px-3 py-1 text-sm bg-blue-500 hover:bg-blue-600 text-white rounded"
              onClick={() => enableBot('perplexity-reasoning' as BotId)}
            >
              {t('Enable Perplexity Reasoning Bot')}
            </button>
          )}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-300 mb-1">{t('Choose a model')}</p>
            <Select
              options={Object.entries(PerplexityAPIModel).map(([k, v]) => ({ name: k, value: v }))}
              value={Object.values(PerplexityAPIModel).includes(userConfig.perplexityReasoningModel as PerplexityAPIModel) ? userConfig.perplexityReasoningModel : 'custom'}
              onChange={(v) => updateConfigValue({ perplexityReasoningModel: v })}
            />
          </div>
          <div>
            <p className="text-sm text-gray-300 mb-1">{t('Or enter model name manually')}</p>
            <Input
              className='w-full'
              placeholder="Custom model name (optional)"
              value={userConfig.perplexityReasoningModel}
              onChange={(e) => updateConfigValue({ perplexityReasoningModel: e.currentTarget.value })}
            />
          </div>
        </div>
        <Blockquote className="mt-1">
          {t('For Perplexity Reasoning bot: Enhanced model for step-by-step reasoning')}
        </Blockquote>
      </div>
    </div>
  )
}

export default PerplexityAPISettings
