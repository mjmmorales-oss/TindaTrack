import { Outlet } from 'react-router'
import { ModeToggle } from '@/components/common/ModeToggle'

export function MinimalLayout() {
  return (
    <div className="bg-background relative flex min-h-screen flex-col items-center justify-center px-4 py-12">
      <div className="absolute top-4 right-4">
        <ModeToggle />
      </div>
      <div className="w-full max-w-md text-center">
        <Outlet />
      </div>
    </div>
  )
}
