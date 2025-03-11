import { FC, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { BiImport } from 'react-icons/bi'
import { fileOpen } from 'browser-fs-access'
import Browser from 'webextension-polyfill'
import Button from '../Button'
import Dialog from '../Dialog'
import Select from '../Select'
import { UserConfig, customApiConfig, updateUserConfig } from '~services/user-config'
import toast from 'react-hot-toast'

interface Props {
  userConfig: UserConfig
  updateConfigValue: (update: Partial<UserConfig>) => void
}


const CustomAPITemplateImportPanel: FC<Props> = ({ userConfig, updateConfigValue }) => {
  const { t } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)
  const [importedConfigs, setImportedConfigs] = useState<customApiConfig[]>([])
  const [mappings, setMappings] = useState<number[]>([])

  // ファイル選択処理
  const handleFileSelect = async () => {
    try {
      const blob = await fileOpen({ extensions: ['.json'] })
      const json = JSON.parse(await blob.text())
      
      if (!json.sync) {
        toast.error(t('Invalid file format'))
        return
      }

      // カスタムAPI設定の抽出
      const importedConfigs: customApiConfig[] = []
      const configCount = json.sync.customApiConfigCount || 0
      
      for (let i = 0; i < configCount; i++) {
        const config = json.sync[`customApiConfig_${i}`]
        if (config) {
          importedConfigs.push(config)
        }
      }

      if (importedConfigs.length === 0) {
        toast.error(t('No Custom API settings found in the file'))
        return
      }

      // デフォルトのマッピングを設定（同じインデックスに）
      const defaultMappings = importedConfigs.map((_, index) => 
        index < userConfig.customApiConfigs.length ? index : -1
      )

      setImportedConfigs(importedConfigs)
      setMappings(defaultMappings)
      setIsOpen(true)
    } catch (error) {
      console.error('Error importing file:', error)
      toast.error(t('Failed to import file'))
    }
  }

  // インポート実行
  const handleImport = async () => {
    try {
      // 確認ダイアログ
      const confirmMessage = t(
        'Selected Custom API settings will be imported. This will overwrite existing settings including individual API keys. Common API Key will be preserved. Continue?'
      )
      
      if (!window.confirm(confirmMessage)) {
        return
      }

      // 現在の設定のコピーを作成
      const newConfigs = [...userConfig.customApiConfigs]

      // マッピングに基づいて設定を適用
      importedConfigs.forEach((config, index) => {
        const targetIndex = mappings[index]
        if (targetIndex !== undefined && targetIndex >= 0 && targetIndex < newConfigs.length) {
          // 設定を上書き
          newConfigs[targetIndex] = {
            ...config,
            id: newConfigs[targetIndex].id // IDは保持
          }
        }
      })

      // Reactの状態を更新
      updateConfigValue({ customApiConfigs: newConfigs })
      
      // 設定をブラウザストレージに保存（ユーティリティ関数を使用）
      await updateUserConfig({ customApiConfigs: newConfigs })
      
      // 成功メッセージ
      toast.success(t('Custom API settings imported successfully'))
      
      setIsOpen(false)
    } catch (error) {
      console.error('Error applying import:', error)
      toast.error(t('Failed to apply imported settings'))
    }
  }

  return (
    <>
      <Button 
        size="small" 
        text={t('Import Custom API Template')} 
        icon={<BiImport />} 
        onClick={handleFileSelect} 
      />
      
      <Dialog 
        open={isOpen} 
        onClose={() => setIsOpen(false)} 
        title={t('Import Custom API Template')}
      >
        <div className="mb-6 px-2">
          <p className="text-sm text-gray-500">
            {t('Select which models to import and where to place them. Individual API keys will be overwritten, but common API key will be preserved.')}
          </p>
        </div>
        
        <div className="max-h-[60vh] overflow-y-auto px-5">
          {importedConfigs.map((importConfig, index) => (
            <div key={index} className="flex items-center gap-6 mb-2 py-2">
              <div className="w-1/3">
                <p className="font-medium">{importConfig.name}</p>
                <p className="text-xs text-gray-400 mt-1">{importConfig.model}</p>
              </div>
              <div className="w-1/6 text-center text-lg">→</div>
              <div className="w-1/2">
                <Select
                  options={[
                    { name: t('Do not import'), value: '-1' },
                    ...userConfig.customApiConfigs.map((config, i) => ({ 
                      name: `${i+1}: ${config.name}`, 
                      value: String(i) 
                    }))
                  ]}
                  value={String(mappings[index])}
                  onChange={(v) => {
                    const newValue = parseInt(v, 10)
                    const newMappings = [...mappings]
                    
                    // 選択された値が有効なモデル番号で、他の場所で既に選択されている場合
                    if (newValue >= 0) {
                      // 同じ値が他の場所で使われているかチェック
                      const duplicateIndex = newMappings.findIndex(
                        (mapping, i) => i !== index && mapping === newValue
                      )
                      
                      // 重複があれば、その場所を「Do not import」に設定
                      if (duplicateIndex !== -1) {
                        newMappings[duplicateIndex] = -1
                      }
                    }
                    
                    // 現在の選択を更新
                    newMappings[index] = newValue
                    setMappings(newMappings)
                  }}
                />
              </div>
            </div>
          ))}
        </div>
        
        <div className="flex justify-end gap-4 mt-6 px-2">
          <Button text={t('Cancel')} onClick={() => setIsOpen(false)} color="flat" />
          <Button text={t('Import')} onClick={handleImport} color="primary" />
        </div>
      </Dialog>
    </>
  )
}

export default CustomAPITemplateImportPanel
