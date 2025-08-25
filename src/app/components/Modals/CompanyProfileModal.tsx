import { FC } from 'react'
import { useTranslation } from 'react-i18next'
import { useAtom, useAtomValue } from 'jotai'
import Button from '../Button'
import Dialog from '../Dialog'
import { companyProfileModalAtom, detectedCompanyAtom } from '~app/state'
import { setCompanyProfileState, CompanyProfileStatus } from '~services/company-profile'

const CompanyProfileModal: FC = () => {
  const { t } = useTranslation()
  const [open, setOpen] = useAtom(companyProfileModalAtom)
  const detectedCompany = useAtomValue(detectedCompanyAtom)

  if (!detectedCompany) return null

  const handleClose = async () => {
    setOpen(false)
    // 「もう一度確認」を選択した場合は未確認状態のまま
    await setCompanyProfileState({
      companyName: detectedCompany.companyName,
      version: detectedCompany.version,
      status: CompanyProfileStatus.UNCONFIRMED,
      lastChecked: Date.now()
    })
  }

  const handleConfirm = async () => {
    setOpen(false)
    // Use window.location instead of navigate to avoid router context issues
    const params = new URLSearchParams({
      autoImport: 'templateData',
      company: detectedCompany.companyName
    })
    window.location.href = `#/setting?${params.toString()}`
  }

  const handleReject = async () => {
    setOpen(false)
    // 拒否した場合は拒否状態として保存
    await setCompanyProfileState({
      companyName: detectedCompany.companyName,
      version: detectedCompany.version,
      status: CompanyProfileStatus.REJECTED,
      lastChecked: Date.now()
    })
  }

  return (
    <Dialog open={open} onClose={handleClose} title={`${detectedCompany.companyName}${t('company_profile_detected')}`}>
      <div className="mb-6 px-2">
        <p className="text-sm text-gray-500 mb-2">{`${detectedCompany.companyName}${t('apply_company_profile')}`}</p>
        <p className="text-xs text-gray-400">バージョン: {detectedCompany.version}</p>
      </div>
      <div className="flex justify-between items-center gap-4 mt-6 px-2">
        <button 
          onClick={handleReject}
          className="text-xs text-gray-400 hover:text-gray-600 underline"
        >
          {t('Reject')}
        </button>
        <div className="flex gap-2">
          <Button text={t('Ask me again')} onClick={handleClose} color="flat" />
          <Button text={t('OK')} onClick={handleConfirm} color="primary" />
        </div>
      </div>
    </Dialog>
  )
}

export default CompanyProfileModal