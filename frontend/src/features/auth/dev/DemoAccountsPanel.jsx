import { KeyRound, UserCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DEMO_ACCOUNTS } from './demoAccounts'

/**
 * Dev-only quick login panel for demo accounts.
 *
 * @param {object} props
 * @param {(account: { email: string, password: string }) => void} props.onSelectAccount
 */
export function DemoAccountsPanel({ onSelectAccount }) {
  return (
    <div className="border-border/80 bg-muted/40 space-y-2 rounded-lg border border-dashed p-3 text-xs">
      <span className="text-foreground flex items-center gap-1.5 font-semibold">
        <KeyRound className="text-primary h-3.5 w-3.5" />
        Demo Credentials:
      </span>
      <div className="flex gap-2">
        {DEMO_ACCOUNTS.map((acc) => (
          <Button
            key={acc.email}
            type="button"
            variant="outline"
            size="sm"
            className="h-7 flex-1 gap-1 text-xs"
            onClick={() => onSelectAccount(acc)}
          >
            <UserCheck className="text-primary h-3 w-3" />
            {acc.label}
          </Button>
        ))}
      </div>
    </div>
  )
}

export default DemoAccountsPanel
