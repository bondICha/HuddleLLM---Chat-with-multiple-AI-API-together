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
  onSubmit: (input: string, images?: File[], attachments?: { name: string; content: string }[], audioFiles?: File[], videoFiles?: File[], pdfFiles?: File[]) => void
  onHeightChange: (height: number) => void
  onBtwCommand?: (query: string) => void
}

const AllInOneInputArea: FC<Props> = memo(({
  layout,
  generating,
  supportImageInput,
  hasUserResized,
  onLayoutChange,
  onSubmit,
  onHeightChange,
  onBtwCommand,
}) => {
  const { t } = useTranslation()

  const [inputText, setInputText] = useAtom(allInOneInputTextAtom)
  const [inputAttachments, setInputAttachments] = useAtom(allInOneInputAttachmentsAtom)

  const handleSubmit = (input: string, images?: File[], attachments?: { name: string; content: string }[], audioFiles?: File[], videoFiles?: File[], pdfFiles?: File[]) => {
    const trimmed = input.trim()
    if (trimmed.startsWith('/btw')) {
      onBtwCommand?.(trimmed.slice(4).trim())
      return
    }
    onSubmit(input, images, attachments, audioFiles, videoFiles, pdfFiles)
  }

  return (
    <div className="flex flex-row gap-2 flex-grow min-h-0 overflow-hidden">
      <LayoutSwitch layout={layout} onChange={onLayoutChange} />
      <ChatMessageInput
        mode="full"
        className={`rounded-2xl bg-primary-background px-4 py-2 grow ${!hasUserResized ? 'max-h-full overflow-hidden' : ''}`}
        disabled={generating}
        onSubmit={handleSubmit}
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
  return (
    prevProps.generating === nextProps.generating &&
    prevProps.layout === nextProps.layout &&
    prevProps.supportImageInput === nextProps.supportImageInput &&
    prevProps.hasUserResized === nextProps.hasUserResized &&
    prevProps.onLayoutChange === nextProps.onLayoutChange &&
    prevProps.onBtwCommand === nextProps.onBtwCommand
  )
})

export default AllInOneInputArea
