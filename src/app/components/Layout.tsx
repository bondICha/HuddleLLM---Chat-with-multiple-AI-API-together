import { Outlet } from '@tanstack/react-router'
import { useAtomValue } from 'jotai'
import { followArcThemeAtom, themeColorAtom } from '~app/state'
import ReleaseNotesModal from './Modals/ReleaseNotesModal'
import Sidebar from './Sidebar'

function Layout() {
  const themeColor = useAtomValue(themeColorAtom)
  const followArcTheme = useAtomValue(followArcThemeAtom)
  return (
    <main
      className="h-screen grid grid-cols-[auto_1fr]"
      style={{ backgroundColor: followArcTheme ? 'var(--arc-palette-foregroundPrimary)' : themeColor }}
    >
      <Sidebar />
      <div className="px-[5px] py-1 h-full overflow-hidden">
        <Outlet />
      </div>
      <ReleaseNotesModal />
    </main>
  )
}

export default Layout
