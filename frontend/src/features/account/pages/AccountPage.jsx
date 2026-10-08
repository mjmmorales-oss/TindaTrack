import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Shield,
  Palette,
  Sun,
  Moon,
  Monitor,
  LogOut,
  KeyRound,
  User,
  Mail,
  ShieldCheck,
  CheckCircle2,
  Loader2,
} from 'lucide-react'

import { api } from '@/lib/api'
import { PageContainer } from '@/components/layout/PageContainer'
import { PageHeader } from '@/components/layout/PageHeader'
import { UserAvatar } from '@/components/common/UserAvatar'
import { PasswordInput } from '@/components/forms/PasswordInput'
import { FormInput } from '@/components/forms/FormInput'
import { Field, FieldLabel, FieldError } from '@/components/ui/field'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/hooks/useAuth'
import { useTheme } from '@/context/ThemeProvider'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { notify } from '@/lib/notify'
import { formatDate } from '@/lib/format'

const passwordChangeSchema = z
  .object({
    current_password: z.string().min(1, 'Kailangan ang kasalukuyang password.'),
    new_password: z
      .string()
      .min(8, 'Kailangan ng hindi bababa sa 8 karakter ang bagong password.'),
    confirm_password: z.string().min(1, 'Kailangan kumpirmahin ang bagong password.'),
  })
  .refine((data) => data.new_password === data.confirm_password, {
    message: 'Hindi tumutugma ang kumpirmasyon ng password.',
    path: ['confirm_password'],
  })

