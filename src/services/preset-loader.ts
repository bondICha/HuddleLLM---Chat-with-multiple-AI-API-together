import presetConfig from '../../config/api-presets.json'
import { MODEL_LIST, SystemPromptMode, CustomApiProvider } from './user-config'
import { getCompanyProfileConfigs, getCompanyProfileState, CompanyProfileStatus } from './company-profile'

export interface PresetConfig {
  version: string
  description: string
  settings: {
    enableCompanyPresets: boolean
    showPerplexityTemplate: boolean
  }
  presets: Record<string, any>
  companyPresets: Record<string, any>
}

/**
 * プリセット設定を取得
 */
export function getPresetConfig(): PresetConfig {
  return presetConfig as PresetConfig
}

/**
 * アクティブな（インポート済み）Company Profileを取得
 */
export async function getActiveCompanyProfile() {
  try {
    const companyConfigs = await getCompanyProfileConfigs()
    
    for (const config of companyConfigs) {
      // Company Profileの状態をチェック（設定から確認するだけ）
      const state = await getCompanyProfileState(config.companyName)
      if (state && state.status === CompanyProfileStatus.IMPORTED) {
        return config
      }
    }
    
    return null
  } catch (error) {
    console.warn('Failed to get active company profile:', error)
    return null
  }
}

/**
 * 有効なプリセットを取得（Company Profile情報も含む）
 */
export async function getActivePresets() {
  const config = getPresetConfig()
  const basePresets = config.presets
  
  let activePresets = { ...basePresets }
  
  // アクティブなCompany Profile設定からプリセットを生成
  try {
    const activeCompanyProfile = await getActiveCompanyProfile()
    if (activeCompanyProfile && activeCompanyProfile.templateData && activeCompanyProfile.templateData.customApiConfigs) {
      activeCompanyProfile.templateData.customApiConfigs.forEach((apiConfig: any) => {
        const presetName = `${activeCompanyProfile.companyName} - ${apiConfig.name}`
        activePresets[presetName] = {
          name: presetName,
          shortName: apiConfig.shortName || apiConfig.name.substring(0, 4),
          model: apiConfig.model || 'gpt-4',
          host: apiConfig.host || '',
          temperature: apiConfig.temperature || 1,
          systemMessage: apiConfig.systemMessage || '',
          systemPromptMode: apiConfig.systemPromptMode || 'common',
          avatar: apiConfig.avatar || 'default',
          thinkingMode: apiConfig.thinkingMode || false,
          thinkingBudget: apiConfig.thinkingBudget || 2000,
          provider: apiConfig.provider || 'openai'
        }
      })
    } else if (config.settings.enableCompanyPresets) {
      // Fallback: JSONファイルのcompanyPresetsを使用
      activePresets = { ...activePresets, ...config.companyPresets }
    }
  } catch (error) {
    console.warn('Failed to load active company profile:', error)
    if (config.settings.enableCompanyPresets) {
      activePresets = { ...activePresets, ...config.companyPresets }
    }
  }
  
  // プリセット値を実際のenum値とMODEL_LISTに変換
  Object.keys(activePresets).forEach(key => {
    const preset = activePresets[key]
    
    // systemPromptModeを変換
    switch (preset.systemPromptMode) {
      case 'common':
        preset.systemPromptMode = SystemPromptMode.COMMON
        break
      case 'append':
        preset.systemPromptMode = SystemPromptMode.APPEND
        break
      case 'override':
        preset.systemPromptMode = SystemPromptMode.OVERRIDE
        break
      default:
        preset.systemPromptMode = SystemPromptMode.COMMON
    }
    
    // providerを変換
    switch (preset.provider) {
      case 'openai':
        preset.provider = CustomApiProvider.OpenAI
        break
      case 'anthropic':
        preset.provider = CustomApiProvider.Anthropic
        break
      case 'google':
        preset.provider = CustomApiProvider.Google
        break
      case 'perplexity':
        preset.provider = CustomApiProvider.Perplexity
        break
      case 'bedrock':
        preset.provider = CustomApiProvider.Bedrock
        break
      case 'vertexai-claude':
        preset.provider = CustomApiProvider.VertexAI_Claude
        break
      case 'anthropic-customauth':
        preset.provider = CustomApiProvider.Anthropic_CustomAuth
        break
      default:
        preset.provider = CustomApiProvider.OpenAI
    }
    
    // modelを実際のMODEL_LISTから取得
    const modelId = preset.model
    let actualModel = modelId
    
    // MODEL_LISTから対応するモデルを探す
    for (const provider in MODEL_LIST) {
      for (const modelName in MODEL_LIST[provider]) {
        if (MODEL_LIST[provider][modelName] === modelId) {
          actualModel = MODEL_LIST[provider][modelName]
          break
        }
      }
    }
    preset.model = actualModel
  })
  
  return activePresets
}

