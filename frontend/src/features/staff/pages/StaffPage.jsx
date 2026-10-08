import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Plus,
  UserCog,
  AlertTriangle,
  Shield,
  Clock,
  Mail,
  Loader2,
  CheckCircle2,
} from 'lucide-react'

import { PageContainer } from '@/components/layout/PageContainer'
import { PageHeader } from '@/components/layout/PageHeader'
import { UserAvatar } from '@/components/common/UserAvatar'
import { StatusBadge } from '@/components/common/StatusBadge'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { ErrorState } from '@/components/common/ErrorState'
import { EmptyState } from '@/components/common/EmptyState'
import { ConfirmDialog } from '@/components/overlays/ConfirmDialog'
import { ResponsiveDialog } from '@/components/overlays/ResponsiveDialog'
import { FormInput } from '@/components/forms/FormInput'
import { PasswordInput } from '@/components/forms/PasswordInput'
import { Field, FieldLabel, FieldError } from '@/components/ui/field'
import {
  useStaff,
  useCreateStaff,
  useToggleStaffActive,
} from '@/features/staff/hooks/useStaff'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { formatRelative, formatDateTime } from '@/lib/format'

const createCashierSchema = z.object({
  name: z.string().min(1, 'Kailangan ang buong pangalan ng cashier.'),
  email: z.string().email('Wastong email address ang kailangan.'),
  password: z
    .string()
    .min(8, 'Kailangan ng hindi bababa sa 8 karakter ang pansamantalang password.'),
})

