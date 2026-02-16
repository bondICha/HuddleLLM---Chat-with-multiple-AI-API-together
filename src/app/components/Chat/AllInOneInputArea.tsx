import { FC, memo } from 'react'
import { useAtom } from 'jotai'
import { useTranslation } from 'react-i18next'
import { allInOneInputTextAtom, allInOneInputAttachmentsAtom } from '~app/state'
import { Layout } from '~app/consts'
import Button from '../Button'
import ChatMessageInput from './ChatMessageInput'
import LayoutSwitch from './LayoutSwitch'

interface Props {
  layout: Layout
  generating: boolean
  supportImageInput?: boolean
  hasUserResized: boolean
  onLayoutChange: (layout: Layout) => void
  onSubmit: (input: string, images?: File[], attachments?: { name: string; content: string }[], audioFiles?: File[]) => void
  onHeightChange: (height: number) => void
}

const AllInOneInputArea: FC<Props> = memo(({
  layout,
  generating,
  supportImageInput,
  hasUserResized,
  onLayoutChange,
  onSubmit,
  onHeightChange
}) => {
  const { t } = useTranslation()

  // ここでatomを購読（このコンポーネント内のみ再レンダ）
  const [inputText, setInputText] = useAtom(allInOneInputTextAtom)
  const [inputAttachments, setInputAttachments] = useAtom(allInOneInputAttachmentsAtom)

  return (
    <div className="flex flex-row gap-2 flex-grow min-h-0 overflow-hidden">
      <LayoutSwitch layout={layout} onChange={onLayoutChange} />
      <ChatMessageInput
        mode="full"
        className={`rounded-2xl bg-primary-background px-4 py-2 grow ${!hasUserResized ? 'max-h-full overflow-hidden' : ''}`}
        disabled={generating}
        onSubmit={onSubmit}
        actionButton={!generating && <Button text={t('Send')} color="primary" type="submit" />}
        autoFocus={true}
        supportImageInput={supportImageInput}
        fullHeight={hasUserResized}
        maxRows={hasUserResized ? undefined : 12}
        onHeightChange={onHeightChange}
        controlledValue={inputText}
        onControlledValueChange={setInputText}
        controlledAttachments={inputAttachments}
        onControlledAttachmentsChange={setInputAttachments}
      />
    </div>
  )
}, (prevProps, nextProps) => {
  // propsが変わらなければ再レンダしない
  return (
    prevProps.generating === nextProps.generating &&
    prevProps.layout === nextProps.layout &&
    prevProps.supportImageInput === nextProps.supportImageInput &&
    prevProps.hasUserResized === nextProps.hasUserResized
  )
})

export default AllInOneInputArea
