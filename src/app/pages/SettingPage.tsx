import { motion } from 'framer-motion'
import { FC, PropsWithChildren, useCallback, useEffect, useState } from 'react'
import toast, { Toaster } from 'react-hot-toast'
import { useTranslation } from 'react-i18next'
import Browser from 'webextension-polyfill'
import Button from '~app/components/Button'
import { Input } from '~app/components/Input'
import RadioGroup from '~app/components/RadioGroup'
import Select from '~app/components/Select'
import Blockquote from '~app/components/Settings/Blockquote'
import { cloneDeep } from 'lodash-es'
import { requestHostPermissions } from '~services/host-permissions'
import { useAtomValue } from 'jotai'
import { themeColorAtom } from '~app/state'


import CustomAPISettings from '~app/components/Settings/CustomApiSettings'
import ExportDataPanel from '~app/components/Settings/ExportDataPanel'
import ShortcutPanel from '~app/components/Settings/ShortcutPanel'
import AllHostsPermissionPanel from '~app/components/Settings/AllHostsPermissionPanel'
import DangerZone from '~app/components/Settings/DangerZone'
import Switch from '~app/components/Switch'

import { ALL_IN_ONE_PAGE_ID } from '~app/consts'
import {
  UserConfig,
  getUserConfig,
  updateUserConfig,
  CustomApiConfig,
} from '~services/user-config'
import { getVersion } from '~utils'
import PagePanel from '../components/Page'
import { getCompanyProfileConfigs, getCompanyProfileState, CompanyProfileStatus } from '~services/company-profile'
import OldStorageNotification from '~app/components/Settings/OldStorageNotification'


const ChatBotSettingPanel: FC<PropsWithChildren<{ title: string }>> = (props) => {
  return (
    <div className="p-3 min-w-[600px] flex-1 max-w-[800px] border border-gray-500 shadow-md rounded-lg hover:shadow-lg transition-shadow">
      <p className="font-bold text-md">{props.title}</p>
      {props.children}
    </div>
  )
}

function SettingPage() {
  const { t } = useTranslation()
  const [userConfig, setUserConfig] = useState<UserConfig | undefined>(undefined)
  const [dirty, setDirty] = useState(false)
  const [companyInfo, setCompanyInfo] = useState<{ name: string; version: string } | null>(null)
  const themeColor = useAtomValue(themeColorAtom)


  useEffect(() => {
    getUserConfig().then((config) => {
      setUserConfig(config);
    });

    // Check for active company profile from stored state
    const checkActiveCompanyProfile = async () => {
      try {
        const configs = await getCompanyProfileConfigs();
        for (const profile of configs) {
          const state = await getCompanyProfileState(profile.companyName);
          if (state && state.status === CompanyProfileStatus.IMPORTED) {
            setCompanyInfo({ name: profile.companyName, version: profile.version });
            return;
          }
        }
        setCompanyInfo(null);
      } catch (error) {
        console.error('Failed to check company profile:', error);
        setCompanyInfo(null);
      }
    };

    checkActiveCompanyProfile();
  }, [])

  const updateConfigValue = useCallback(
    (update: Partial<UserConfig>) => {
      setUserConfig(prevConfig => {
        if (prevConfig) {
          return { ...prevConfig, ...update }
        }
        return prevConfig
      })
      setDirty(true)
    },
    [], // 依存関係を削除
  )

  const save = useCallback(async () => {
    if (!userConfig) {
      toast.error(t('Failed to get current settings. Please try again.'));
      return;
    }

    try {
      // Request host permissions for all custom API hosts to prevent CORS issues
      await requestHostPermissions(userConfig.customApiConfigs || [], userConfig.providerConfigs || []);

      // userConfigのディープコピーを渡すことで副作用を防ぐ
      await updateUserConfig(cloneDeep(userConfig));
      setDirty(false);

      toast.success(t('Settings saved. API changes require reload'));
    } catch (error) {
      console.error('Failed to save settings:', error);
      toast.error(t('Failed to save settings. Please try again.'));
    }
  }, [userConfig, t]); // userConfig を依存配列に戻す

  const handleConfigReset = useCallback(() => {
    // Reload the page to reset the state
    window.location.reload();
  }, []);

  if (!userConfig) {
    return null
  }

  return (
    <PagePanel title={`${t('Settings')} (v${getVersion()})`}>
      {companyInfo && (
        <div className="mx-10 mt-3">
          {t('Company Profile Active')}: {companyInfo.name} (v{companyInfo.version})
        </div>
      )}
      <OldStorageNotification />
      <div className="flex flex-col gap-5 mt-3 mb-10 px-10" style={{ backgroundColor: themeColor ? `${themeColor}15` : 'rgba(17, 24, 39, 0.15)' }}>
        <ExportDataPanel userConfig={userConfig} updateConfigValue={updateConfigValue} />
        <div>
          <p className="font-bold mb-2 text-lg">{t('Startup page')}</p>
          <div className="w-[200px]">
            <Select
              options={[
                { name: 'All-In-One', value: ALL_IN_ONE_PAGE_ID },
                ...(userConfig.customApiConfigs || []).map((config: CustomApiConfig, index: number) => ({
                  name: config.name,
                  value: `custom-${index}`,
                })),
              ]}
              value={userConfig.startupPage}
              onChange={(v) => updateConfigValue({ startupPage: v as string })}
            />
          </div>
        </div>

        <div className="flex flex-col gap-4 w-full">
          <CustomAPISettings userConfig={userConfig} updateConfigValue={updateConfigValue} />
        </div>
        
{/* Temporarily hidden - Web Access Permissions
        <div className="flex flex-col gap-4 w-full">
          <p className="font-bold text-lg">{t('Web Access Permissions')}</p>
          <div className="p-3 w-full border border-gray-500 shadow-md rounded-lg hover:shadow-lg transition-shadow">
            <AllHostsPermissionPanel />
          </div>
        </div>
        */}
        <ShortcutPanel />
        <DangerZone onConfigReset={handleConfigReset} />
      </div>
      {dirty && (
        <motion.div
          className="sticky bottom-0 w-full bg-primary-background border-t-2 border-primary-border px-5 py-4 drop-shadow flex flex-row items-center justify-center"
          initial={{ y: 100 }}
          animate={{ y: 0 }}
          transition={{ type: 'tween', ease: 'easeInOut' }}
        >
          <Button color="primary" size="small" text={t('Save changes')} onClick={save} className="py-2" />
        </motion.div>
      )}
      <Toaster position="bottom-center" />
    </PagePanel>
  )
}

export default SettingPage
