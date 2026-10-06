import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { AlertCircle, Loader2 } from 'lucide-react'

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
import { registerSchema } from '@/features/auth/schemas'

export function RegisterPage() {
  useDocumentTitle('Register Store Owner')
  const { register: registerUser } = useAuth()
  const navigate = useNavigate()
  const [serverError, setServerError] = useState(null)

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      password_confirmation: '',
      terms: false,
    },
  })

  const onSubmit = async (data) => {
    setServerError(null)
    try {
      const user = await registerUser(data)
      notify.success(`Store owner account created! Welcome, ${user.name}!`)
      navigate('/dashboard', { replace: true })
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
          Register Store
        </CardTitle>
        <CardDescription>
          Create your store owner account to manage your sari-sari store
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
            <Label htmlFor="name">Store Owner Name</Label>
            <Input
              id="name"
              placeholder="e.g. Aling Nena Dela Cruz"
              autoComplete="name"
              {...register('name')}
            />
            {errors.name && (
              <p className="text-destructive text-xs font-medium">
                {errors.name.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email address</Label>
            <Input
              id="email"
              type="email"
              placeholder="nena@tindatrack.test"
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
            <Label htmlFor="password">Password</Label>
            <PasswordInput
              id="password"
              placeholder="At least 8 characters"
              autoComplete="new-password"
              {...register('password')}
            />
            {errors.password && (
              <p className="text-destructive text-xs font-medium">
                {errors.password.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password_confirmation">Confirm Password</Label>
            <PasswordInput
              id="password_confirmation"
              placeholder="Re-type password"
              autoComplete="new-password"
              {...register('password_confirmation')}
            />
            {errors.password_confirmation && (
              <p className="text-destructive text-xs font-medium">
                {errors.password_confirmation.message}
              </p>
            )}
          </div>

          <div className="flex items-start gap-2 pt-1">
            <input
              type="checkbox"
              id="terms"
              className="border-border text-primary focus:ring-primary mt-1 h-4 w-4 rounded"
              {...register('terms')}
            />
            <Label
              htmlFor="terms"
              className="text-muted-foreground cursor-pointer text-xs leading-tight font-normal"
            >
              I agree to the TindaTrack terms and acknowledge this is an
              educational prototype.
            </Label>
          </div>
          {errors.terms && (
            <p className="text-destructive text-xs font-medium">
              {errors.terms.message}
            </p>
          )}
        </CardContent>

        <CardFooter className="flex flex-col gap-4 pt-2">
          <Button
            type="submit"
            className="w-full gap-2"
            disabled={isSubmitting}
          >
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {isSubmitting
              ? 'Creating account...'
              : 'Create Store Owner Account'}
          </Button>

          <p className="text-muted-foreground text-center text-xs">
            Already have an account?{' '}
            <Link
              to="/login"
              className="text-primary font-semibold hover:underline"
            >
              Sign In
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  )
}
