import { forwardRef, useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'

/**
 * Calculates a basic 0-4 password strength score.
 * @param {string} pass
 * @returns {{ score: number, label: string, color: string }}
 */
function getPasswordStrength(pass = '') {
  if (!pass) return { score: 0, label: '', color: '' }
  let score = 0
  if (pass.length >= 8) score++
  if (/[A-Z]/.test(pass)) score++
  if (/[0-9]/.test(pass)) score++
  if (/[^A-Za-z0-9]/.test(pass)) score++

  switch (score) {
    case 1:
      return { score: 25, label: 'Mahina (Weak)', color: 'bg-destructive' }
    case 2:
      return { score: 50, label: 'Katamtaman (Fair)', color: 'bg-warning' }
    case 3:
      return { score: 75, label: 'Mabuti (Good)', color: 'bg-info' }
    case 4:
      return { score: 100, label: 'Matibay (Strong)', color: 'bg-success' }
    default:
      return {
        score: 15,
        label: 'Napakalambot (Very weak)',
        color: 'bg-destructive',
      }
  }
}

/**
 * PasswordInput component with eye toggle and optional strength meter.
 *
 * @component
 * @param {object} props
 * @param {string} [props.className] - Additional class names
 * @param {boolean} [props.showStrength=false] - Whether to display a password strength meter
 * @param {string} [props.value] - Controlled input value for strength calculation
 * @param {React.Ref<HTMLInputElement>} ref - Input forward reference
 * @returns {React.JSX.Element}
 */
export const PasswordInput = forwardRef(
  ({ className, showStrength = false, hasError, value, onChange, ...props }, ref) => {
    const [showPassword, setShowPassword] = useState(false)
    const [internalVal, setInternalVal] = useState('')

    const currentVal = value !== undefined ? String(value) : internalVal
    const strengthInfo = showStrength ? getPasswordStrength(currentVal) : null

    const handleChange = (e) => {
      if (value === undefined) {
        setInternalVal(e.target.value)
      }
      onChange?.(e)
    }

    return (
      <div className="w-full space-y-1.5">
        <div className="relative">
          <Input
            type={showPassword ? 'text' : 'password'}
            className={cn('pr-10', className)}
            ref={ref}
            value={value}
            onChange={handleChange}
            aria-invalid={hasError ? true : props['aria-invalid']}
            {...props}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-foreground absolute top-0 right-0 h-full px-3 py-2 hover:bg-transparent"
            onClick={() => setShowPassword((prev) => !prev)}
            tabIndex={-1}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Eye className="h-4 w-4" aria-hidden="true" />
            )}
          </Button>
        </div>

        {showStrength && currentVal.length > 0 && (
          <div className="space-y-1 pt-1">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Lakas ng Password:</span>
              <span className="text-foreground font-medium">
                {strengthInfo.label}
              </span>
            </div>
            <Progress
              value={strengthInfo.score}
              className={cn(
                'h-1.5',
                strengthInfo.color === 'bg-destructive' && '[&>div]:bg-destructive',
                strengthInfo.color === 'bg-warning' && '[&>div]:bg-warning',
                strengthInfo.color === 'bg-highlight' && '[&>div]:bg-highlight',
                strengthInfo.color === 'bg-success' && '[&>div]:bg-success',
              )}
            />
          </div>
        )}
      </div>
    )
  },
)

PasswordInput.displayName = 'PasswordInput'
export default PasswordInput
