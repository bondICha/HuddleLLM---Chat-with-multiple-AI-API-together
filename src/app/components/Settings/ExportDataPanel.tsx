import { useTranslation } from 'react-i18next'
import { BiExport, BiImport } from 'react-icons/bi'
import { exportData, importData } from '~app/utils/export'
import Button from '../Button'
import React from 'react';
import CustomAPITemplateImportPanel from './CustomAPITemplateImportPanel';
import { UserConfig } from '~services/user-config';

interface Props {
  userConfig: UserConfig
  updateConfigValue: (update: Partial<UserConfig>) => void
}

function ExportDataPanel({ userConfig, updateConfigValue }: Props) {
  const { t } = useTranslation()
  return (
    <div className="flex flex-row gap-10">
      <div className="flex-1">
        <p className="font-bold mb-1 text-lg">{t('Export/Import All Data')}</p>
        <p className="mb-3 opacity-80">{t('Data includes all your settings, chat histories, and local prompts')}</p>
        <div className="flex flex-row gap-3">
          <Button size="small" text={t('Export')} icon={<BiExport />} onClick={exportData} />
          <Button size="small" text={t('Import')} icon={<BiImport />} onClick={importData} />
        </div>
      </div>
      
      <div className="flex-1">
        <p className="font-bold mb-1 text-lg">{t('Import Custom API Template')}</p>
        <p className="mb-3 opacity-80">{t('Import only Custom API setttings without affecting other data')}</p>
        <div className="flex flex-row gap-3">
          <CustomAPITemplateImportPanel userConfig={userConfig} updateConfigValue={updateConfigValue} />
        </div>
      </div>
    </div>
  )
}

export default ExportDataPanel
