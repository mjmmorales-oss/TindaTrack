import { useState } from 'react'
import { Link } from 'react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react'

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
import { useAuth } from '@/hooks/useAuth'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { getErrorMessage, getFieldErrors } from '@/lib/errors'
import { forgotPasswordSchema } from '@/features/auth/schemas'

export function ForgotPasswordPage() {
  useDocumentTitle('Forgot Password')
  const { forgotPassword } = useAuth()
  const [serverError, setServerError] = useState(null)
  const [isSuccess, setIsSuccess] = useState(false)

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  })

  const onSubmit = async ({ email }) => {
    setServerError(null)
    try {
      await forgotPassword(email)
      setIsSuccess(true)
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

  if (isSuccess) {
    return (
      <Card className="border-border/80 shadow-md">
        <CardHeader className="space-y-1 pb-4 text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-success/15 text-success">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">
            Check your email
          </CardTitle>
          <CardDescription>
            We have sent password reset instructions to your email address.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-muted-foreground space-y-3 text-center text-xs">
          <p>
            In the local development environment, the password reset email is
            logged to{' '}
            <code className="bg-muted rounded px-1.5 py-0.5 font-mono">
              backend/storage/logs/laravel.log
            </code>
            .
          </p>
        </CardContent>
        <CardFooter className="pt-2">
          <Button variant="outline" asChild className="w-full">
            <Link to="/login">Back to Sign In</Link>
          </Button>
        </CardFooter>
      </Card>
    )
  }

  return (
    <Card className="border-border/80 shadow-md">
      <CardHeader className="space-y-1 pb-4">
        <CardTitle className="text-2xl font-bold tracking-tight">
          Forgot Password
        </CardTitle>
        <CardDescription>
          Enter your registered email address to receive a password reset link
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
            <div className="relative">
              <Input
                id="email"
                type="email"
                placeholder="name@tindatrack.test"
                autoComplete="email"
                {...register('email')}
              />
            </div>
            {errors.email && (
              <p className="text-destructive text-xs font-medium">
                {errors.email.message}
              </p>
            )}
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-4 pt-2">
          <Button
            type="submit"
            className="w-full gap-2"
            disabled={isSubmitting}
          >
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {isSubmitting ? 'Sending instructions...' : 'Send Reset Link'}
          </Button>

          <p className="text-muted-foreground text-center text-xs">
            Remembered your password?{' '}
            <Link
              to="/login"
              className="text-primary font-semibold hover:underline"
            >
              Back to Sign In
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  )
}
