import { FC } from 'react'
import { useTranslation } from 'react-i18next'
import { BotId } from '~app/bots'
import { ClaudeAPIModel, UserConfig } from '~services/user-config'
import { Input, Textarea } from '../Input'
import Select from '../Select'
import Blockquote from './Blockquote'
import Range from '../Range'
import Switch from '../Switch'
import { DEFAULT_CLAUDE_SYSTEM_MESSAGE } from '~app/consts'

interface Props {
  userConfig: UserConfig
  updateConfigValue: (update: Partial<UserConfig>) => void
}

const ClaudeAPISettings: FC<Props> = ({ userConfig, updateConfigValue }) => {
  const { t } = useTranslation()
  const isEnabled = (botId: BotId) => userConfig.enabledBots?.includes(botId) ?? false
  const enableBot = (botId: BotId) => {
    updateConfigValue({
      enabledBots: [...(userConfig.enabledBots || []), botId]
    })
  }

  const standardEnabled = isEnabled('claude')
  const thinkingEnabled = isEnabled('claude-think')
  return (
    <div className="flex flex-col gap-2 max-w-[800px]">
      <div className={`flex flex-col gap-1 ${!standardEnabled && !thinkingEnabled ? 'opacity-50' : ''}`}>
        <div className="flex items-center justify-between">
          <p className="font-medium text-sm">API Key</p>
          {!standardEnabled && !thinkingEnabled && (
            <button
              className="px-3 py-1 text-sm bg-blue-500 hover:bg-blue-600 text-white rounded"
              onClick={() => enableBot('claude' as BotId)}
            >
              {t('Enable Claude Bot')}
            </button>
          )}
        </div>
        <Input
          placeholder="sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
          value={userConfig.claudeApiKey}
          onChange={(e) => updateConfigValue({ claudeApiKey: e.currentTarget.value })}
          type="password"
        />
        <Blockquote className="mt-1">{t('Your keys are stored locally')}</Blockquote>
      </div>
      <div className={`flex flex-col gap-1 ${!standardEnabled && !thinkingEnabled ? 'opacity-50' : ''}`}>
        <div className="flex items-center justify-between">
          <p className="font-medium text-sm">{t('API Model')}</p>
          {!standardEnabled && !thinkingEnabled && (
            <button
              className="px-3 py-1 text-sm bg-blue-500 hover:bg-blue-600 text-white rounded"
              onClick={() => enableBot('claude' as BotId)}
            >
              {t('Enable Claude Bot')}
            </button>
          )}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-300 mb-1">{t('Choose a model')}</p>
            <Select
              options={Object.entries(ClaudeAPIModel).map(([k, v]) => ({ name: k, value: v }))}
              value={Object.values(ClaudeAPIModel).includes(userConfig.claudeApiModel as ClaudeAPIModel) ? userConfig.claudeApiModel : 'custom'}
              onChange={(v) => updateConfigValue({ claudeApiModel: v })}
            />
          </div>
          <div>
            <p className="text-sm text-gray-300 mb-1">{t('Or enter model name manually')}</p>
            <Input
              className='w-full'
              placeholder="Custom model name (optional)"
              value={userConfig.claudeApiModel}
              onChange={(e) => updateConfigValue({ claudeApiModel: e.currentTarget.value })}
            />
          </div>
        </div>
      </div>

      {/* Temperature setting */}
      <div className={`flex flex-col gap-1 ${!standardEnabled ? 'opacity-50' : ''}`}>
        <div className="flex items-center justify-between">
          <p className="font-medium text-sm">{t('Temperature')}</p>
          {!standardEnabled && (
            <button
              className="px-3 py-1 text-sm bg-blue-500 hover:bg-blue-600 text-white rounded"
              onClick={() => enableBot('claude' as BotId)}
            >
              {t('Enable Claude Bot')}
            </button>
          )}
        </div>
        <Range
          value={userConfig.claudeApiTemperature}
          onChange={(value) => updateConfigValue({ claudeApiTemperature: value })}
          min={0}
          max={2}
          step={0.1}
          className="mt-1"
        />
        <Blockquote className="mt-1">
          {t('For Claude (API) bot: Higher values make the output more random, while lower values make it more focused and deterministic')}
        </Blockquote>
      </div>

      {/* Thinking Budget setting */}
      <div className={`flex flex-col gap-1 ${!thinkingEnabled ? 'opacity-50' : ''}`}>
        <div className="flex items-center justify-between">
          <p className="font-medium text-sm">{t('Thinking Budget')}</p>
          {!thinkingEnabled && (
            <button
              className="px-3 py-1 text-sm bg-blue-500 hover:bg-blue-600 text-white rounded"
              onClick={() => enableBot('claude-think' as BotId)}
            >
              {t('Enable Claude Thinking Bot')}
            </button>
          )}
        </div>
        <div>
          <Range
            value={userConfig.claudeThinkingBudget ?? 2000}
            onChange={(value) => updateConfigValue({ claudeThinkingBudget: value })}
            min={2000}
            max={32000}
            step={1000}
          />
          <div className="text-sm text-gray-500 mt-1">
            {userConfig.claudeThinkingBudget ?? 2000} tokens
          </div>
        </div>
        <Blockquote className="mt-1">
          {t('For Claude (Thinking) bot: Token budget for extended thinking process')}
        </Blockquote>
      </div>

      <div className="flex flex-col gap-1">
        <p className="font-medium text-sm">System Message</p>
        <Textarea
          maxRows={3}
          value={userConfig.claudeApiSystemMessage || DEFAULT_CLAUDE_SYSTEM_MESSAGE}
          onChange={(e) => updateConfigValue({ claudeApiSystemMessage: e.currentTarget.value })}
        />
      </div>
    </div>
  )
}

export default ClaudeAPISettings
