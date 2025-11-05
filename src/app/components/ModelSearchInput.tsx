import { FC, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { BiPencil } from 'react-icons/bi'
import { Input } from './Input'
import { MODEL_LIST } from '~services/user-config'

interface ModelSearchInputProps {
  value: string
  onChange: (value: string) => void
  apiModels?: any[]
  provider?: string
  placeholder?: string
  className?: string
}

interface FilteredModel {
  model: string
  isApi: boolean
  provider?: string
}

const ModelSearchInput: FC<ModelSearchInputProps> = ({
  value,
  onChange,
  apiModels = [],
  provider,
  placeholder,
  className = ''
}) => {
  const { t } = useTranslation()
  const [isSearching, setIsSearching] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filteredModels, setFilteredModels] = useState<FilteredModel[]>([])

  // Function to get filtered models based on search term
  const getFilteredModels = (search: string): FilteredModel[] => {
    const results: FilteredModel[] = []
    
    if (!search.trim()) return results
    
    const searchLower = search.toLowerCase()
    
    // First, add API models (if available)
    if (apiModels && apiModels.length > 0) {
      apiModels.forEach((model: any) => {
        if (model.id.toLowerCase().includes(searchLower)) {
          results.push({
            model: model.id,
            isApi: true,
            provider
          })
        }
      })
    }
    
    // Then, add static models from MODEL_LIST
    Object.keys(MODEL_LIST).forEach(providerName => {
      Object.entries(MODEL_LIST[providerName]).forEach(([modelName, modelData]) => {
        const modelValue = typeof modelData === 'string' ? modelData : modelData.value
        if (modelName.toLowerCase().includes(searchLower) || 
            modelValue.toLowerCase().includes(searchLower)) {
          results.push({
            model: modelValue,
            isApi: false,
            provider: providerName
          })
        }
      })
    })
    
    return results
  }

  const handleSearchChange = (searchValue: string) => {
    setSearchTerm(searchValue)
    setFilteredModels(getFilteredModels(searchValue))
  }

  const handleModelSelect = (model: string) => {
    onChange(model)
    setIsSearching(false)
    setSearchTerm('')
    setFilteredModels([])
  }

  const handleSearchStart = () => {
    setIsSearching(true)
    setSearchTerm(value || '')
    if (value) {
      setFilteredModels(getFilteredModels(value))
    }
  }

  const handleSearchEnd = () => {
    // Delay to allow clicking on results
    setTimeout(() => {
      setIsSearching(false)
      setSearchTerm('')
      setFilteredModels([])
    }, 200)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === 'Escape') {
      setIsSearching(false)
      setSearchTerm('')
      setFilteredModels([])
    }
  }

  return (
    <div className={`relative ${className}`}>
      {isSearching ? (
        <>
          <Input
            value={searchTerm}
            onChange={(e) => handleSearchChange(e.currentTarget.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                // Enterキーで現在の入力値をモデルとして選択
                handleModelSelect(searchTerm)
              } else if (e.key === 'Escape') {
                handleSearchEnd()
              }
            }}
            onBlur={handleSearchEnd}
            autoFocus
            className="w-full text-sm"
            placeholder={placeholder || t('Search models...')}
          />
          {/* Search results dropdown */}
          {filteredModels.length > 0 && (
            <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-60 overflow-y-auto">
              {filteredModels.map((item, idx) => (
                <div
                  key={idx}
                  onClick={() => handleModelSelect(item.model)}
                  className="px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer border-b border-gray-100 dark:border-gray-700 last:border-b-0"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm truncate">{item.model}</span>
                    <span className={`text-xs px-2 py-1 rounded ml-2 flex-shrink-0 ${
                      item.isApi 
                        ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' 
                        : 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                    }`}>
                      {item.isApi ? t('API') : t('Static')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        <div 
          className="flex items-center gap-2 p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-800 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          onClick={handleSearchStart}
        >
          <span className="flex-1 text-sm truncate">
            {value || t('No model selected')}
          </span>
          <BiPencil size={14} className="opacity-50 flex-shrink-0" />
        </div>
      )}
    </div>
  )
}

export default ModelSearchInput