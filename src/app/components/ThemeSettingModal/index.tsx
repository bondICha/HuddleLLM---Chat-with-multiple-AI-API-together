import { Link } from '@tanstack/react-router'
import { cx } from '~/utils'
import { useAtom } from 'jotai'
import { ComponentPropsWithoutRef, FC, useCallback, useEffect, useMemo, useState } from 'react'
import { ColorResult, TwitterPicker } from 'react-color'
import { useTranslation } from 'react-i18next'
import Browser from 'webextension-polyfill'
import { followArcThemeAtom, themeColorAtom, sidebarDisplayModeAtom } from '~app/state'
import { applyThemeMode } from '~app/utils/color-scheme'
import { isArcBrowser } from '~app/utils/env'
import { getLanguage, setLanguage } from '~services/storage/language'
import { ThemeMode, getUserThemeMode, setUserThemeMode } from '~services/theme'
import { FontType } from '~services/user-config'
import { useUserConfig } from '~app/hooks/use-user-config'
import { updateUserConfig } from '~services/user-config'
import { languageCodes } from '../../i18n'
import Dialog from '../Dialog'
import Select from '../Select'

const Button: FC<ComponentPropsWithoutRef<'button'>> = (props) => {
  const { className, ...extraProps } = props
  return (
    <button
      type="button"
      className={cx(
        'relative inline-flex items-center bg-primary-background px-3 py-2 text-sm font-semibold text-primary-text ring-1 ring-inset ring-gray-300 hover:opacity-80 focus:z-10',
        className,
      )}
      {...extraProps}
    />
  )
}

const THEME_COLORS = [
  '#7EB8D6',
  '#FF6900',
  '#7BDCB5',
  '#00D084',
  '#8ED1FC',
  '#0693E3',
  '#ABB8C3',
  '#EB144C',
  '#F78DA7',
  '#555555',
]

interface Props {
  open: boolean
  onClose: () => void
}

