import { useState, lazy, Suspense } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { AlertCircle, Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { PasswordInput } from '@/components/forms/PasswordInput'
import { useAuth } from '@/hooks/useAuth'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { getErrorMessage, getFieldErrors } from '@/lib/errors'
import { notify } from '@/lib/notify'
import { loginSchema } from '@/features/auth/schemas'
import { SHOW_DEMO_ACCOUNTS } from '@/config/app'

const DemoAccountsPanel = import.meta.env.DEV
  ? lazy(() => import('@/features/auth/dev/DemoAccountsPanel'))
  : () => null

export function LoginPage() {
  const { t } = useTranslation(['auth', 'common'])
  useDocumentTitle(t('auth:loginHeading', 'Sign In'))
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [serverError, setServerError] = useState(null)

  const from = location.state?.from?.pathname

  const {
    register,
    handleSubmit,
    setValue,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
      remember: false,
    },
  })

  const onSubmit = async (data) => {
    setServerError(null)
    try {
      const user = await login(data)
      notify.success(t('auth:welcomeBack', { name: user.name, defaultValue: `Welcome back, ${user.name}!` }))
      const destination =
        from || (user.role === 'cashier' ? '/pos' : '/dashboard')
      navigate(destination, { replace: true })
    } catch (err) {
      const fieldErrors = getFieldErrors(err)
      if (Object.keys(fieldErrors).length > 0) {
        Object.entries(fieldErrors).forEach(([field, messages]) => {
          setError(field, { message: messages[0] })
        })
      }
      setServerError(getErrorMessage(err))
    }
  }

  return (
    <Card className="border-border/80 shadow-md">
      <CardHeader className="space-y-1 pb-4">
        <CardTitle className="text-2xl font-bold tracking-tight">
          {t('auth:loginHeading', 'Sign In')}
        </CardTitle>
        <CardDescription>
          {t('auth:loginSubtext', 'Enter your tindahan account credentials to continue')}
        </CardDescription>
      </CardHeader>

      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-4">
          {serverError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{serverError}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="email">{t('auth:emailLabel', 'Email address')}</Label>
            <Input
              id="email"
              type="email"
              placeholder={t('auth:emailPlaceholder', 'you@email.com')}
              autoComplete="email"
              {...register('email')}
            />
            {errors.email && (
              <p className="text-destructive text-xs font-medium">
                {errors.email.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">{t('auth:passwordLabel', 'Password')}</Label>
              <Link
                to="/forgot-password"
                className="text-primary text-xs font-medium hover:underline"
              >
                {t('auth:forgotPasswordLink', 'Forgot password?')}
              </Link>
            </div>
            <PasswordInput
              id="password"
              placeholder="••••••••"
              autoComplete="current-password"
              {...register('password')}
            />
            {errors.password && (
              <p className="text-destructive text-xs font-medium">
                {errors.password.message}
              </p>
            )}
          </div>

          {SHOW_DEMO_ACCOUNTS && (
            <Suspense fallback={null}>
              <DemoAccountsPanel
                onSelectAccount={({ email, password }) => {
                  setValue('email', email, { shouldValidate: true })
                  setValue('password', password, { shouldValidate: true })
                  setServerError(null)
                }}
              />
            </Suspense>
          )}
        </CardContent>

        <CardFooter className="flex flex-col gap-4 pt-2">
          <Button
            type="submit"
            className="w-full gap-2"
            disabled={isSubmitting}
          >
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {isSubmitting ? t('auth:signingIn', 'Signing in...') : t('auth:signInButton', 'Sign In')}
          </Button>

          <p className="text-muted-foreground text-center text-xs">
            {t('auth:dontHaveAccountYet', "Don't have an account yet?")}{' '}
            <Link
              to="/register"
              className="text-primary font-semibold hover:underline"
            >
              {t('auth:registerOwnerLink', 'Register as Store Owner')}
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  )
}
