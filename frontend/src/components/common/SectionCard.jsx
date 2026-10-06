import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { cn } from '@/lib/utils'

/**
 * Standard section container card with header, action buttons, content, and optional footer.
 *
 * @component
 * @param {object} props
 * @param {string} props.title - Card header title
 * @param {string} [props.description] - Card header subtitle or guidance
 * @param {React.ReactNode} [props.actions] - Header actions (e.g. Add button, menu)
 * @param {React.ReactNode} props.children - Main section content
 * @param {React.ReactNode} [props.footer] - Optional card footer slot
 * @param {string} [props.className] - Additional classes
 * @returns {React.JSX.Element}
 */
export function SectionCard({
  title,
  description,
  actions,
  children,
  footer,
  className,
}) {
  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-4">
        <div className="space-y-1">
          <CardTitle className="text-base font-semibold">{title}</CardTitle>
          {description && (
            <CardDescription className="text-xs">{description}</CardDescription>
          )}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </CardHeader>
      <CardContent>{children}</CardContent>
      {footer && (
        <CardFooter className="bg-muted/20 border-t px-6 py-3">
          {footer}
        </CardFooter>
      )}
    </Card>
  )
}

export default SectionCard