/**
 * テンプレートオプションを階層構造で動的生成
 */
export async function getTemplateOptions() {
  const config = getPresetConfig()
  const activePresets = await getActivePresets()
  
  // 基本のパブリックモデル
  const publicModels: any[] = []
  
  // Company Profileのモデル
  const companyModels: any[] = []
  
  let companyName: string | null = null
  
  try {
    const activeCompanyProfile = await getActiveCompanyProfile()
    if (activeCompanyProfile) {
      companyName = activeCompanyProfile.companyName
    }
  } catch (error) {
    console.warn('Failed to get active company profile:', error)
  }
  
  Object.keys(activePresets).forEach(key => {
    // Perplexityの場合は設定を確認
    if (key === 'Perplexity' && !config.settings.showPerplexityTemplate) {
      return
    }
    
    const preset = activePresets[key]
    const option = {
      name: preset.name,
      value: key.toLowerCase(),
      modelId: preset.model  // モデルIDを追加
    }
    
    // Company Profileの名前が含まれている場合は会社モデルとして分類
    if (companyName && key.includes(companyName)) {
      companyModels.push(option)
    } else {
      publicModels.push(option)
    }
  })
  
  // NestedDropdown用の階層構造を作成
  const nestedOptions: any[] = []
  
  // まず「テンプレート設定を適用」オプションを追加
  nestedOptions.push({
    label: 'Apply Template Settings',
    value: 'none'
  })
  
  if (publicModels.length > 0) {
    nestedOptions.push({
      label: 'Public Models',
      disabled: true,
      children: publicModels.map(option => {
        const preset = activePresets[option.name] || activePresets[Object.keys(activePresets).find(k => k.toLowerCase() === option.value) || '']
        return {
          label: option.name,
          value: preset?.model || option.value  // モデル名を表示用に使用
        }
      })
    })
  }
  
  if (companyModels.length > 0 && companyName) {
    nestedOptions.push({
      label: companyName,
      disabled: true,
      children: companyModels.map(option => {
        const preset = activePresets[option.name] || activePresets[Object.keys(activePresets).find(k => k.toLowerCase() === option.value) || '']
        return {
          label: option.name,
          value: preset?.model || option.value  // モデル名を表示用に使用
        }
      })
    })
  }
  
  // 階層構造を考慮したフラットオプションを生成（後方互換用）
  const flatOptionsWithSeparators = [
    { name: 'Apply Template Settings', value: 'none' }
  ]
  
  if (publicModels.length > 0) {
    // パブリックモデルがある場合は区切りを追加
    if (companyModels.length > 0) {
      flatOptionsWithSeparators.push({ name: '--- Public Models ---', value: 'separator-public' })
    }
    flatOptionsWithSeparators.push(...publicModels)
  }
  
  if (companyModels.length > 0) {
    // 会社モデルがある場合は区切りを追加
    flatOptionsWithSeparators.push({ name: `--- ${companyName} ---`, value: 'separator-company' })
    flatOptionsWithSeparators.push(...companyModels)
  }
  
  return {
    isHierarchical: companyModels.length > 0,
    nestedOptions: nestedOptions,
    flatOptions: flatOptionsWithSeparators
  }
}

/**
 * プリセットマッピングを動的生成
 */
export async function getPresetMapping(): Promise<Record<string, string>> {
  const activePresets = await getActivePresets()
  const mapping: Record<string, string> = {}
  
  Object.keys(activePresets).forEach(key => {
    mapping[key.toLowerCase()] = key
  })
  
  return mapping
}