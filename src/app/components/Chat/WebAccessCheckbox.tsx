import { Switch } from '@headlessui/react'
import { FC, memo, useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { requestHostPermissions } from '~app/utils/permissions'
import { getUserConfig, updateUserConfig, CustomApiConfig } from '~services/user-config'
import { getCustomBot } from '~app/bots'
import Toggle from '../Toggle'

interface Props {
  index: number
  disabled?: boolean // チャット開始後は無効化
}

const WebAccessCheckbox: FC<Props> = (props) => {
  const { t } = useTranslation()
  const [checked, setChecked] = useState<boolean>(false) // 初期値は false

  useEffect(() => {
    const fetchWebAccessState = async () => {
      const config = await getUserConfig();
      const customConfig = config.customApiConfigs?.[props.index];
      if (customConfig && typeof customConfig.webAccess === 'boolean') {
        setChecked(customConfig.webAccess);
      } else {
        setChecked(false); // デフォルトは false
      }
    };
    fetchWebAccessState();
  }, [props.index]);

  const onToggle = useCallback(
    async (newValue: boolean) => {
      if (props.disabled) {
        return;
      }
      
      if (newValue && !(await requestHostPermissions(['https://*/*', 'http://*/*']))) {
        return;
      }
      
      const config = await getUserConfig();
      const updatedCustomApiConfigs = [...(config.customApiConfigs || [])];
      const customConfigToUpdate = updatedCustomApiConfigs[props.index];

      if (customConfigToUpdate) {
        const updatedConfig: CustomApiConfig = {
          ...customConfigToUpdate,
          webAccess: newValue,
        };
        updatedCustomApiConfigs[props.index] = updatedConfig;
        updateUserConfig({ customApiConfigs: updatedCustomApiConfigs });
        
        // Update system prompt dynamically without recreating bot
        try {
          const bot = getCustomBot(props.index);
          
          if (bot && typeof bot.updateSystemPrompt === 'function') {
            await bot.updateSystemPrompt();
            setChecked(newValue);
          } else {
            // Bot not found or no updateSystemPrompt method - revert toggle
            setChecked(!newValue);
            // Also revert the config
            const revertConfig: CustomApiConfig = {
              ...customConfigToUpdate,
              webAccess: !newValue,
            };
            updatedCustomApiConfigs[props.index] = revertConfig;
            updateUserConfig({ customApiConfigs: updatedCustomApiConfigs });
          }
        } catch (error) {
          setChecked(!newValue);
          const revertConfig: CustomApiConfig = {
            ...customConfigToUpdate,
            webAccess: !newValue,
          };
          updatedCustomApiConfigs[props.index] = revertConfig;
          updateUserConfig({ customApiConfigs: updatedCustomApiConfigs });
        }
      }
    },
    [props.index, props.disabled],
  )

  return (
    <div 
      className={`flex flex-row items-center gap-2 shrink-0 group ${props.disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
      title={props.disabled ? t('Web Access can only be changed before starting conversation. Clear chat to enable switching.') : undefined}
    >
      <Switch.Group>
        <div className="flex flex-row items-center gap-2">
          <Toggle 
            enabled={checked} 
            onChange={onToggle}
            disabled={props.disabled}
          />
          <Switch.Label className={`text-[13px] whitespace-nowrap font-medium select-none ${props.disabled ? 'text-gray-400' : 'text-light-text'}`}>
            {t('Web Access')}
          </Switch.Label>
        </div>
      </Switch.Group>
    </div>
  )
}

export default memo(WebAccessCheckbox)
