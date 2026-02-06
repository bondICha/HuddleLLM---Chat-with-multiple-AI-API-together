import { FC, memo, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import dayjs from 'dayjs'
import BotIcon from '~app/components/BotIcon'
import Tooltip from '~app/components/Tooltip'
import { cx } from '~utils'

type SessionListItem =
  | {
      type: 'sessionSnapshot'
      sessionUUID: string
      createdAt: number
      lastUpdated: number
      messageCount: number
      botIndices: number[]
      layout: string
      pairName?: string
      firstMessage?: string
      botResponses?: { botName: string; response: string; botIcon?: string }[]
      botNames?: string[]
      botIcons?: string[]
      _sessionKey: string
      _searchString: string
    }
  | {
      type: 'allInOneLegacy'
      sessionId: string
      createdAt: number
      lastUpdated: number
      messageCount: number
      botIndices: number[]
      layout: string
      pairName?: string
      firstMessage?: string
      botResponses?: { botName: string; response: string; botIcon?: string }[]
      botNames?: string[]
      botIcons?: string[]
      _sessionKey: string
      _searchString: string
    }
  | {
      type: 'single'
      botIndex: number
      conversationId: string
      createdAt: number
      lastUpdated: number
      messageCount: number
      firstMessage?: string
      lastMessage?: string
      botNames?: string[]
      botIcons?: string[]
      _sessionKey: string
      _searchString: string
    }

const omitBase64DataUrl = (value?: string) => {
  if (!value) return ''
  return value.replace(/(data:image\/[a-zA-Z0-9.+-]+;base64,)[A-Za-z0-9+/=_-]+/g, '$1[omitted]')
}

interface SessionCardProps {
  session: SessionListItem
  isSelected: boolean
  onToggleSelect: () => void
  onRestore: () => void
}

const SessionCard: FC<SessionCardProps> = memo(
  ({ session: s, isSelected, onToggleSelect, onRestore }) => {
    const { t } = useTranslation()

    const handleRestoreClick = useCallback(
      (e: React.MouseEvent) => {
        e.stopPropagation()
        onRestore()
      },
      [onRestore],
    )

    const displayFirstMessage = omitBase64DataUrl(s.firstMessage)
    const displayLastMessage = s.type === 'single' ? omitBase64DataUrl(s.lastMessage) : ''
    const displayBotResponses: { botName: string; response: string; botIcon?: string }[] | undefined =
      s.type === 'single'
        ? undefined
        : s.botResponses?.map((r) => ({
            ...r,
            response: omitBase64DataUrl(r.response),
          }))

    return (
      <div
        className={cx(
          'border border-primary-border rounded-2xl p-5 bg-primary-background/40 hover:bg-secondary/30 transition-all cursor-pointer',
          isSelected && 'bg-secondary/30 shadow-lg max-h-[50vh] overflow-y-auto custom-scrollbar',
        )}
        onClick={onToggleSelect}
      >
        <div className="flex flex-col gap-3">
          <div className="flex flex-row items-start gap-3 flex-wrap">
            <div className="min-w-0 flex-1">
              {/* User Query Section - Most Prominent */}
              {s.firstMessage && (
                <div className="mb-2 md:mb-3">
                  <div className="bg-blue-500/10 border-l-4 border-blue-500 rounded-r-lg px-3 py-2 md:px-4 md:py-3 overflow-x-hidden">
                    <div
                      className={cx(
                        'text-sm md:text-base font-semibold text-primary-text break-words whitespace-pre-wrap leading-snug md:leading-relaxed',
                        !isSelected && 'line-clamp-4',
                      )}
                    >
                      {displayFirstMessage}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Restore Button */}
            <div className="flex flex-row items-center justify-end gap-2 shrink-0">
              <Tooltip content={t('Restore Session')}>
                <button
                  className={cx(
                    'rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition-all font-medium',
                    isSelected ? 'px-4 py-2.5 text-base shadow-md' : 'px-3 py-2 text-sm',
                  )}
                  onClick={handleRestoreClick}
                >
                  {t('Restore Session')}
                </button>
              </Tooltip>
            </div>
          </div>

          <div className="min-w-0">
            {/* Metadata */}
            <div className="flex flex-row items-center gap-2 flex-wrap mb-2">
              <div className="text-xs text-primary-text opacity-85">
                {dayjs(s.lastUpdated).format('YYYY-MM-DD HH:mm')}
              </div>
              <span className="text-xs px-2 py-0.5 rounded-md bg-green-500/20 text-green-600 dark:text-green-400 font-semibold">
                {s.messageCount} msgs
              </span>
              {s.type !== 'single' && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-600 dark:text-blue-400">
                  {t('All-In-One')}
                </span>
              )}
            </div>

            {/* Bot Names as Tags */}
            {s.botNames && s.botNames.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {s.botNames.map((name, idx) => (
                  <span
                    key={idx}
                    className="text-xs px-2 py-0.5 rounded-md bg-secondary/60 text-primary-text opacity-90 flex items-center gap-1"
                  >
                    {s.botIcons && s.botIcons[idx] && <BotIcon iconName={s.botIcons[idx]} size={14} />}
                    {name}
                  </span>
                ))}
              </div>
            )}

            {/* AI Response Preview - Always visible (collapsed state) */}
            {!isSelected && (
              <>
                {s.type === 'single' && s.lastMessage && (
                  <div className="mt-2 flex items-start gap-1.5">
                    {s.botIcons && s.botIcons[0] && (
                      <BotIcon iconName={s.botIcons[0]} size={16} className="shrink-0 mt-0.5" />
                    )}
                    <div className="text-xs text-primary-text opacity-85 line-clamp-2">{displayLastMessage}</div>
                  </div>
                )}
                {s.type !== 'single' && displayBotResponses && displayBotResponses.length > 0 && (
                  <div className="mt-2 flex flex-col gap-1.5">
                    {displayBotResponses.map((r, idx) => (
                      <div key={r.botName + idx} className="flex items-start gap-1.5">
                        {r.botIcon && <BotIcon iconName={r.botIcon} size={16} className="shrink-0 mt-0.5" />}
                        <div className="text-xs text-primary-text opacity-85 line-clamp-2">
                          <span className="font-semibold">{r.botName}:</span> {r.response}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* Bot Responses Section (expanded state only) */}
            {isSelected && s.type === 'single' && s.lastMessage && (
              <div className="mt-3 pt-3 border-t border-primary-border/30">
                <div className="text-xs font-medium text-primary-text opacity-70 mb-2">{t('AI Response')}:</div>
                <div className="bg-green-500/10 border-l-2 border-green-500/50 rounded-r-lg px-3 py-2">
                  <div className="flex items-start gap-2">
                    {s.botIcons && s.botIcons[0] && (
                      <BotIcon iconName={s.botIcons[0]} size={18} className="shrink-0 mt-0.5" />
                    )}
                    <div className="text-sm text-primary-text opacity-90 break-words whitespace-pre-wrap leading-relaxed">
                      {displayLastMessage}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {isSelected && s.type !== 'single' && displayBotResponses && displayBotResponses.length > 0 && (
              <div className="mt-3 pt-3 border-t border-primary-border/30">
                <div className="text-xs font-medium text-primary-text opacity-70 mb-2">{t('AI Responses')}:</div>
                <div className="flex flex-wrap gap-3">
                  {displayBotResponses.map((r, idx) => (
                    <div
                      key={r.botName + idx}
                      className="bg-green-500/10 border-l-2 border-green-500/50 rounded-r-lg px-3 py-2 min-w-[240px] flex-1"
                    >
                      <div className="flex items-center gap-1.5 mb-1">
                        {r.botIcon && <BotIcon iconName={r.botIcon} size={16} />}
                        <div className="text-xs font-semibold text-green-600 dark:text-green-400">{r.botName}</div>
                      </div>
                      <div className="text-sm text-primary-text opacity-90 break-words whitespace-pre-wrap leading-relaxed">
                        {r.response}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  },
  (prevProps, nextProps) => {
    // Custom comparison for optimal memoization
    return (
      prevProps.session._sessionKey === nextProps.session._sessionKey && prevProps.isSelected === nextProps.isSelected
    )
  },
)

SessionCard.displayName = 'SessionCard'

export default SessionCard
export type { SessionListItem }
