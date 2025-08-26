import { FC, useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { BiImport } from 'react-icons/bi'
import { fileOpen } from 'browser-fs-access'
import Button from '../Button'
import Dialog from '../Dialog'
import Select from '../Select'
import Checkbox from '../Checkbox'
import { UserConfig, CustomApiConfig, updateUserConfig } from '~services/user-config'
import { setCompanyProfileState, CompanyProfileStatus, findCompanyPresetByName } from '~services/company-profile'
import { requestHostPermissions } from '~services/host-permissions'
import toast from 'react-hot-toast'

interface Props {
  userConfig: UserConfig
  updateConfigValue: (update: Partial<UserConfig>) => void
  autoImportTemplate?: string // 自動インポート用のテンプレートパス
  companyName?: string // 会社名
}


// Helper function to parse imported template data from various formats
const _parseImportedTemplateData = (jsonData: any): { configs: CustomApiConfig[], host?: string, commonSystemMessage?: string } => {
  let parsedConfigs: CustomApiConfig[] = [];
  let parsedHost: string | undefined = undefined;
  let parsedCommonSystemMessage: string | undefined = undefined;

  // New export format (top-level customApiConfigs array)
  if (Array.isArray(jsonData.customApiConfigs)) {
    console.log('Parsing template from new top-level array format', jsonData.customApiConfigs.length);
    parsedConfigs = [...jsonData.customApiConfigs];
    if (typeof jsonData.customApiHost === 'string') {
      parsedHost = jsonData.customApiHost;
    }
    if (typeof jsonData.commonSystemMessage === 'string') {
      parsedCommonSystemMessage = jsonData.commonSystemMessage;
    }
  }
  // Old export format (json.sync.customApiConfigs array)
  else if (jsonData.sync && Array.isArray(jsonData.sync.customApiConfigs)) {
    console.log('Parsing template from old sync.customApiConfigs array format', jsonData.sync.customApiConfigs.length);
    parsedConfigs = [...jsonData.sync.customApiConfigs];
    if (typeof jsonData.sync.customApiHost === 'string') {
      parsedHost = jsonData.sync.customApiHost;
    }
    if (typeof jsonData.sync.commonSystemMessage === 'string') {
      parsedCommonSystemMessage = jsonData.sync.commonSystemMessage;
    }
  }
  // Even older export format (json.sync individual keys)
  else if (jsonData.sync) {
    console.log('Parsing template from old sync individual keys format');
    const configKeys = Object.keys(jsonData.sync).filter(key => key.startsWith('customApiConfig_'));
    if (configKeys.length > 0) {
      configKeys.sort((a, b) => {
        const indexA = parseInt(a.split('_')[1], 10);
        const indexB = parseInt(b.split('_')[1], 10);
        return indexA - indexB;
      });
      for (const configKey of configKeys) {
        const config = jsonData.sync[configKey];
        if (config) {
          parsedConfigs.push(config);
        }
      }
    }
    if (typeof jsonData.sync.customApiHost === 'string') {
      parsedHost = jsonData.sync.customApiHost;
    }
    if (typeof jsonData.sync.commonSystemMessage === 'string') {
      parsedCommonSystemMessage = jsonData.sync.commonSystemMessage;
    }
  }
  return { configs: parsedConfigs, host: parsedHost, commonSystemMessage: parsedCommonSystemMessage };
};


const CustomAPITemplateImportPanel: FC<Props> = ({ userConfig, updateConfigValue, autoImportTemplate, companyName }) => {
  const { t } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)
  const [importedData, setImportedData] = useState<{ configs: CustomApiConfig[], host?: string, commonSystemMessage?: string }>({ configs: [] });
  const [mappings, setMappings] = useState<number[]>([])
  const [lastOpenedFile, setLastOpenedFile] = useState<Blob | null>(null);
  // Common要素のインポート選択状態（デフォルトはON）
  const [importCommonHost, setImportCommonHost] = useState(true);
  const [importCommonSystemMessage, setImportCommonSystemMessage] = useState(true);

  // 自動テンプレートインポート処理
  const handleAutoImport = async (companyName: string) => {
    try {
      const preset = await findCompanyPresetByName(companyName);
      if (!preset) {
        throw new Error('Company preset not found');
      }

      const { configs: parsedConfigs, host: parsedHost, commonSystemMessage: parsedCommonSystemMessage } = _parseImportedTemplateData(preset.templateData);

      if (parsedConfigs.length === 0) {
        toast.error(t('No Custom API settings found in the file. Please check the file format.'));
        return;
      }

      // チェックボックスの状態をリセット（デフォルトはON）
      setImportCommonHost(true);
      setImportCommonSystemMessage(true);

      // デフォルト値上書きロジック：既存Bot数以下は上書き、超過時は「Add as new」
      const defaultMappings = parsedConfigs.map((_, index) => {
        if (index < userConfig.customApiConfigs.length) {
          return index; // 上書き
        } else {
          return -2; // Add as new
        }
      });

      setImportedData({ configs: parsedConfigs, host: parsedHost, commonSystemMessage: parsedCommonSystemMessage });
      setMappings(defaultMappings);
      setIsOpen(true);

    } catch (error: any) {
      console.error('Error processing auto import template:', error);
      toast.error(t('Failed to process template: ') + error.message);
    }
  };

  // 自動インポートのuseEffect
  useEffect(() => {
    if (autoImportTemplate === 'templateData' && companyName) {
      handleAutoImport(companyName);
    }
  }, [autoImportTemplate, companyName]);


  // ファイル選択処理
  const handleFileSelect = async () => {
    try {
      const blob = await fileOpen({ extensions: ['.json'] })
      setLastOpenedFile(blob);
      const text = await blob.text()
      const json = JSON.parse(text);

      const { configs: parsedConfigs, host: parsedHost, commonSystemMessage: parsedCommonSystemMessage } = _parseImportedTemplateData(json);

      if (parsedConfigs.length === 0) {
        toast.error(t('No Custom API settings found in the file. Please check the file format.'));
        return;
      }

      // チェックボックスの状態をリセット（デフォルトはON）
      setImportCommonHost(true);
      setImportCommonSystemMessage(true);

      // 既存Bot数以下は上書き、超過時は「Add as new」
      const defaultMappings = parsedConfigs.map((_, index) => {
        if (index < userConfig.customApiConfigs.length) {
          return index; // 上書き
        } else {
          return -2; // Add as new
        }
      });

      setImportedData({ configs: parsedConfigs, host: parsedHost, commonSystemMessage: parsedCommonSystemMessage });
      setMappings(defaultMappings);
      setIsOpen(true);

    } catch (error: any) {
      console.error('Error processing file for import:', error);
      toast.error(t('Failed to process file: ') + error.message);
      setLastOpenedFile(null);
    }
  }

  // インポート実行
  const handleImport = async () => {
    try {
      const confirmMessage = t(
        'Selected Custom API settings will be imported. This will overwrite existing settings including individual API keys. Common API Key will be preserved. Continue?'
      );
      if (!window.confirm(confirmMessage)) {
        return;
      }

      const newConfigs = [...userConfig.customApiConfigs];
      const configsToAdd: CustomApiConfig[] = [];

      importedData.configs.forEach((config, index) => {
        const targetIndex = mappings[index];
        if (targetIndex === -2) { // Add as new
          const newIndex = newConfigs.length + configsToAdd.length;
          configsToAdd.push({
            ...config,
            id: newIndex + 1, // Assign new ID
            enabled: true,
          });
        } else if (targetIndex !== undefined && targetIndex >= 0 && targetIndex < newConfigs.length) { // Overwrite existing
          newConfigs[targetIndex] = {
            ...config,
            id: newConfigs[targetIndex].id, // Preserve original ID
            enabled: true, // Enable imported config
          };
        }
      });

      const updatedConfigs = [...newConfigs, ...configsToAdd];
      const updatePayload: Partial<UserConfig> = { customApiConfigs: updatedConfigs };

      if (importedData.host !== undefined && importCommonHost) {
        updatePayload.customApiHost = importedData.host;
      }

      if (importedData.commonSystemMessage !== undefined && importCommonSystemMessage) {
        updatePayload.commonSystemMessage = importedData.commonSystemMessage;
      }

      await updateUserConfig(updatePayload);
      updateConfigValue(updatePayload);

      // 会社プロファイルのImportが実行された場合、状態を「Import済み」に更新
      if (companyName) {
        const preset = await findCompanyPresetByName(companyName);
        if (preset) {
          await setCompanyProfileState({
            companyName: preset.companyName,
            version: preset.version,
            status: CompanyProfileStatus.IMPORTED,
            lastChecked: Date.now(),
            checkCount: 0
          });
        }
      }

      // Request host permissions for imported API hosts
      await requestHostPermissions(updatedConfigs, updatePayload.customApiHost || userConfig.customApiHost);

      toast.success(t('Custom API settings imported successfully'));
      setIsOpen(false);
      setLastOpenedFile(null); // 正常終了後リセット

    } catch (error: any) {
      console.error('Error applying import:', error);
      toast.error(t('Failed to apply imported settings: ') + error.message);
      // エラー時、元の設定に戻す処理は updateConfigValue を使って行う
      updateConfigValue({
        customApiConfigs: userConfig.customApiConfigs || [],
        customApiHost: userConfig.customApiHost,
        commonSystemMessage: userConfig.commonSystemMessage
      });
    }
  };

  return (
    <>
      <Button
        size="normal"
        text={t('Import Template')}
        icon={<BiImport />}
        onClick={handleFileSelect}
        color="flat"
        className="w-full justify-center bg-white dark:bg-slate-800 border border-indigo-300 dark:border-indigo-600/50 hover:bg-indigo-50 dark:hover:bg-indigo-900/20"
      />

      <Dialog
        open={isOpen}
        onClose={() => setIsOpen(false)}
        title={t('Import Custom API Template')}
      >
        <div className="px-6 py-4 space-y-4">
          <div>
            <p className="text-sm text-secondary-text">
              {t('Select which models to import and where to place them. Individual API keys will be overwritten, but common API key will be preserved.')}
            </p>
          </div>

          {/* Common要素のインポート選択 */}
          {(importedData.host !== undefined || importedData.commonSystemMessage !== undefined) && (
            <div className="border-t border-primary-border pt-4">
              <h4 className="text-sm font-medium mb-3 text-primary-text">{t('Common Settings')}</h4>
              <div className="space-y-2">
                {importedData.host !== undefined && (
                  <Checkbox
                    label={t('Import Common API Host') + `: ${importedData.host}`}
                    checked={importCommonHost}
                    onChange={setImportCommonHost}
                  />
                )}
                {importedData.commonSystemMessage !== undefined && (
                  <Checkbox
                    label={t('Import Common System Message')}
                    checked={importCommonSystemMessage}
                    onChange={setImportCommonSystemMessage}
                  />
                )}
              </div>
            </div>
          )}

          {/* Column headers */}
          <div className="flex items-center gap-6 mb-4 py-2 border-b border-primary-border">
            <div className="w-1/3">
              <h4 className="text-sm font-medium text-primary-text">{t('Import ChatBot Settings')}</h4>
            </div>
            <div className="w-1/6"></div>
            <div className="w-1/2">
              <h4 className="text-sm font-medium text-primary-text">{t('Override Chatbot')}</h4>
            </div>
          </div>

          <div className="max-h-[50vh] overflow-y-auto -mx-6 px-6">
            {importedData.configs.map((importConfig, index) => (
              <div key={index} className="flex items-center gap-6 mb-2 py-2">
                <div className="w-1/3">
                  <p className="font-medium text-primary-text">{importConfig.name}</p>
                  <p className="text-xs text-secondary-text mt-1">{importConfig.model}</p>
                </div>
                <div className="w-1/6 text-center text-lg text-secondary-text">→</div>
                <div className="w-1/2">
                  <Select
                    options={[
                      { name: t('Do not import'), value: '-1' },
                      { name: t('Add as new'), value: '-2' },
                      ...userConfig.customApiConfigs.map((config, i) => ({
                        name: `${i + 1}: ${config.name}`,
                        value: String(i)
                      }))
                    ]}
                    value={String(mappings[index])}
                    onChange={(v) => {
                      const newValue = parseInt(v, 10)
                      const newMappings = [...mappings]

                      if (newValue >= 0) {
                        const duplicateIndex = newMappings.findIndex(
                          (mapping, i) => i !== index && mapping === newValue
                        )
                        if (duplicateIndex !== -1) {
                          newMappings[duplicateIndex] = -1
                        }
                      }
                      newMappings[index] = newValue
                      setMappings(newMappings)
                    }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-4 pt-4">
            <Button text={t('Cancel')} onClick={() => setIsOpen(false)} color="flat" />
            <Button text={t('Import')} onClick={handleImport} color="primary" />
          </div>
        </div>
      </Dialog>
    </>
  )
}

export default CustomAPITemplateImportPanel
