import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { AlertCircle, KeyRound, Loader2, UserCheck } from 'lucide-react'

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
import { PasswordInput } from '@/components/common/PasswordInput'
import { useAuth } from '@/hooks/useAuth'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { getErrorMessage, getFieldErrors } from '@/lib/errors'
import { notify } from '@/lib/notify'
import { loginSchema } from '@/features/auth/schemas'

export function LoginPage() {
  useDocumentTitle('Sign In')
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
      notify.success(`Welcome back, ${user.name}!`)
      const destination = from || (user.role === 'cashier' ? '/pos' : '/dashboard')
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

  const fillDemo = (email) => {
    setValue('email', email)
    setValue('password', 'password')
  }

  const showDemo = import.meta.env.VITE_SHOW_DEMO_ACCOUNTS === 'true'

  return (
    <Card className="border-border/80 shadow-md">
      <CardHeader className="space-y-1 pb-4">
        <CardTitle className="text-2xl font-bold tracking-tight">
          Sign In
        </CardTitle>
        <CardDescription>
          Enter your tindahan account credentials to continue
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
            <Label htmlFor="email">Email address</Label>
            <Input
              id="email"
              type="email"
              placeholder="name@tindatrack.test"
              autoComplete="email"
              {...register('email')}
            />
            {errors.email && (
              <p className="text-xs font-medium text-destructive">
                {errors.email.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              <Link
                to="/forgot-password"
                className="text-xs text-primary hover:underline font-medium"
              >
                Forgot password?
              </Link>
            </div>
            <PasswordInput
              id="password"
              placeholder="••••••••"
              autoComplete="current-password"
              {...register('password')}
            />
            {errors.password && (
              <p className="text-xs font-medium text-destructive">
                {errors.password.message}
              </p>
            )}
          </div>

          {showDemo && (
            <div className="rounded-lg border border-dashed border-border/80 bg-muted/40 p-3 text-xs space-y-2">
              <span className="font-semibold text-foreground flex items-center gap-1.5">
                <KeyRound className="h-3.5 w-3.5 text-primary" />
                Demo Credentials:
              </span>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs flex-1 gap-1"
                  onClick={() => fillDemo('owner@tindatrack.test')}
                >
                  <UserCheck className="h-3 w-3 text-primary" />
                  Owner Demo
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs flex-1 gap-1"
                  onClick={() => fillDemo('cashier@tindatrack.test')}
                >
                  <UserCheck className="h-3 w-3 text-muted-foreground" />
                  Cashier Demo
                </Button>
              </div>
            </div>
          )}
        </CardContent>

        <CardFooter className="flex flex-col gap-4 pt-2">
          <Button type="submit" className="w-full gap-2" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {isSubmitting ? 'Signing in...' : 'Sign In'}
          </Button>

          <p className="text-center text-xs text-muted-foreground">
            Don&apos;t have an account yet?{' '}
            <Link to="/register" className="font-semibold text-primary hover:underline">
              Register as Store Owner
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  )
}
