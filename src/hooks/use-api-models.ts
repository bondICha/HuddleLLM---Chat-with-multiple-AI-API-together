import { useState, useCallback, useRef } from 'react'
import { CustomApiProvider } from '~services/user-config'

interface ApiModel {
  id: string
  object: string
  created: number
  owned_by: string
}

interface ModelFetchConfig {
  provider: CustomApiProvider
  apiKey: string
  host: string
  isHostFullPath?: boolean
}

interface UseApiModelsReturn {
  models: ApiModel[]
  loading: boolean
  error: string | null
  fetchModels: (config: ModelFetchConfig, configIndex?: number) => Promise<void>
  fetchAllModels: (configs: ModelFetchConfig[]) => Promise<void>
  clearModels: () => void
  modelsPerConfig: Record<number, ApiModel[]>
  errorsPerConfig: Record<number, string | null>
  isProviderSupported: (provider: CustomApiProvider) => boolean
}

export const useApiModels = (): UseApiModelsReturn => {
  const [models, setModels] = useState<ApiModel[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [modelsPerConfig, setModelsPerConfig] = useState<Record<number, ApiModel[]>>({})
  const [errorsPerConfig, setErrorsPerConfig] = useState<Record<number, string | null>>({})
  const cacheRef = useRef<Map<string, { models: ApiModel[]; timestamp: number }>>(new Map())
  
  // Cache duration: 5 minutes
  const CACHE_DURATION = 5 * 60 * 1000

  const getCacheKey = (config: ModelFetchConfig): string => {
    return `${config.provider}-${config.host}-${config.apiKey.substring(0, 10)}`
  }

  // Smart URL construction for endpoints (Full Path case, fallback for failed attempts)
  const tryModelsUrls = (host: string): string[] => {
    const urls = []
    
    // First try: direct /models
    if (host.endsWith('/models')) {
      urls.push(host)
    } else {
      // Ensure no double slashes when adding /models
      const cleanHost = host.endsWith('/') ? host.slice(0, -1) : host
      urls.push(`${cleanHost}/models`)
      // Also try /v1/models (for cases like rakuten anthropic)
      urls.push(`${cleanHost}/v1/models`)
    }
    
    // Try removing path segments up to 3 levels
    let currentUrl = host.endsWith('/') ? host.slice(0, -1) : host
    for (let i = 0; i < 3; i++) {
      const lastSlash = currentUrl.lastIndexOf('/')
      if (lastSlash > 8) { // Keep protocol part
        currentUrl = currentUrl.substring(0, lastSlash)
        urls.push(`${currentUrl}/models`)
        urls.push(`${currentUrl}/v1/models`)
      }
    }
    
    return [...new Set(urls)] // Remove duplicates
  }

  // Generate headers based on provider
  const getHeaders = (provider: CustomApiProvider, apiKey: string): Record<string, string> => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }

    if (provider === CustomApiProvider.Anthropic) {
      headers['x-api-key'] = apiKey
      headers['anthropic-version'] = '2023-06-01'
    } else {
      // OpenAI-compatible (OpenAI, QwenOpenAI, etc.)
      headers['Authorization'] = `Bearer ${apiKey}`
    }

    return headers
  }

  const fetchModels = useCallback(async (config: ModelFetchConfig) => {
    const { provider, apiKey, host, isHostFullPath } = config

    // Provider Support Check
    if (!isProviderSupported(provider)) {
      setError('Model fetching is only supported for compatible APIs')
      return
    }

    if (!apiKey || !host) {
      setError('API Key and Host are required')
      return
    }

    // Check cache first
    const cacheKey = getCacheKey(config)
    const cached = cacheRef.current.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      setModels(cached.models)
      setError(null)
      return
    }

    setLoading(true)
    setError(null)

    try {
      let response: Response | null = null
      let lastError: Error | null = null
      const headers = getHeaders(provider, apiKey)

      if (isHostFullPath) {
        // For full path, try smart URL detection
        const possibleUrls = tryModelsUrls(host)
        for (const url of possibleUrls) {
          try {
            response = await fetch(url, {
              method: 'GET',
              headers,
            })
            if (response.ok) break
          } catch (err) {
            lastError = err instanceof Error ? err : new Error('Unknown error')
          }
        }
        if (!response || !response.ok) {
          throw lastError || new Error('All model endpoints failed')
        }
      } else {
        // Try standard path construction first
        const api_path = 'v1/models';
        const baseUrl = host.endsWith('/') ? host.slice(0, -1) : host;
        let fullUrlStr: string;
        if (baseUrl.endsWith('/v1')) {
          fullUrlStr = `${baseUrl.slice(0, -3)}/${api_path}`;
        } else {
          fullUrlStr = `${baseUrl}/${api_path}`;
        }
        fullUrlStr = fullUrlStr.replace(/([^:]\/)\/+/g, "$1");
        fullUrlStr = fullUrlStr.replace(/\/v1\/v1\//g, "/v1/");
        
        try {
          response = await fetch(fullUrlStr, {
            method: 'GET',
            headers,
          })
          
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`)
          }
        } catch (err) {
          // If standard path fails, try smart URL detection as fallback
          console.log('Standard path failed, trying smart URL detection...')
          const possibleUrls = tryModelsUrls(host)
          for (const url of possibleUrls) {
            try {
              response = await fetch(url, {
                method: 'GET',
                headers,
              })
              if (response.ok) break
            } catch (fallbackErr) {
              lastError = fallbackErr instanceof Error ? fallbackErr : new Error('Unknown error')
            }
          }
          if (!response || !response.ok) {
            throw lastError || err
          }
        }
      }

      const data = await response.json()
      const fetchedModels: ApiModel[] = data.data || []
      
      // Sort models by id for consistent ordering
      fetchedModels.sort((a, b) => a.id.localeCompare(b.id))
      
      setModels(fetchedModels)
      setError(null)
      
      // Cache the results
      cacheRef.current.set(cacheKey, {
        models: fetchedModels,
        timestamp: Date.now()
      })
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
      setError(`Failed to fetch models: ${errorMessage}`)
      setModels([])
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchAllModels = useCallback(async (configs: ModelFetchConfig[]) => {
    setLoading(true)
    setErrorsPerConfig({})
    
    const fetchPromises = configs.map(async (config, index) => {
      // Only fetch for supported APIs
      if (!isProviderSupported(config.provider)) {
        return
      }

      if (!config.apiKey || !config.host) {
        setErrorsPerConfig(prev => ({
          ...prev,
          [index]: 'API Key and Host are required'
        }))
        return
      }

      // Check cache first
      const cacheKey = getCacheKey(config)
      const cached = cacheRef.current.get(cacheKey)
      if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        setModelsPerConfig(prev => ({ ...prev, [index]: cached.models }))
        return
      }

      try {
        let response: Response | null = null
        let lastError: Error | null = null
        const headers = getHeaders(config.provider, config.apiKey)

        if (config.isHostFullPath) {
          // For full path, try smart URL detection
          const possibleUrls = tryModelsUrls(config.host)
          for (const url of possibleUrls) {
            try {
              response = await fetch(url, {
                method: 'GET',
                headers,
              })
              if (response.ok) break
            } catch (err) {
              lastError = err instanceof Error ? err : new Error('Unknown error')
            }
          }
          if (!response || !response.ok) {
            throw lastError || new Error('All model endpoints failed')
          }
        } else {
          // Try standard path construction first
          const api_path = 'v1/models'
          const baseUrl = config.host.endsWith('/') ? config.host.slice(0, -1) : config.host
          let fullUrlStr: string
          if (baseUrl.endsWith('/v1')) {
            fullUrlStr = `${baseUrl.slice(0, -3)}/${api_path}`
          } else {
            fullUrlStr = `${baseUrl}/${api_path}`
          }
          fullUrlStr = fullUrlStr.replace(/([^:]\/)\/+/g, "$1")
          fullUrlStr = fullUrlStr.replace(/\/v1\/v1\//g, "/v1/")
          
          try {
            response = await fetch(fullUrlStr, {
              method: 'GET',
              headers,
            })
            
            if (!response.ok) {
              throw new Error(`HTTP ${response.status}: ${response.statusText}`)
            }
          } catch (err) {
            // If standard path fails, try smart URL detection as fallback
            console.log(`Standard path failed for config ${index}, trying smart URL detection...`)
            const possibleUrls = tryModelsUrls(config.host)
            for (const url of possibleUrls) {
              try {
                response = await fetch(url, {
                  method: 'GET',
                  headers,
                })
                if (response.ok) break
              } catch (fallbackErr) {
                lastError = fallbackErr instanceof Error ? fallbackErr : new Error('Unknown error')
              }
            }
            if (!response || !response.ok) {
              throw lastError || err
            }
          }
        }

        const data = await response.json()
        const fetchedModels: ApiModel[] = data.data || []
        fetchedModels.sort((a, b) => a.id.localeCompare(b.id))
        
        setModelsPerConfig(prev => ({ ...prev, [index]: fetchedModels }))
        
        // Cache the results
        cacheRef.current.set(cacheKey, {
          models: fetchedModels,
          timestamp: Date.now()
        })
        
      } catch (err) {
        console.error(`Failed to fetch models for config ${index}:`, err)
        setErrorsPerConfig(prev => ({
          ...prev,
          [index]: err instanceof Error ? err.message : 'Unknown error occurred'
        }))
      }
    })

    await Promise.allSettled(fetchPromises)
    setLoading(false)
  }, [getCacheKey, CACHE_DURATION, tryModelsUrls])

  const isProviderSupported = useCallback((provider: CustomApiProvider): boolean => {
    // とりあえず全部試す
    // return provider === CustomApiProvider.OpenAI || 
    //        provider === CustomApiProvider.QwenOpenAI || 
    //        provider === CustomApiProvider.GeminiOpenAI || 
    //        provider === CustomApiProvider.Anthropic
    return true
  }, [])

  const clearModels = useCallback(() => {
    setModels([])
    setModelsPerConfig({})
    setErrorsPerConfig({})
    setError(null)
    setLoading(false)
  }, [])

  return {
    models,
    loading,
    error,
    fetchModels,
    fetchAllModels,
    clearModels,
    modelsPerConfig,
    errorsPerConfig,
    isProviderSupported
  }
}