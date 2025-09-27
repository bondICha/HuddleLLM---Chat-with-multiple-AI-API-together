import {
  FloatingFocusManager,
  FloatingList,
  autoUpdate,
  flip,
  offset,
  shift,
  useDismiss,
  useFloating,
  useInteractions,
  useListNavigation,
  useRole,
} from '@floating-ui/react'
import { fileOpen } from 'browser-fs-access'
import { cx } from '~/utils'
import { ClipboardEventHandler, FC, ReactNode, memo, useCallback, useMemo, useRef, useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { GoBook, GoImage, GoPaperclip, GoFile } from 'react-icons/go'
import { BiExpand } from 'react-icons/bi'
import { RiDeleteBackLine } from 'react-icons/ri'
import { Prompt } from '~services/prompts'
import Button from '../Button'
import PromptCombobox, { ComboboxContext } from '../PromptCombobox'
import PromptLibraryDialog from '../PromptLibrary/Dialog'
import ExpandableDialog from '../ExpandableDialog'
import TextInput from './TextInput';
import { processFile } from '~app/utils/file-processor';

interface Attachment {
  id: string;
  file: File;
  type: 'image' | 'text';
  content?: string;
}

interface Props {
  mode: 'full' | 'compact'
  onSubmit: (value: string, images?: File[], attachments?: { name: string; content: string }[]) => void
  className?: string
  disabled?: boolean
  placeholder?: string
  actionButton?: ReactNode | null
  autoFocus?: boolean
  supportImageInput?: boolean
  maxRows?: number
  fullHeight?: boolean
  onHeightChange?: (height: number) => void
  onVisibilityChange?: (visible: boolean) => void
}

const ChatMessageInput: FC<Props> = (props) => {
  const { t } = useTranslation()
  const {
    placeholder = t('Use / to select prompts, @URL to fetch content, Shift+Enter to add new line'),
    fullHeight = false,
    onHeightChange,
    onVisibilityChange,
    ...restProps
  } = props

  const [value, setValue] = useState('')
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [editingAttachment, setEditingAttachment] = useState<Attachment | null>(null);
  const formRef = useRef<HTMLFormElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const [isPromptLibraryDialogOpen, setIsPromptLibraryDialogOpen] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [isFocused, setIsFocused] = useState(false)

  const [activeIndex, setActiveIndex] = useState<number | null>(null)
  const [isComboboxOpen, setIsComboboxOpen] = useState(false)

  const { refs, floatingStyles, context } = useFloating({
    whileElementsMounted: autoUpdate,
    middleware: [offset(15), flip(), shift()],
    placement: 'top-start',
    open: isComboboxOpen,
    onOpenChange: setIsComboboxOpen,
  })

  const floatingListRef = useRef([])

  const handleSelect = useCallback((p: Prompt) => {
    if (p.id === 'PROMPT_LIBRARY') {
      setIsPromptLibraryDialogOpen(true)
      setIsComboboxOpen(false)
    } else {
      setValue(p.prompt)
      setIsComboboxOpen(false)
      inputRef.current?.focus()
    }
  }, [])

  const listNavigation = useListNavigation(context, {
    listRef: floatingListRef,
    activeIndex,
    onNavigate: setActiveIndex,
    loop: true,
    focusItemOnOpen: true,
    openOnArrowKeyDown: false,
  })

  const dismiss = useDismiss(context)
  const role = useRole(context, { role: 'listbox' })

  const { getReferenceProps, getFloatingProps, getItemProps } = useInteractions([role, dismiss, listNavigation])

  const comboboxContext = useMemo(
    () => ({
      activeIndex,
      getItemProps,
      handleSelect,
      setIsComboboxOpen: (open: boolean) => {
        setIsComboboxOpen(open)
        if (open) {

        } else {
          inputRef.current?.focus()
        }
      },
    }),
    [activeIndex, getItemProps, handleSelect],
  )

  const onFormSubmit = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const textAttachments = attachments
        .filter(a => a.type === 'text')
        .map(a => ({ name: a.file.name, content: a.content || '' }));
      const images = attachments.filter(a => a.type === 'image').map(a => a.file);

      if (value.trim() || images.length > 0 || textAttachments.length > 0) {
        props.onSubmit(value, images, textAttachments);
        setValue('');
        setAttachments([]);
      }
    },
    [attachments, props, value],
  );

  const onValueChange = useCallback((v: string) => {
    setValue(v)
    setIsComboboxOpen(v === '/')
  }, [])

  const modalSubmit = useCallback(() => {
    const textAttachments = attachments
      .filter(a => a.type === 'text')
      .map(a => ({ name: a.file.name, content: a.content || '' }));
    const images = attachments.filter(a => a.type === 'image').map(a => a.file);

    if (value.trim() || images.length > 0 || textAttachments.length > 0) {
      props.onSubmit(value, images, textAttachments);
      setValue('');
      setAttachments([]);
    }
    setIsExpanded(false)
  }, [value, attachments, props.onSubmit])

  const insertTextAtCursor = useCallback(
    (text: string) => {
      const cursorPosition = inputRef.current?.selectionStart || 0
      const textBeforeCursor = value.slice(0, cursorPosition)
      const textAfterCursor = value.slice(cursorPosition)
      setValue(`${textBeforeCursor}${text}${textAfterCursor}`)
      setIsPromptLibraryDialogOpen(false)
      inputRef.current?.focus()
    },
    [value],
  )

  const openPromptLibrary = useCallback(() => {
    setIsPromptLibraryDialogOpen(true)
  }, [])

  const handleFileSelect = useCallback(async (files: File[]) => {
    for (const file of files) {
      const result = await processFile(file);
      const id = `${file.name}-${file.lastModified}-${Math.random()}`;

      switch (result.type) {
        case 'image':
          setAttachments(prev => [...prev, { id, file, type: 'image' }]);
          break;
        case 'text':
          setAttachments(prev => [...prev, { id, file, type: result.type, content: result.content }]);
          break;
        case 'unsupported':
          alert(`DEBUG: Unsupported file: ${result.error}`);
          break; // Don't add unsupported files
      }
    }
    inputRef.current?.focus();
  }, []);

  const selectImage = useCallback(async () => {
    const files = await fileOpen({
      mimeTypes: ['image/jpg', 'image/jpeg', 'image/png', 'image/gif'],
      extensions: ['.jpg', '.jpeg', '.png', '.gif'],
      multiple: true,
    });
    handleFileSelect(files);
  }, [handleFileSelect]);

  const selectAttachments = useCallback(async () => {
    const files = await fileOpen({
      multiple: true,
    });
    handleFileSelect(files);
  }, [handleFileSelect]);

  const removeAttachment = useCallback((id: string) => {
    setAttachments(prev => prev.filter(a => a.id !== id));
  }, []);

  const onPaste: ClipboardEventHandler<HTMLTextAreaElement> = useCallback(
    (event) => {
      const items = Array.from(event.clipboardData.items);
      const files = items.map(item => item.getAsFile()).filter((f): f is File => !!f);
      
      if (files.length > 0) {
        event.preventDefault();
        handleFileSelect(files);
      }
    },
    [handleFileSelect],
  );

  const handleBlur = useCallback(() => {
    setTimeout(() => {
      if (!formRef.current?.contains(document.activeElement)) {
        setIsFocused(false)
      }
    }, 100)
  }, [])

  const isCompactMode = props.mode === 'compact'
  const hasContent = value.length > 0 || attachments.length > 0
  const shouldShowInput = !isCompactMode || (isCompactMode && (isFocused || hasContent))

  useEffect(() => {
    if (isCompactMode) {
      onVisibilityChange?.(shouldShowInput)
    }
  }, [isCompactMode, shouldShowInput, onVisibilityChange])

  return (
    <form
      className={cx(
        'flex flex-row items-center',
        fullHeight && 'h-full',
        props.className,
        !isCompactMode && 'gap-3',
        isCompactMode && (shouldShowInput ? 'gap-3' : 'gap-0'),
      )}
      onSubmit={onFormSubmit}
      ref={formRef}
      onFocus={() => setIsFocused(true)}
      onBlur={handleBlur}
    >
      <div className={cx('flex items-center gap-3', isCompactMode && !shouldShowInput && 'hidden')}>
        {props.mode === 'full' && (
          <>
            <GoBook
              size={22}
              className="cursor-pointer text-secondary-text hover:text-primary-text transition-colors duration-200"
              onClick={openPromptLibrary}
              title="Prompt library"
            />
            {isPromptLibraryDialogOpen && (
              <PromptLibraryDialog
                isOpen={true}
                onClose={() => setIsPromptLibraryDialogOpen(false)}
                insertPrompt={insertTextAtCursor}
              />
            )}
            <ComboboxContext.Provider value={comboboxContext}>
              {isComboboxOpen && (
                <FloatingFocusManager context={context} modal={false} initialFocus={-1}>
                  <div ref={refs.setFloating} style={{ ...floatingStyles }} {...getFloatingProps()}>
                    <FloatingList elementsRef={floatingListRef}>
                      <PromptCombobox />
                    </FloatingList>
                  </div>
                </FloatingFocusManager>
              )}
            </ComboboxContext.Provider>
            {props.supportImageInput && (
              <>
                <GoImage
                  size={22}
                  className="cursor-pointer text-secondary-text hover:text-primary-text transition-colors duration-200"
                  onClick={selectImage}
                  title={t('Image input')}
                />
                <GoPaperclip
                  size={22}
                  className="cursor-pointer text-secondary-text hover:text-primary-text transition-colors duration-200"
                  onClick={selectAttachments}
                  title={t('Attach file (Non-binary-text)')}
                />
              </>
            )}
          </>
        )}
        <BiExpand
          size={props.mode === 'compact' ? 16 : 22}
          className={cx(
            'cursor-pointer transition-colors duration-200',
            props.mode === 'compact'
              ? 'text-light-text hover:text-primary-text'
              : 'text-secondary-text hover:text-primary-text',
          )}
          onClick={() => setIsExpanded(true)}
          title={t('Compose Message')}
        />
      </div>
      <div
        className={cx('w-full flex flex-col justify-start', fullHeight && 'h-full')}
        ref={refs.setReference}
        {...getReferenceProps()}
      >
        {isCompactMode && !shouldShowInput ? null : attachments.length > 0 ? (
          <div className="flex flex-row items-center flex-wrap w-full mb-1 gap-2">
            {attachments.map((att) => (
              <div
                key={att.id}
                className="flex items-center gap-1 bg-primary-border dark:bg-secondary rounded-full px-2 py-1 border border-primary-border cursor-pointer"
                onClick={() => att.type === 'text' && setEditingAttachment(att)}
              >
                {att.type === 'image' && <GoImage size={12} className="text-secondary-text" />}
                {att.type === 'text' && <GoFile size={12} className="text-secondary-text" />}
                <span className="text-xs text-primary-text font-semibold cursor-default truncate max-w-[100px] ml-1">
                  {att.file.name}
                </span>
                {att.type === 'text' && att.content && (
                  <span className="text-xs text-secondary-text ml-1">
                    ({att.content.length} {t('chars')})
                  </span>
                )}
                <RiDeleteBackLine
                  size={12}
                  className="cursor-pointer text-secondary-text hover:text-primary-text transition-colors duration-200 hover:scale-110 ml-1"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeAttachment(att.id);
                  }}
                />
              </div>
            ))}
          </div>
        ) : null}
        <TextInput
          ref={inputRef}
          formref={formRef}
          name="input"
          disabled={props.disabled}
          placeholder={placeholder as string}
          value={value}
          onValueChange={onValueChange}
          autoFocus={props.autoFocus}
          onPaste={onPaste}
          maxRows={props.maxRows}
          fullHeight={fullHeight}
          onHeightChange={onHeightChange}
          className={cx(isCompactMode && !shouldShowInput && 'text-center')}
        />
      </div>
      {isCompactMode && !shouldShowInput
        ? null
        : props.actionButton || <Button text="-" className="invisible" size={props.mode === 'full' ? 'normal' : 'tiny'} />}

      {isExpanded && (
        <ExpandableDialog
          open={isExpanded}
          onClose={() => setIsExpanded(false)}
          title={t('Compose Message')}
          size="2xl"
          className="flex flex-col"
        >
          <div className="flex-grow p-4">
            <TextInput
              value={value}
              onValueChange={setValue}
              placeholder={t('Enter to add a new line, Shift+Enter to send.')}
              className="w-full h-full resize-none outline-none bg-transparent text-base"
              autoFocus
              fullHeight
              onSubmit={modalSubmit}
            />
          </div>
          <div className="flex justify-end p-4 border-t border-primary-border">
            <Button
              text={t('Send')}
              color="primary"
              onClick={modalSubmit}
            />
          </div>
        </ExpandableDialog>
      )}
      {editingAttachment && (
        <ExpandableDialog
          open={!!editingAttachment}
          onClose={() => setEditingAttachment(null)}
          title={editingAttachment.file.name}
          size="2xl"
          className="flex flex-col"
        >
          <div className="flex-grow p-4">
            <TextInput
              value={editingAttachment.content || ''}
              onValueChange={(newContent) => {
                setEditingAttachment(prev => prev ? { ...prev, content: newContent } : null);
              }}
              placeholder={t('Edit file content...')}
              className="w-full h-full resize-none outline-none bg-transparent text-base"
              autoFocus
              fullHeight
            />
          </div>
          <div className="flex justify-between items-center p-4 border-t border-primary-border">
            <span className="text-sm text-secondary-text">
              {t('Character count')}: {editingAttachment.content?.length || 0}
            </span>
            <Button
              text={t('Save')}
              color="primary"
              onClick={() => {
                if (editingAttachment) {
                  setAttachments(prev => prev.map(a => a.id === editingAttachment.id ? editingAttachment : a));
                }
                setEditingAttachment(null);
              }}
            />
          </div>
        </ExpandableDialog>
      )}
    </form>
  )
}

export default memo(ChatMessageInput)