export function AccountPage() {
  useDocumentTitle('Aking Account (My Account)')
  const { user, logout } = useAuth()
  const { theme, setTheme } = useTheme()

  const [isSubmittingPassword, setIsSubmittingPassword] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(passwordChangeSchema),
    defaultValues: {
      current_password: '',
      new_password: '',
      confirm_password: '',
    },
  })

  const onSubmitPassword = async (data) => {
    if (import.meta.env.VITE_DATA_SOURCE === 'mock') {
      notify.info(
        'Naka-mock mode',
        'Nasa mock data mode ka ngayon. Matagumpay na naitala ang pagpalit ng password.',
      )
      reset()
      return
    }

    setIsSubmittingPassword(true)
    try {
      await api.put('/user/password', {
        current_password: data.current_password,
        password: data.new_password,
        password_confirmation: data.confirm_password,
      })
      notify.success('Matagumpay na napalitan ang iyong password.')
      reset()
    } catch (err) {
      if (err.response?.status === 422 && err.response.data?.errors) {
        const backendErrors = err.response.data.errors
        if (backendErrors.current_password) {
          setError('current_password', { message: backendErrors.current_password[0] })
        }
        if (backendErrors.password) {
          setError('new_password', { message: backendErrors.password[0] })
        }
        notify.error('Hindi wastong datos', err.response.data.message || 'Pakisuri ang mga patlang.')
      } else {
        notify.error('Nabigong palitan ang password', err.response?.data?.message || err.message)
      }
    } finally {
      setIsSubmittingPassword(false)
    }
  }

  const handleSignOut = async () => {
    try {
      await logout()
      notify.success('Naka-sign out ka na.')
    } catch {
      // already cleared
    }
  }

  return (
    <PageContainer>
      <PageHeader
        title="Aking Account at Setting"
        description="Pamahalaan ang profile, seguridad ng password, tema ng aplikasyon, at sesyon"
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Profile Details Card (Read-only from REAL /api/user) */}
        <div className="lg:col-span-4 space-y-6">
          <Card className="border-border shadow-xs text-center">
            <CardHeader className="pb-3 flex flex-col items-center">
              <UserAvatar
                name={user?.name}
                email={user?.email}
                size="xl"
                className="mb-2 ring-2 ring-primary/20"
              />
              <CardTitle className="text-lg font-bold text-foreground">
                {user?.name}
              </CardTitle>
              <CardDescription className="text-xs font-mono">
                {user?.email}
              </CardDescription>
              <div className="pt-2">
                <Badge
                  variant={user?.role === 'owner' ? 'default' : 'secondary'}
                  className="text-[10px] uppercase font-semibold"
                >
                  {user?.role === 'owner' ? 'Store Owner' : 'Cashier'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="border-t border-border/70 mt-2 pt-4 text-xs space-y-2.5 text-left">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Katayuan (Status):</span>
                <span className="text-success font-semibold flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" /> Aktibo
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tungkulin:</span>
                <span className="font-medium text-foreground capitalize">
                  {user?.role_label || user?.role}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Kabilang Simula:</span>
                <span className="font-mono text-muted-foreground">
                  {user?.created_at ? formatDate(user.created_at) : 'Ngayon'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Auth Provider:</span>
                <span className="text-xs font-mono text-muted-foreground">
                  Sanctum Bearer Token
                </span>
              </div>
            </CardContent>
            <CardFooter className="border-t border-border/70 pt-4">
              <Button
                variant="destructive"
                onClick={handleSignOut}
                className="w-full gap-2 h-10"
              >
                <LogOut className="h-4 w-4" />
                Mag-sign Out (Sign Out)
              </Button>
            </CardFooter>
          </Card>
        </div>

        {/* Security & Appearance Cards */}
        <div className="lg:col-span-8 space-y-6">
          {/* Security / Change Password Card */}
          <Card className="border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <KeyRound className="h-4 w-4 text-primary" />
                Palitan ang Password (Security)
              </CardTitle>
              <CardDescription className="text-xs">
                Siguraduhing malakas at ligtas ang password para maprotektahan ang tindahan
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleSubmit(onSubmitPassword)}>
              <CardContent className="space-y-4">
                <Field error={errors.current_password?.message}>
                  <FieldLabel htmlFor="curr-password">Kasalukuyang Password</FieldLabel>
                  <PasswordInput
                    id="curr-password"
                    placeholder="••••••••"
                    hasError={!!errors.current_password}
                    {...register('current_password')}
                  />
                  {errors.current_password && (
                    <FieldError>{errors.current_password.message}</FieldError>
                  )}
                </Field>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field error={errors.new_password?.message}>
                    <FieldLabel htmlFor="new-password">Bagong Password</FieldLabel>
                    <PasswordInput
                      id="new-password"
                      placeholder="Minimum 8 characters"
                      hasError={!!errors.new_password}
                      {...register('new_password')}
                    />
                    {errors.new_password && (
                      <FieldError>{errors.new_password.message}</FieldError>
                    )}
                  </Field>

                  <Field error={errors.confirm_password?.message}>
                    <FieldLabel htmlFor="confirm-new-password">
                      Kumpirmahin ang Bagong Password
                    </FieldLabel>
                    <PasswordInput
                      id="confirm-new-password"
                      placeholder="Ulitin ang password"
                      hasError={!!errors.confirm_password}
                      {...register('confirm_password')}
                    />
                    {errors.confirm_password && (
                      <FieldError>{errors.confirm_password.message}</FieldError>
                    )}
                  </Field>
                </div>
              </CardContent>
              <CardFooter className="flex justify-end border-t border-border/70 pt-4">
                <Button
                  type="submit"
                  disabled={isSubmittingPassword}
                  className="w-full sm:w-auto gap-2"
                >
                  {isSubmittingPassword && <Loader2 className="h-4 w-4 animate-spin" />}
                  I-save ang Bagong Password
                </Button>
              </CardFooter>
            </form>
          </Card>

          {/* Appearance / Theme Preferences Card */}
          <Card className="border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Palette className="h-4 w-4 text-primary" />
                Tema at Anyo ng App (Appearance)
              </CardTitle>
              <CardDescription className="text-xs">
                Pumili ng kulay o ayos ng tema na komportable sa iyong mga mata
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RadioGroup
                value={theme}
                onValueChange={(val) => setTheme(val)}
                className="grid grid-cols-1 gap-3 sm:grid-cols-3"
              >
                <div>
                  <RadioGroupItem
                    value="light"
                    id="theme-light"
                    className="peer sr-only"
                  />
                  <Label
                    htmlFor="theme-light"
                    className="flex flex-col items-center justify-between rounded-xl border-2 border-muted bg-card p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 cursor-pointer text-center space-y-2"
                  >
                    <Sun className="h-6 w-6 text-warning" />
                    <div>
                      <p className="font-semibold text-sm">Liwanag (Light)</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Maliwanag na visual para sa umaga
                      </p>
                    </div>
                  </Label>
                </div>

                <div>
                  <RadioGroupItem
                    value="dark"
                    id="theme-dark"
                    className="peer sr-only"
                  />
                  <Label
                    htmlFor="theme-dark"
                    className="flex flex-col items-center justify-between rounded-xl border-2 border-muted bg-card p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 cursor-pointer text-center space-y-2"
                  >
                    <Moon className="h-6 w-6 text-primary" />
                    <div>
                      <p className="font-semibold text-sm">Dilim (Dark)</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Mababang liwanag para sa gabi
                      </p>
                    </div>
                  </Label>
                </div>

                <div>
                  <RadioGroupItem
                    value="system"
                    id="theme-system"
                    className="peer sr-only"
                  />
                  <Label
                    htmlFor="theme-system"
                    className="flex flex-col items-center justify-between rounded-xl border-2 border-muted bg-card p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 cursor-pointer text-center space-y-2"
                  >
                    <Monitor className="h-6 w-6 text-muted-foreground" />
                    <div>
                      <p className="font-semibold text-sm">Awtomatiko (System)</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Sumunod sa setting ng device
                      </p>
                    </div>
                  </Label>
                </div>
              </RadioGroup>
            </CardContent>
          </Card>
        </div>
      </div>
    </PageContainer>
  )
}

export default AccountPage
