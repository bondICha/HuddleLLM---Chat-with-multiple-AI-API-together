import Browser from 'webextension-polyfill'

export interface CompanyProfilePreset {
  companyName: string
  checkUrl: string
  logoUrl?: string
  templateData: any
  version: string
}

export enum CompanyProfileStatus {
  UNCONFIRMED = 'unconfirmed',
  IMPORTED = 'imported',
  REJECTED = 'rejected'
}

export interface CompanyProfileState {
  companyName: string
  version: string
  status: CompanyProfileStatus
  lastChecked: number
}

// Sample configuration for company profiles. 
// Create a separate company-profiles-config.ts file with your actual settings.
export const COMPANY_PROFILE_PRESETS: CompanyProfilePreset[] = [
  {
    companyName: 'ExampleCompany',
    checkUrl: 'https://internal.example.com/',
    version: '1.0.0',
    templateData: {
      "customApiConfigs": [],
      "customApiHost": "https://api.example.com"
    }
  }
]

// Function to get actual configuration, fallback to sample if not available
async function loadCompanyProfiles(): Promise<CompanyProfilePreset[]> {
  try {
    const { COMPANY_PROFILE_CONFIGS } = await import('../../config/company-profiles')
    return COMPANY_PROFILE_CONFIGS
  } catch {
    // Fallback to sample configuration if company-profiles.ts doesn't exist in config/
    return COMPANY_PROFILE_PRESETS
  }
}

export async function getCompanyProfileConfigs(): Promise<CompanyProfilePreset[]> {
  return await loadCompanyProfiles()
}

export async function findCompanyPresetByUrl(url: string): Promise<CompanyProfilePreset | undefined> {
  const configs = await getCompanyProfileConfigs()
  return configs.find(preset => preset.checkUrl === url)
}

export async function findCompanyPresetByName(companyName: string): Promise<CompanyProfilePreset | undefined> {
  const configs = await getCompanyProfileConfigs()
  return configs.find(preset => preset.companyName === companyName)
}

export async function getCompanyProfileState(companyName: string): Promise<CompanyProfileState | null> {
  try {
    const result = await Browser.storage.local.get(`companyProfile_${companyName}`)
    return result[`companyProfile_${companyName}`] || null
  } catch {
    return null
  }
}

export async function setCompanyProfileState(state: CompanyProfileState): Promise<void> {
  try {
    await Browser.storage.local.set({
      [`companyProfile_${state.companyName}`]: state
    })
  } catch (error) {
    console.error('Failed to save company profile state:', error)
  }
}

export function compareVersions(version1: string, version2: string): number {
  const v1Parts = version1.split('.').map(Number)
  const v2Parts = version2.split('.').map(Number)
  
  for (let i = 0; i < Math.max(v1Parts.length, v2Parts.length); i++) {
    const v1Part = v1Parts[i] || 0
    const v2Part = v2Parts[i] || 0
    
    if (v1Part > v2Part) return 1
    if (v1Part < v2Part) return -1
  }
  
  return 0
}

export async function shouldShowProfilePrompt(preset: CompanyProfilePreset): Promise<boolean> {
  const state = await getCompanyProfileState(preset.companyName)
  
  if (!state) {
    return true // 初回
  }
  
  if (state.status === CompanyProfileStatus.UNCONFIRMED) {
    return true // 「もう一度Popupする」が選択されていた場合
  }
  
  if (compareVersions(preset.version, state.version) > 0) {
    return true // 新しいバージョンがある場合
  }
  
  return false
}

export async function checkCompanyProfile(internalUrl: string): Promise<boolean> {
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 1000)

    await fetch(internalUrl, {
      signal: controller.signal,
      mode: 'no-cors', // Use no-cors to avoid CORS errors
      method: 'HEAD',
    })

    clearTimeout(timeoutId)

    return true // If fetch succeeds, we assume we are in the company network
  } catch {
    return false // Network error
  }
}