const ThemeSettingModal: FC<Props> = (props) => {
  const { t, i18n } = useTranslation()
  const [themeColor, setThemeColor] = useAtom(themeColorAtom)
  const [themeMode, setThemeMode] = useState(getUserThemeMode())
  const [followArcTheme, setFollowArcTheme] = useAtom(followArcThemeAtom)
  const [sidebarDisplayMode, setSidebarDisplayMode] = useAtom(sidebarDisplayModeAtom)
  const [zoomLevel, setZoomLevel] = useState<number | null>(null)
  const [lang, setLang] = useState(() => getLanguage() || 'auto')
  const userConfig = useUserConfig()
  const [fontType, setFontType] = useState<FontType>(userConfig?.fontType || FontType.SERIF)

  const languageOptions = useMemo(() => {
    const nameGenerator = new Intl.DisplayNames('en', { type: 'language' })
    return languageCodes.map((code) => {
      let name: string
      if (code === 'zh-CN') {
        name = '简体中文'
      } else if (code === 'zh-TW') {
        name = '繁體中文'
      } else {
        name = nameGenerator.of(code) || code
      }
      return { name, value: code }
    })
  }, [])

  useEffect(() => {
    Browser.tabs.getZoom().then((zoom) => setZoomLevel(zoom))
  }, [])

  const updateZoomLevel = useCallback(
    (op: '+' | '-') => {
      if (!zoomLevel) {
        return
      }
      const newZoom = op === '+' ? zoomLevel + 0.1 : zoomLevel - 0.1
      if (newZoom < 0.7 || newZoom > 1.2) {
        return
      }
      Browser.tabs.setZoom(newZoom)
      setZoomLevel(newZoom)
    },
    [zoomLevel],
  )

  const onThemeModeChange = useCallback((mode: ThemeMode) => {
    setUserThemeMode(mode)
    setThemeMode(mode)
    applyThemeMode(mode)
  }, [])

  const onThemeColorChange = useCallback(
    (color: ColorResult) => {
      setThemeColor(color.hex)
      document.documentElement.style.setProperty('--theme-color', color.hex)
      document.documentElement.style.setProperty('--theme-color-muted', `${color.hex}33`)
    },
    [setThemeColor],
  )

  const onLanguageChange = useCallback(
    (lang: string) => {
      setLang(lang)
      setLanguage(lang === 'auto' ? undefined : lang)
      i18n.changeLanguage(lang === 'auto' ? undefined : lang)
    },
    [i18n],
  )

  const onFontTypeChange = useCallback(
    (fontType: FontType) => {
      setFontType(fontType)
      updateUserConfig({ fontType })
    },
    [],
  )

  return (
    <Dialog
      title={t('Display Settings')}
      open={props.open}
      onClose={props.onClose}
      className="rounded-xl w-[600px] min-h-[300px]"
    >
      <div className="p-5 pb-10 flex flex-col gap-5">
        <div className="w-[300px]">
          <p className="font-bold text-lg mb-3">{t('Theme Mode')}</p>
          <Select
            options={[
              { name: t('Auto'), value: ThemeMode.Auto },
              { name: t('Light'), value: ThemeMode.Light },
              { name: t('Dark'), value: ThemeMode.Dark },
            ]}
            value={themeMode}
            onChange={onThemeModeChange}
          />
        </div>
        <div>
          <p className="font-bold text-lg mb-3">{t('Theme Color')}</p>
          <div className="flex flex-col gap-3">
            {isArcBrowser() && (
              <div className="flex flex-row items-center gap-2">
                <input
                  type="checkbox"
                  id="arc-theme-check"
                  checked={followArcTheme}
                  onChange={(e) => setFollowArcTheme(e.target.checked)}
                  disabled={false}
                />
                <label htmlFor="arc-theme-check">{t('Follow Arc browser theme')}</label>
              </div>
            )}
            {!followArcTheme && (
              <TwitterPicker
                colors={THEME_COLORS}
                color={themeColor}
                onChange={onThemeColorChange}
                triangle="hide"
                width="300px"
              />
            )}
          </div>
        </div>
        <div>
          <p className="font-bold text-lg mb-3">{t('Display size')}</p>
          <span className="isolate inline-flex rounded-md shadow-sm">
            <Button className="rounded-l-md" onClick={() => updateZoomLevel('-')}>
              -
            </Button>
            <Button className="-ml-px cursor-default">{zoomLevel === null ? '-' : Math.floor(zoomLevel * 100)}%</Button>
            <Button className="-ml-px rounded-r-md" onClick={() => updateZoomLevel('+')}>
              +
            </Button>
          </span>
        </div>
        <div className="w-[300px]">
          <p className="font-bold text-lg mb-3">{t('Language')}</p>
          <Select
            options={[{ name: t('Auto'), value: 'auto' }, { name: 'English', value: 'en' }, ...languageOptions]}
            value={lang}
            onChange={onLanguageChange}
            position="top"
          />
        </div>
        <div className="w-[300px]">
          <p className="font-bold text-lg mb-3">{t('Sidebar Display Mode')}</p>
          <Select
            options={[
              { name: t('Auto (Dynamic based on screen size)'), value: 'auto' },
              { name: t('Drawer Menu'), value: 'hamburger' },
              { name: t('Fixed Sidebar'), value: 'fixed' },
            ]}
            value={sidebarDisplayMode}
            onChange={(mode: 'auto' | 'hamburger' | 'fixed') => setSidebarDisplayMode(mode)}
            position="top"
          />
        </div>
        <div className="w-[300px]">
          <p className="font-bold text-lg mb-3">{t('Font Type')}</p>
          <Select
            options={[
              { name: t('Sans-serif (Gothic)'), value: FontType.SANS },
              { name: t('Serif (Mincho)'), value: FontType.SERIF },
            ]}
            value={fontType}
            onChange={onFontTypeChange}
            position="top"
          />
        </div>
      </div>
    </Dialog>
  )
}

export default ThemeSettingModal
