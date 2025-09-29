import { FC, useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { UserConfig, ProviderConfig, CustomApiProvider } from '~services/user-config';
import Dialog from '../Dialog';
import Button from '../Button';
import Blockquote from './Blockquote';
import { BiInfoCircle } from 'react-icons/bi';
import { Input, Textarea } from '../Input';
import { DEFAULT_SYSTEM_MESSAGE } from '~app/consts';
import ApiProviderSettings from './ApiProviderSettings';
import ChatbotSettings from './ChatbotSettings';
import Switch from '../Switch';
import HostSearchInput from './HostSearchInput';

interface Props {
  userConfig: UserConfig;
  updateConfigValue: (update: Partial<UserConfig>) => void;
}

const CustomAPISettings: FC<Props> = ({ userConfig, updateConfigValue }) => {
  const { t } = useTranslation();
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [showVariables, setShowVariables] = useState(false);

  const resetToDefaultSystemMessage = () => {
    updateConfigValue({ commonSystemMessage: DEFAULT_SYSTEM_MESSAGE });
    setShowResetDialog(false);
    toast.success(t('Common System Message has been reset to default'));
  };

  const formRowClass = "flex flex-col gap-2";
  const labelClass = "font-medium text-sm";

  return (
    <>
      <div className="flex flex-col gap-4 rounded-lg relative">
        <div className="absolute inset-0 bg-white/10 dark:bg-black/20 rounded-lg pointer-events-none"></div>
        <div className="relative">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold">{t('Chatbots configuration')}</h2>
          </div>
          <div className="flex flex-col gap-3">
            <div className="p-4 rounded-lg bg-white/20 dark:bg-black/20 border border-gray-300 dark:border-gray-700 space-y-4">
              <h3 className="text-md font-semibold">{t('Common Settings')}</h3>
              <Blockquote>{t('These settings are used by all custom chatbots. Individual chatbot settings will override these.')}</Blockquote>
              <div className="space-y-3">
                {/* Common System Message */}
                <div className={formRowClass}>
                  <div className="flex items-center justify-between">
                    <p className={labelClass}>{t('Common System Message')}</p>
                  </div>
                  <div className="w-full">
                    <button onClick={() => setShowVariables(!showVariables)} className="flex items-center gap-1 opacity-70 hover:opacity-90 cursor-pointer transition-opacity mb-2">
                      <BiInfoCircle className="w-4 h-4" />
                      <span className="text-xs">{showVariables ? t('Hide') : t('Show available variables')}</span>
                    </button>
                    <div className="flex flex-col gap-2 w-full">
                      {showVariables && (
                        <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border">
                          <p className="font-medium mb-2 text-sm">{t('Variables description')}</p>
                          <div className="grid grid-cols-1 gap-1 text-xs">
                            <div className="flex items-center gap-2">
                              <code className="bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 px-1 rounded">{'{current_date}'}</code>
                              <span className="opacity-70">- Current date (YYYY-MM-DD)</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <code className="bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 px-1 rounded">{'{current_time}'}</code>
                              <span className="opacity-70">- Current time (HH:MM:SS)</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <code className="bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 px-1 rounded">{'{modelname}'}</code>
                              <span className="opacity-70">- AI model name</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <code className="bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 px-1 rounded">{'{chatbotname}'}</code>
                              <span className="opacity-70">- Chatbot display name</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <code className="bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 px-1 rounded">{'{language}'}</code>
                              <span className="opacity-70">- User language setting</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <code className="bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 px-1 rounded">{'{timezone}'}</code>
                              <span className="opacity-70">- User timezone</span>
                            </div>
                          </div>
                        </div>
                      )}
                      <Textarea
                        className='w-full'
                        maxRows={5}
                        value={userConfig.commonSystemMessage}
                        onChange={(e) => updateConfigValue({ commonSystemMessage: e.currentTarget.value })}
                      />
                      <Button
                        text={t('Reset Common system prompt to default')}
                        color="flat"
                        size="small"
                        onClick={() => setShowResetDialog(true)}
                        className="self-start"
                      />
                    </div>
                  </div>
                </div>

                {/* Common API Key */}
                <div className={formRowClass}>
                  <p className={labelClass}>{t('Common API Key')}</p>
                  <div className="flex-1">
                    <Input
                      className="w-full"
                      placeholder="AIxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                      value={userConfig.customApiKey}
                      onChange={(e) => updateConfigValue({ customApiKey: e.currentTarget.value })}
                      type="password"
                    />
                  </div>
                  <Blockquote className="mt-1">{t('Your keys are stored locally')}</Blockquote>
                </div>

                {/* Common API Host */}
                <div className={formRowClass}>
                  <div className="flex items-center justify-between">
                    <p className={labelClass}>
                      {t(userConfig.isCustomApiHostFullPath ? 'API Endpoint (Full Path)' : 'Common API Host')}
                    </p>
                    <div className="flex items-center gap-1">
                      <span className="text-sm">{t('Full Path')}</span>
                      <span className="cursor-help group relative">ⓘ
                        <div className="absolute top-full right-0 mt-2 w-72 hidden group-hover:block bg-gray-900 dark:bg-gray-800 text-white text-xs p-2 rounded shadow-lg z-50">
                          {t('Full Path Tooltip Common')}
                        </div>
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <HostSearchInput
                      className="flex-1"
                      placeholder={userConfig.isCustomApiHostFullPath ? t('Host Placeholder Full Path Common') : "https://api.openai.com"}
                      value={userConfig.customApiHost}
                      onChange={(value) => updateConfigValue({ customApiHost: value })}
                    />
                    <Switch
                      checked={userConfig.isCustomApiHostFullPath ?? false}
                      onChange={(checked) => updateConfigValue({ isCustomApiHostFullPath: checked })}
                    />
                  </div>
                </div>
              </div>
            </div>

            <ApiProviderSettings userConfig={userConfig} updateConfigValue={updateConfigValue} />

            <hr className="border-gray-300 dark:border-gray-700" />

            <ChatbotSettings userConfig={userConfig} updateConfigValue={updateConfigValue} />

          </div>
        </div>
      </div>

      <Dialog title={t('Confirm Reset')} open={showResetDialog} onClose={() => setShowResetDialog(false)}>
        <div className="space-y-4">
          <p>{t('Are you sure you want to reset the Common System Message to the default value? This action cannot be undone.')}</p>
          <div className="flex justify-end gap-2">
            <Button text={t('Cancel')} color="flat" onClick={() => setShowResetDialog(false)} />
            <Button text={t('Reset to Default')} color="primary" onClick={resetToDefaultSystemMessage} />
          </div>
        </div>
      </Dialog>
    </>
  );
};

export default CustomAPISettings;