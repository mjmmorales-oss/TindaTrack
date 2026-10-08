import { useState, useEffect } from 'react'
import { Outlet } from 'react-router'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/layout/AppSidebar'
import { Topbar } from '@/components/layout/Topbar'
import { MobileBottomNav } from '@/components/layout/MobileBottomNav'
import { CommandPalette } from '@/components/layout/CommandPalette'
import { ShortcutsHelpDialog } from '@/components/layout/ShortcutsHelpDialog'

export function AppLayout() {
  const [cmdOpen, setCmdOpen] = useState(false)
  const [shortcutsOpen, setShortcutsOpen] = useState(false)

  useEffect(() => {
    const handleOpenCmd = () => setCmdOpen(true)
    const handleOpenShortcuts = () => setShortcutsOpen(true)
    window.addEventListener('app:open-command-palette', handleOpenCmd)
    window.addEventListener('app:open-shortcuts', handleOpenShortcuts)
    return () => {
      window.removeEventListener('app:open-command-palette', handleOpenCmd)
      window.removeEventListener('app:open-shortcuts', handleOpenShortcuts)
    }
  }, [])

  return (
    <SidebarProvider defaultOpen={true}>
      <AppSidebar />
      <SidebarInset className="flex min-h-screen flex-col">
        <Topbar />
        <main className="flex-1 pb-24 md:pb-8">
          <Outlet />
        </main>
        <MobileBottomNav />
      </SidebarInset>

      <CommandPalette open={cmdOpen} onOpenChange={setCmdOpen} />
      <ShortcutsHelpDialog open={shortcutsOpen} onOpenChange={setShortcutsOpen} />
    </SidebarProvider>
  )
}