export function StaffPage() {
  useDocumentTitle('Staff & Cashier Accounts')

  const { data: staffRes, isLoading, isError, refetch } = useStaff()
  const staffList = staffRes?.data || []

  const createMutation = useCreateStaff()
  const toggleMutation = useToggleStaffActive()

  // Dialog States
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [toggleDialogOpen, setToggleDialogOpen] = useState(false)
  const [targetStaff, setTargetStaff] = useState(null)

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(createCashierSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
    },
  })

  const handleOpenAdd = () => {
    reset()
    setAddDialogOpen(true)
  }

  const handleToggleClick = (staffMember) => {
    setTargetStaff(staffMember)
    setToggleDialogOpen(true)
  }

  const handleConfirmToggle = async () => {
    if (!targetStaff) return
    await toggleMutation.mutateAsync(targetStaff.id)
    setToggleDialogOpen(false)
    setTargetStaff(null)
  }

  const onSubmitAdd = async (values) => {
    try {
      await createMutation.mutateAsync({
        name: values.name,
        email: values.email,
        role: 'cashier',
      })
      setAddDialogOpen(false)
      reset()
    } catch (err) {
      if (err.errors) {
        Object.entries(err.errors).forEach(([field, msgs]) => {
          setError(field, { message: Array.isArray(msgs) ? msgs[0] : msgs })
        })
      }
    }
  }

  return (
    <PageContainer>
      <PageHeader
        title="Mga Account ng Staff at Kahera"
        description="Pamahalaan ang mga account ng kahera, pahintulot, at aktibong katayuan"
        actions={
          <Button size="sm" onClick={handleOpenAdd} className="gap-1.5 h-9">
            <Plus className="h-4 w-4" />
            Magdagdag ng Kahera (Add Cashier)
          </Button>
        }
      />

      {/* Prototype Disclaimer Banner (shown only in mock fallback mode) */}
      {import.meta.env.VITE_DATA_SOURCE === 'mock' && (
        <div className="rounded-xl border border-warning/30 bg-warning/10 p-3.5 text-xs text-warning-foreground flex items-start gap-2.5 shadow-xs">
          <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <strong>Paalala sa Prototayp:</strong> Ang mga pagbabago sa staff dito ay
            pansamantalang nakatala sa local prototype database. Ang mga tunay na multi-user
            accounts ay pamamahalaan ng central API sa susunod na release.
          </p>
        </div>
      )}

      {/* Staff Directory List */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center justify-between">
            <span>Listahan ng mga Gumagamit (Staff Directory)</span>
            <span className="text-xs font-normal text-muted-foreground">
              {staffList.length} miyembro
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3 py-3">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : isError ? (
            <ErrorState
              title="Nabigong kunin ang listahan ng staff"
              onRetry={refetch}
            />
          ) : staffList.length === 0 ? (
            <EmptyState
              icon={UserCog}
              title="Walang naitalang staff"
              description="Magdagdag ng cashier upang magkaroon ng sariling login."
              action={
                <Button size="sm" onClick={handleOpenAdd}>
                  Magdagdag ng Kahera
                </Button>
              }
            />
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-border/80 text-muted-foreground font-medium">
                    <tr>
                      <th className="py-2.5">Pangalan / User</th>
                      <th className="py-2.5">Email</th>
                      <th className="py-2.5">Tungkulin (Role)</th>
                      <th className="py-2.5">Huling Login</th>
                      <th className="py-2.5 text-right">Katayuan (Active)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {staffList.map((member) => (
                      <tr key={member.id} className="hover:bg-muted/30">
                        <td className="py-3 font-medium text-foreground flex items-center gap-3">
                          <UserAvatar name={member.name} email={member.email} size="sm" />
                          <div>
                            <span className="font-semibold block">{member.name}</span>
                            <span className="text-[11px] text-muted-foreground font-mono">
                              ID: #{member.id}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 text-muted-foreground font-mono">
                          {member.email}
                        </td>
                        <td className="py-3">
                          <Badge
                            variant={member.role === 'owner' ? 'default' : 'secondary'}
                            className="capitalize text-[10px]"
                          >
                            {member.role === 'owner' ? 'Store Owner' : 'Cashier'}
                          </Badge>
                        </td>
                        <td className="py-3 text-muted-foreground">
                          {member.last_login_at
                            ? formatRelative(member.last_login_at)
                            : 'Wala pang naitala'}
                        </td>
                        <td className="py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <span className="text-[11px] text-muted-foreground">
                              {member.is_active ? 'Aktibo' : 'Hindi Aktibo'}
                            </span>
                            <Switch
                              checked={member.is_active}
                              onCheckedChange={() => handleToggleClick(member)}
                              disabled={member.role === 'owner'}
                              aria-label={`I-toggle ang active status para kay ${member.name}`}
                            />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards View (< md) */}
              <div className="md:hidden space-y-3">
                {staffList.map((member) => (
                  <Card
                    key={member.id}
                    className="p-3.5 space-y-3 border-border shadow-xs bg-card"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <UserAvatar name={member.name} email={member.email} size="md" />
                        <div className="min-w-0">
                          <span className="font-bold text-sm text-foreground truncate block">
                            {member.name}
                          </span>
                          <span className="text-xs text-muted-foreground truncate block font-mono">
                            {member.email}
                          </span>
                        </div>
                      </div>

                      <Badge
                        variant={member.role === 'owner' ? 'default' : 'secondary'}
                        className="text-[10px] shrink-0"
                      >
                        {member.role === 'owner' ? 'Owner' : 'Cashier'}
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between text-xs text-muted-foreground border-t border-border/60 pt-2">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5 text-primary" />
                        {member.last_login_at
                          ? `Login: ${formatRelative(member.last_login_at)}`
                          : 'Walang login'}
                      </span>

                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-medium">
                          {member.is_active ? 'Aktibo' : 'Di-aktibo'}
                        </span>
                        <Switch
                          checked={member.is_active}
                          onCheckedChange={() => handleToggleClick(member)}
                          disabled={member.role === 'owner'}
                          aria-label={`Toggle active for ${member.name}`}
                        />
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Add Cashier Dialog */}
      <ResponsiveDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        title="Magdagdag ng Bagong Kahera (Add Cashier)"
        description="Lumikha ng account para sa kawani na gagamit ng POS terminal."
        className="sm:max-w-md"
      >
        <form onSubmit={handleSubmit(onSubmitAdd)} className="space-y-4">
          <FormInput
            label="Buong Pangalan ng Kahera"
            placeholder="Hal. Maria Clara"
            required
            error={errors.name?.message}
            {...register('name')}
          />

          <FormInput
            label="Email Address"
            type="email"
            placeholder="maria@tindatrack.test"
            required
            error={errors.email?.message}
            {...register('email')}
          />

          <Field error={errors.password?.message}>
            <FieldLabel htmlFor="temp-password">Pansamantalang Password *</FieldLabel>
            <PasswordInput
              id="temp-password"
              placeholder="Minimum 8 characters"
              hasError={!!errors.password}
              {...register('password')}
            />
            {errors.password && <FieldError>{errors.password.message}</FieldError>}
          </Field>

          {/* Sticky footer */}
          <div className="sticky bottom-0 -mx-6 -mb-6 mt-6 flex items-center justify-end gap-3 border-t border-border bg-card/95 px-6 py-4 backdrop-blur-xs">
            <Button
              type="button"
              variant="outline"
              onClick={() => setAddDialogOpen(false)}
              disabled={isSubmitting}
            >
              Kanselahin
            </Button>
            <Button type="submit" disabled={isSubmitting} className="gap-2">
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Inililikha...
                </>
              ) : (
                'I-save ang Kahera'
              )}
            </Button>
          </div>
        </form>
      </ResponsiveDialog>

      {/* Confirm Status Toggle Dialog */}
      <ConfirmDialog
        open={toggleDialogOpen}
        onOpenChange={setToggleDialogOpen}
        title={
          targetStaff?.is_active
            ? 'I-deactivate ang Account ng Kahera?'
            : 'I-activate ang Account ng Kahera?'
        }
        description={
          targetStaff?.is_active
            ? `Hindi na makakapag-sign in sa POS si ${targetStaff?.name} kapag na-deactivate ang kanyang account.`
            : `Maaari nang gamitin muli ni ${targetStaff?.name} ang kanyang account para mag-log in sa POS.`
        }
        confirmText={targetStaff?.is_active ? 'Oo, I-deactivate' : 'Oo, I-activate'}
        cancelText="Huwag Ituloy"
        tone={targetStaff?.is_active ? 'destructive' : 'default'}
        onConfirm={handleConfirmToggle}
        isLoading={toggleMutation.isPending}
      />
    </PageContainer>
  )
}

export default StaffPage
