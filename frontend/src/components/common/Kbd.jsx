import { cn } from '@/lib/utils'

export function Kbd({ className, children, ...props }) {
  return (
    <kbd
      className={cn(
        'border-border bg-muted text-muted-foreground pointer-events-none inline-flex h-5 items-center gap-1 rounded border px-1.5 font-mono text-[10px] font-medium opacity-100 select-none',
        className,
      )}
      {...props}
    >
      {children}
    </kbd>
  )
}
