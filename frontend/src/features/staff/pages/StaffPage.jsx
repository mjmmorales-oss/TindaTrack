import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Plus,
  UserCog,
  AlertTriangle,
  Clock,
  Loader2,
} from 'lucide-react'

import { PageContainer } from '@/components/layout/PageContainer'
import { PageHeader } from '@/components/layout/PageHeader'
import { UserAvatar } from '@/components/common/UserAvatar'
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
import { formatRelative } from '@/lib/format'

const createCashierSchema = z.object({
  name: z.string().min(1, 'Cashier full name is required.'),
  email: z.string().email('A valid email address is required.'),
  password: z
    .string()
    .min(8, 'Temporary password must be at least 8 characters.'),
})

export function StaffPage() {
  const { t } = useTranslation(['users', 'common'])
  useDocumentTitle(t('users:title'))

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
    control,
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
        title={t('users:pageTitle')}
        description={t('users:pageSubtitle')}
        actions={
          <Button size="sm" onClick={handleOpenAdd} className="gap-1.5 h-9">
            <Plus className="h-4 w-4" />
            {t('users:addStaff')}
          </Button>
        }
      />

      {/* Prototype Disclaimer Banner (shown only in mock fallback mode) */}
      {import.meta.env.VITE_DATA_SOURCE === 'mock' && (
        <div className="rounded-xl border border-warning/30 bg-warning/10 p-3.5 text-xs text-warning-foreground flex items-start gap-2.5 shadow-xs">
          <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <strong>{t('users:prototypeNoticeTitle')}</strong>{' '}
            {t('users:prototypeNoticeDesc')}
          </p>
        </div>
      )}

      {/* Staff Directory List */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center justify-between">
            <span>{t('users:directoryTitle')}</span>
            <span className="text-xs font-normal text-muted-foreground">
              {t('users:members', { count: staffList.length })}
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
              title={t('common:somethingWentWrong')}
              onRetry={refetch}
            />
          ) : staffList.length === 0 ? (
            <EmptyState
              icon={UserCog}
              title={t('users:emptyTitle')}
              description={t('users:emptyDesc')}
              action={
                <Button size="sm" onClick={handleOpenAdd}>
                  {t('users:addStaff')}
                </Button>
              }
            />
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto min-w-0 w-full">
                <table className="w-full min-w-max text-left text-xs">
                  <thead className="border-b border-border/80 text-muted-foreground font-medium">
                    <tr>
                      <th className="py-2.5">{t('users:userCol')}</th>
                      <th className="py-2.5">{t('users:emailCol')}</th>
                      <th className="py-2.5">{t('users:roleCol')}</th>
                      <th className="py-2.5">{t('users:lastLoginCol')}</th>
                      <th className="py-2.5 text-right">{t('users:statusCol')}</th>
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
                            {member.role === 'owner' ? t('users:roleOwner') : t('users:roleCashier')}
                          </Badge>
                        </td>
                        <td className="py-3 text-muted-foreground">
                          {member.last_login_at
                            ? formatRelative(member.last_login_at)
                            : t('users:neverLoggedIn')}
                        </td>
                        <td className="py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <span className="text-[11px] text-muted-foreground">
                              {member.is_active ? t('users:activeBadge') : t('users:inactiveBadge')}
                            </span>
                            <Switch
                              checked={member.is_active}
                              onCheckedChange={() => handleToggleClick(member)}
                              disabled={member.role === 'owner'}
                              aria-label={t('users:toggleStatusAria', { name: member.name })}
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
                        {member.role === 'owner' ? t('users:roleOwner') : t('users:roleCashier')}
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between text-xs text-muted-foreground border-t border-border/60 pt-2">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5 text-primary" />
                        {member.last_login_at
                          ? t('users:lastActive', { time: formatRelative(member.last_login_at) })
                          : t('users:neverLoggedIn')}
                      </span>

                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-medium">
                          {member.is_active ? t('users:activeBadge') : t('users:inactiveBadge')}
                        </span>
                        <Switch
                          checked={member.is_active}
                          onCheckedChange={() => handleToggleClick(member)}
                          disabled={member.role === 'owner'}
                          aria-label={t('users:toggleStatusAria', { name: member.name })}
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
        title={t('users:createCashierModalTitle')}
        description={t('users:createCashierModalDesc')}
        className="sm:max-w-md"
      >
        <form onSubmit={handleSubmit(onSubmitAdd)} className="space-y-4">
          <FormInput
            name="name"
            control={control}
            label={t('users:nameLabel')}
            placeholder={t('users:namePlaceholder')}
            required
            error={errors.name?.message}
          />

          <FormInput
            name="email"
            control={control}
            label={t('users:emailLabel')}
            type="email"
            placeholder={t('users:emailPlaceholder')}
            required
            error={errors.email?.message}
          />

          <Field error={errors.password?.message}>
            <FieldLabel htmlFor="temp-password">{t('users:passwordLabel')} *</FieldLabel>
            <PasswordInput
              id="temp-password"
              placeholder={t('users:passwordPlaceholder')}
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
              {t('users:cancelButton')}
            </Button>
            <Button type="submit" disabled={isSubmitting} className="gap-2">
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t('users:savingStaff')}
                </>
              ) : (
                t('users:saveStaff')
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
            ? t('users:deactivateTitle')
            : t('users:activateTitle')
        }
        description={
          targetStaff?.is_active
            ? t('users:deactivateDesc', { name: targetStaff?.name })
            : t('users:activateDesc', { name: targetStaff?.name })
        }
        confirmText={targetStaff?.is_active ? t('users:confirmDeactivate') : t('users:confirmActivate')}
        cancelText={t('users:dontProceed')}
        tone={targetStaff?.is_active ? 'destructive' : 'default'}
        onConfirm={handleConfirmToggle}
        isLoading={toggleMutation.isPending}
      />
    </PageContainer>
  )
}

export default StaffPage
