import { FC, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import Dialog from '../Dialog'
import Button from '../Button'
import { updateSystemPromptToVersion, markSystemPromptVersionAsRead } from '~services/system-prompt-version'
import { SYSTEM_PROMPT_VERSION, SYSTEM_PROMPTS } from '~app/system-prompts'
import { getUserConfig } from '~services/user-config'
import { checkPromptSimilarity } from '~utils/string-similarity'
import toast from 'react-hot-toast'

interface Props {
  open: boolean
  onClose: () => void
}

const SystemPromptUpdateModal: FC<Props> = ({ open, onClose }) => {
  const { t } = useTranslation()
  const [isCustomized, setIsCustomized] = useState(false)
  const [currentPromptBackup, setCurrentPromptBackup] = useState('')

  useEffect(() => {
    if (open) {
      checkCustomization()
    }
  }, [open])

  const checkCustomization = async () => {
    try {
      const config = await getUserConfig()
      const currentPrompt = config.commonSystemMessage

      // Always backup current prompt
      setCurrentPromptBackup(currentPrompt)

      // Check similarity against all default prompts
      const similarity = checkPromptSimilarity(currentPrompt, SYSTEM_PROMPTS)

      // Show warning if similarity ≤ 98%
      setIsCustomized(similarity <= 0.98)
    } catch (error) {
      console.error('Failed to check customization:', error)
    }
  }

  const handleUpdate = async (lang: 'en' | 'ja' | 'zh-CN' | 'zh-TW') => {
    try {
      await updateSystemPromptToVersion(lang)
      toast.success(t('System prompt has been updated'))
      onClose()
    } catch (error) {
      console.error('Failed to update system prompt:', error)
      toast.error(t('Failed to update system prompt'))
    }
  }

  const handleSkip = async () => {
    try {
      await markSystemPromptVersionAsRead()
      onClose()
    } catch (error) {
      console.error('Failed to mark version as read:', error)
    }
  }

  return (
    <Dialog
      title={t('System Prompt Updated')}
      open={open}
      onClose={handleSkip}
    >
      <div className="space-y-4">
        <div className="space-y-2">
          <p>{t('Default system prompt has been updated to version')} {SYSTEM_PROMPT_VERSION}</p>
          <p className="text-sm opacity-70">
            {t('Would you like to update your Common System Message? Select your preferred language:')}
          </p>
        </div>

        {isCustomized && (
          <div className="space-y-3">
            <div className="p-3 bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-400 dark:border-yellow-600 rounded">
              <p className="text-sm font-semibold text-yellow-800 dark:text-yellow-200">
                ⚠️ {t('Warning: Your system prompt has been customized')}
              </p>
              <p className="text-xs mt-1 text-yellow-700 dark:text-yellow-300">
                {t('Updating will overwrite your changes. Your current prompt is backed up below.')}
              </p>
            </div>

            {currentPromptBackup && (
              <div className="space-y-1">
                <p className="text-xs font-semibold opacity-70">{t('Current Prompt Backup')}:</p>
                <div className="max-h-32 overflow-y-auto p-2 bg-gray-100 dark:bg-gray-800 rounded border border-gray-300 dark:border-gray-700 custom-scrollbar">
                  <pre className="text-xs whitespace-pre-wrap break-words">{currentPromptBackup}</pre>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          <Button
            text="English"
            color="primary"
            onClick={() => handleUpdate('en')}
          />
          <Button
            text="日本語"
            color="primary"
            onClick={() => handleUpdate('ja')}
          />
          <Button
            text="简体中文"
            color="primary"
            onClick={() => handleUpdate('zh-CN')}
          />
          <Button
            text="繁體中文"
            color="primary"
            onClick={() => handleUpdate('zh-TW')}
          />
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-gray-300 dark:border-gray-700">
          <Button text={t('Skip')} color="flat" onClick={handleSkip} />
        </div>
      </div>
    </Dialog>
  )
}

export default SystemPromptUpdateModal
