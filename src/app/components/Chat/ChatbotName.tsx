import { FC, memo, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import dropdownIcon from '~/assets/icons/dropdown.svg'
import { getApiSchemeOptions } from '~app/components/Settings/api-scheme-options'
import { CustomApiProvider, ProviderConfig } from '~services/user-config'
import SwitchBotDropdown from '../SwitchBotDropdown'
import Tooltip from '../Tooltip'

interface Props {
  index: number
  name: string
  model: string | undefined
  fullName?: string
  onSwitchBot?: (index: number) => void
  botConfig?: any
  providerConfigs?: ProviderConfig[]
}

const ChatbotName: FC<Props> = (props) => {
  const { t } = useTranslation()

  const schemeLookup = useMemo(() => {
    const map = new Map<CustomApiProvider, string>()
    getApiSchemeOptions().forEach((opt) => {
      map.set(opt.value, opt.name)
    })
    return map
  }, [])

  const resolveProviderDisplay = () => {
    const config = props.botConfig
    if (!config) {
      return null
    }

    const providerRef = config.providerRefId
      ? (props.providerConfigs || []).find((provider) => provider.id === config.providerRefId)
      : undefined

    if (config.providerRefId && !providerRef) {
      return {
        error: t('Provider reference missing (id: {{id}})', { id: config.providerRefId }),
      }
    }

    const effectiveProvider = providerRef?.provider
      ?? (config.provider || (config.model?.includes('anthropic.claude') ? CustomApiProvider.Bedrock : CustomApiProvider.OpenAI))

    const apiFormat = schemeLookup.get(effectiveProvider) || effectiveProvider
    const providerName = providerRef?.name || t('Individual Settings')

    return {
      providerName,
      apiFormat,
    }
  }

  // 詳細情報を含むツールチップコンテンツを文字列で作成
  const createDetailedTooltip = () => {
    if (!props.botConfig) {
      return props.fullName || props.name
    }

    const config = props.botConfig
    const resolvedProviderDisplay = resolveProviderDisplay()
    const details = []
    
    // ヘッダー
    details.push(`━━━ ${props.fullName || props.name} ━━━`)
    
    // 基本情報
    if (config.model) details.push(`🤖 Model: ${config.model}`)
    if (config.host) details.push(`🌐 Host: ${config.host}`)
    if (resolvedProviderDisplay?.providerName) details.push(`⚡ Provider: ${resolvedProviderDisplay.providerName}`)
    if (resolvedProviderDisplay?.apiFormat) details.push(`🧩 API Scheme: ${resolvedProviderDisplay.apiFormat}`)
    if (resolvedProviderDisplay?.error) details.push(`⚠ Provider: ${resolvedProviderDisplay.error}`)
    
    details.push('') // 空行
    
    // 設定情報
    details.push('⚙️  Configuration:')
    
    if (config.temperature !== undefined) {
      details.push(`   🌡️ Temperature: ${config.temperature}`)
    }
    
    if (config.thinkingMode !== undefined) {
      details.push(`   🤔 Thinking Mode: ${config.thinkingMode ? 'Enabled' : 'Disabled'}`)
    }
    
    if (config.thinkingBudget !== undefined && config.thinkingMode) {
      details.push(`   📈 Thinking Budget: ${config.thinkingBudget}`)
    }
    else if (config.reasoningEffort && config.reasoningMode) {
      details.push(`   📈 Reasoning Effort: ${config.reasoningEffort}`)
    }
    
    
    
    return details.join('\n')
  }

  const tooltipContent = createDetailedTooltip()

  const node = (
    <Tooltip content={tooltipContent}>
      <span className="font-semibold text-primary-text text-sm cursor-pointer truncate flex-shrink-[1] min-w-0">{props.name}</span>
    </Tooltip>
  )

  const modelNode = props.model ? (
    <Tooltip content={tooltipContent}>
      <div className="bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 text-xs rounded-full px-2 py-1 flex-shrink-[3] min-w-[60px]">
        <div className="truncate">
        {props.model}
      </div>
      </div>
    </Tooltip>
  ) : null;

  if (!props.onSwitchBot) {
    return (
      <div className="flex items-center min-w-0 flex-1">
        {node}
        <div className="flex-shrink-[5] min-w-0 w-2"></div>
        {modelNode}
        <div className="flex-shrink-[5] min-w-0 w-2"></div>
      </div>
    )
  }
  const triggerNode = (
    <div className="flex flex-row items-center min-w-0 w-full">
      {node}
      <div className="flex-shrink-[5] min-w-0 w-2"></div>
      {modelNode}
      <div className="flex-shrink-[5] min-w-0 w-2"></div>
      <img src={dropdownIcon} className="w-5 h-5 flex-shrink-0" />
    </div>
  )
  return <SwitchBotDropdown
    selectedIndex={props.index}
    onChange={(index) => props.onSwitchBot?.(index)}
    triggerNode={triggerNode}
  />
}

export default memo(ChatbotName)
