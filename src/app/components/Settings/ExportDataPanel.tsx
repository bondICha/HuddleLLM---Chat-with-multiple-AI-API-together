import { useTranslation } from 'react-i18next'
import { BiExport, BiImport } from 'react-icons/bi'
import { exportData, exportCustomAPITemplate, importData } from '~app/utils/export'
import Button from '../Button'
import React, { useEffect, useState } from 'react';
import CustomAPITemplateImportPanel from './CustomAPITemplateImportPanel';
import { UserConfig } from '~services/user-config';
import { useLocation } from '@tanstack/react-router'

interface Props {
  userConfig: UserConfig
  updateConfigValue: (update: Partial<UserConfig>) => void
}

function ExportDataPanel({ userConfig, updateConfigValue }: Props) {
  const { t } = useTranslation()
  const location = useLocation()
  const [autoImportTemplate, setAutoImportTemplate] = useState<string | undefined>(undefined)
  const [companyName, setCompanyName] = useState<string | undefined>(undefined)

  useEffect(() => {
    // URLが変わっても（SettingPage上に居続けても）自動インポートを検知できるようにする
    const hash = window.location.hash
    const queryStart = hash.indexOf('?')
    if (queryStart === -1) return

    const urlParams = new URLSearchParams(hash.substring(queryStart + 1))
    const autoImport = urlParams.get('autoImport')
    const company = urlParams.get('company')
    if (!autoImport || !company) return

    setAutoImportTemplate(autoImport)
    setCompanyName(company)

    // URLパラメータをクリア（SettingPage滞在中に同じクエリを保持しない）
    const newHash = hash.substring(0, queryStart)
    window.history.replaceState({}, '', window.location.pathname + newHash)
  }, [location.hash, location.search])
  return (
    <div className="border border-slate-200 dark:border-slate-700 rounded-xl p-6 bg-slate-50 dark:bg-slate-800/50">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-8 h-8 bg-slate-600 dark:bg-slate-500 rounded-lg flex items-center justify-center">
          <BiExport className="text-white text-lg" />
        </div>
        <h2 className="text-xl font-bold">{t('Import Export Panel')}</h2>
      </div>
      
      <div className="flex flex-col lg:flex-row gap-6">
        {/* All Import Export */}
        <div className="border border-emerald-200 dark:border-emerald-700/50 rounded-lg p-5 bg-emerald-50/50 dark:bg-emerald-900/10 flex-1">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-6 h-6 bg-emerald-600 dark:bg-emerald-500 rounded-md flex items-center justify-center">
              <BiExport className="text-white text-sm" />
            </div>
            <h3 className="font-bold text-lg">{t('All Import Export　（Including API Key）')}</h3>
          </div>
          <p className="mb-4 opacity-80 text-sm">
            {t('Data includes all your settings, api key, chat histories, and local prompts. Do not share API Key with someone elses.')}
          </p>
          <div className="grid grid-cols-2 gap-3">
            <Button
              size="normal"
              text={t('Import')}
              icon={<BiImport />}
              onClick={importData}
              color="flat"
              className="w-full justify-center bg-white dark:bg-slate-800 border border-emerald-300 dark:border-emerald-600/50 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
            />
            <Button
              size="normal"
              text={t('Export')}
              icon={<BiExport />}
              onClick={exportData}
              color="primary"
              className="w-full justify-center bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white"
            />
          </div>
        </div>
        
        {/* Template Import Export */}
        <div className="border border-indigo-200 dark:border-indigo-700/50 rounded-lg p-5 bg-indigo-50/50 dark:bg-indigo-900/10 flex-1">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-6 h-6 bg-indigo-600 dark:bg-indigo-500 rounded-md flex items-center justify-center">
              <BiExport className="text-white text-sm" />
            </div>
            <h3 className="font-bold text-lg">{t('Template Import Export')}</h3>
          </div>
          <p className="mb-4 opacity-80 text-sm">
            {t('Import or export Custom API settings without affecting other data')}
          </p>
          <div className="grid grid-cols-2 gap-3">
            <CustomAPITemplateImportPanel 
              userConfig={userConfig} 
              updateConfigValue={updateConfigValue}
              autoImportTemplate={autoImportTemplate}
              companyName={companyName}
            />
            <Button
              size="normal"
              text={t('Export Template')}
              icon={<BiExport />}
              onClick={exportCustomAPITemplate}
              color="primary"
              className="w-full justify-center bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-500 text-white"
            />
          </div>
        </div>
      </div>
    </div>
  )
}

export default ExportDataPanel
