import { useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Plus,
  UserCog,
  AlertTriangle,
  Clock,
  Loader2,
  KeyRound,
  Copy,
  Check,
  MoreVertical,
  Edit,
  ShieldAlert,
  Trash2,
  RotateCcw,
  Smartphone,
  Eye,
  Phone,
  Mail,
  Calendar,
  ShoppingBag,
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { SearchInput } from '@/components/forms/SearchInput'
import { Money } from '@/components/common/Money'
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'

import {
  useStaff,
  useCreateStaff,
  useUpdateStaff,
  useToggleStaffActive,
  useResetStaffPassword,
  useRevokeStaffSessions,
  useArchiveStaff,
  useRestoreStaff,
} from '@/features/staff/hooks/useStaff'
import { useAuth } from '@/hooks/useAuth'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { formatRelative, formatDate } from '@/lib/format'
import { notify } from '@/lib/notify'
import { createStaffSchema, updateStaffSchema, resetPasswordSchema } from '@/features/staff/schemas'
import { applyServerErrors } from '@/lib/formErrors'

export function StaffPage() {
  const { t } = useTranslation(['users', 'common'])
  useDocumentTitle(t('users:title'))
  const { user: currentUser } = useAuth()

  // Filters
  const [statusTab, setStatusTab] = useState('active')
  const [searchQuery, setSearchQuery] = useState('')

  // Query
  const {
    data: staffRes,
    isLoading,
    isError,
    refetch,
  } = useStaff({ status: statusTab, search: searchQuery })
  const staffList = staffRes?.data || []

  // Mutations
  const createMutation = useCreateStaff()
  const updateMutation = useUpdateStaff()
  const toggleMutation = useToggleStaffActive()
  const resetPasswordMutation = useResetStaffPassword()
  const revokeSessionsMutation = useRevokeStaffSessions()
  const archiveMutation = useArchiveStaff()
  const restoreMutation = useRestoreStaff()

  // Dialog States
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [resetDialogOpen, setResetDialogOpen] = useState(false)
  const [detailOpen, setDetailOpen] = useState(false)
  const [tempPasswordModalOpen, setTempPasswordModalOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [tempPasswordValue, setTempPasswordValue] = useState('')

  // Confirm Dialog States
  const [toggleDialogOpen, setToggleDialogOpen] = useState(false)
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false)
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false)
  const [revokeDialogOpen, setRevokeDialogOpen] = useState(false)
  const [targetStaff, setTargetStaff] = useState(null)

  // Forms
  const addForm = useForm({
    resolver: zodResolver(createStaffSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      password_mode: 'generate',
      password: '',
    },
  })

  const editForm = useForm({
    resolver: zodResolver(updateStaffSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
    },
  })

  const resetForm = useForm({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password_mode: 'generate',
      password: '',
    },
  })

  // Handlers
  const handleOpenAdd = () => {
    addForm.reset({
      name: '',
      email: '',
      phone: '',
      password_mode: 'generate',
      password: '',
    })
    setAddDialogOpen(true)
  }

  const handleOpenEdit = (member) => {
    setTargetStaff(member)
    editForm.reset({
      name: member.name || '',
      email: member.email || '',
      phone: member.phone || '',
    })
    setEditDialogOpen(true)
  }

  const handleOpenReset = (member) => {
    setTargetStaff(member)
    resetForm.reset({
      password_mode: 'generate',
      password: '',
    })
    setResetDialogOpen(true)
  }

  const handleOpenDetail = (member) => {
    setTargetStaff(member)
    setDetailOpen(true)
  }

  const handleCopyPassword = async (pwd) => {
    try {
      await navigator.clipboard.writeText(pwd)
      setCopied(true)
      notify.success(t('users:copiedPassword'))
      setTimeout(() => setCopied(false), 2500)
    } catch {
      notify.error('Could not copy to clipboard')
    }
  }

  const onSubmitAdd = async (values) => {
    try {
      const payload = {
        name: values.name.trim(),
        email: values.email.trim(),
        phone: values.phone?.trim() || null,
        role: 'cashier',
      }
      if (values.password_mode === 'manual' && values.password) {
        payload.password = values.password
      } else {
        // Laravel requires a password unless asked to generate one
        payload.generate_password = true
      }
      const res = await createMutation.mutateAsync(payload)
      setAddDialogOpen(false)

      const generatedPwd = (res?.temporary_password ?? res?.temp_password) || (values.password_mode === 'manual' ? values.password : null)
      if (generatedPwd) {
        setTempPasswordValue(generatedPwd)
        setTempPasswordModalOpen(true)
      }
    } catch (err) {
      applyServerErrors(err, addForm.setError, {
        visibleFields: ['name', 'email', 'phone', 'password'],
      })
    }
  }

  const onSubmitEdit = async (values) => {
    if (!targetStaff) return
    try {
      await updateMutation.mutateAsync({
        id: targetStaff.id,
        data: {
          name: values.name.trim(),
          email: values.email.trim(),
          phone: values.phone?.trim() || null,
        },
      })
      setEditDialogOpen(false)
      if (detailOpen && targetStaff.id === targetStaff.id) {
        setTargetStaff((prev) => ({ ...prev, ...values }))
      }
    } catch (err) {
      applyServerErrors(err, editForm.setError, {
        visibleFields: ['name', 'email', 'phone'],
      })
    }
  }

  const onSubmitReset = async (values) => {
    if (!targetStaff) return
    try {
      const payload = {}
      if (values.password_mode === 'manual' && values.password) {
        payload.password = values.password
      }
      const res = await resetPasswordMutation.mutateAsync({
        id: targetStaff.id,
        data: payload,
      })
      setResetDialogOpen(false)

      const generatedPwd = (res?.temporary_password ?? res?.temp_password) || (values.password_mode === 'manual' ? values.password : null)
      if (generatedPwd) {
        setTempPasswordValue(generatedPwd)
        setTempPasswordModalOpen(true)
      }
    } catch (err) {
      applyServerErrors(err, resetForm.setError, {
        visibleFields: ['password'],
      })
    }
  }

  const handleConfirmToggle = async () => {
    if (!targetStaff) return
    try {
      await toggleMutation.mutateAsync(targetStaff.id)
      setToggleDialogOpen(false)
    } catch {
      // notification handled in hook
    }
  }

  const handleConfirmArchive = async () => {
    if (!targetStaff) return
    try {
      await archiveMutation.mutateAsync(targetStaff.id)
      setArchiveDialogOpen(false)
      if (detailOpen) setDetailOpen(false)
    } catch {
      // notification handled in hook
    }
  }

  const handleConfirmRestore = async () => {
    if (!targetStaff) return
    try {
      await restoreMutation.mutateAsync(targetStaff.id)
      setRestoreDialogOpen(false)
      if (detailOpen) setDetailOpen(false)
    } catch {
      // notification handled in hook
    }
  }

  const handleConfirmRevoke = async () => {
    if (!targetStaff) return
    try {
      await revokeSessionsMutation.mutateAsync(targetStaff.id)
      setRevokeDialogOpen(false)
    } catch {
      // notification handled in hook
    }
  }

  return (
    <TooltipProvider>
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

        {/* Filter and Search Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <Tabs
            value={statusTab}
            onValueChange={setStatusTab}
            className="w-full sm:w-auto"
          >
            <TabsList className="grid grid-cols-3 w-full sm:w-auto h-9">
              <TabsTrigger value="active" className="text-xs">
                {t('users:tabActive')}
              </TabsTrigger>
              <TabsTrigger value="inactive" className="text-xs">
                {t('users:tabInactive')}
              </TabsTrigger>
              <TabsTrigger value="archived" className="text-xs">
                {t('users:tabArchived')}
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="w-full sm:w-72">
            <SearchInput
              value={searchQuery}
              onChange={(val) => setSearchQuery(val)}
              placeholder={t('users:searchPlaceholder')}
              className="h-9"
            />
          </div>
        </div>

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
                  statusTab === 'active' && (
                    <Button size="sm" onClick={handleOpenAdd}>
                      {t('users:addStaff')}
                    </Button>
                  )
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
                        <th className="py-2.5">{t('users:phoneCol')}</th>
                        <th className="py-2.5">{t('users:roleCol')}</th>
                        <th className="py-2.5">{t('users:salesTodayCol')}</th>
                        <th className="py-2.5">{t('users:lastLoginCol')}</th>
                        <th className="py-2.5">{t('users:statusCol')}</th>
                        <th className="py-2.5 text-right">{t('users:actionsCol')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {staffList.map((member) => {
                        const isSelf = member.id === currentUser?.id
                        const isOwner = member.role === 'owner'
                        const isArchived = Boolean(member.deleted_at)

                        return (
                          <tr
                            key={member.id}
                            className="hover:bg-muted/30 transition-colors cursor-pointer"
                            onClick={() => handleOpenDetail(member)}
                          >
                            <td className="py-3 font-medium text-foreground flex items-center gap-3">
                              <UserAvatar name={member.name} email={member.email} size="sm" />
                              <div>
                                <span className="font-semibold block hover:underline">
                                  {member.name}
                                </span>
                                <span className="text-[11px] text-muted-foreground font-mono">
                                  ID: #{member.id}
                                </span>
                              </div>
                            </td>
                            <td className="py-3 text-muted-foreground font-mono">
                              {member.email}
                            </td>
                            <td className="py-3 text-muted-foreground font-mono">
                              {member.phone || '—'}
                            </td>
                            <td className="py-3">
                              <Badge
                                variant={isOwner ? 'default' : 'secondary'}
                                className="capitalize text-[10px]"
                              >
                                {isOwner ? t('users:roleOwner') : t('users:roleCashier')}
                              </Badge>
                            </td>
                            <td className="py-3 text-muted-foreground">
                              {member.sales_count > 0 ? (
                                <div className="space-y-0.5">
                                  <div className="font-medium text-foreground">
                                    <Money amount={member.sales_total_today || 0} />
                                  </div>
                                  <div className="text-[10px] text-muted-foreground">
                                    {t('users:salesCount', { count: member.sales_count })}
                                  </div>
                                </div>
                              ) : (
                                '—'
                              )}
                            </td>
                            <td className="py-3 text-muted-foreground">
                              {member.last_login_at
                                ? formatRelative(member.last_login_at)
                                : t('users:neverLoggedIn')}
                            </td>
                            <td className="py-3">
                              <Badge
                                variant="outline"
                                className={`text-[10px] font-medium ${
                                  isArchived
                                    ? 'bg-muted text-muted-foreground border-border'
                                    : member.is_active
                                      ? 'bg-success/15 text-success border-success/30'
                                      : 'bg-warning/15 text-warning border-warning/30'
                                }`}
                              >
                                {isArchived
                                  ? t('users:archivedBadge')
                                  : member.is_active
                                    ? t('users:activeBadge')
                                    : t('users:inactiveBadge')}
                              </Badge>
                            </td>
                            <td
                              className="py-3 text-right"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <div className="flex items-center justify-end gap-1">
                                {!isArchived && (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <span>
                                        <Switch
                                          checked={member.is_active}
                                          onCheckedChange={() => {
                                            setTargetStaff(member)
                                            setToggleDialogOpen(true)
                                          }}
                                          disabled={isSelf || (isOwner && member.is_active)}
                                          aria-label={t('users:toggleStatusAria', { name: member.name })}
                                        />
                                      </span>
                                    </TooltipTrigger>
                                    {(isSelf || (isOwner && member.is_active)) && (
                                      <TooltipContent side="left">
                                        {isSelf
                                          ? t('users:cannotDeactivateSelf')
                                          : t('users:cannotDeactivateOwner')}
                                      </TooltipContent>
                                    )}
                                  </Tooltip>
                                )}

                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                      aria-label={`Actions for ${member.name}`}
                                    >
                                      <MoreVertical className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="w-48">
                                    <DropdownMenuItem onClick={() => handleOpenDetail(member)}>
                                      <Eye className="h-4 w-4 mr-2" />
                                      {t('users:viewDetails')}
                                    </DropdownMenuItem>

                                    {!isArchived && (
                                      <>
                                        {/* The backend refuses edits to owner accounts here (owners use Account) */}
                                        {!isOwner && (
                                          <DropdownMenuItem onClick={() => handleOpenEdit(member)}>
                                            <Edit className="h-4 w-4 mr-2" />
                                            {t('users:editStaff')}
                                          </DropdownMenuItem>
                                        )}

                                        {isSelf ? (
                                          <Tooltip>
                                            <TooltipTrigger asChild>
                                              <div className="opacity-50 px-2 py-1.5 text-xs flex items-center cursor-not-allowed">
                                                <KeyRound className="h-4 w-4 mr-2" />
                                                {t('users:resetPassword')}
                                              </div>
                                            </TooltipTrigger>
                                            <TooltipContent side="left">
                                              {t('users:cannotResetSelf')}
                                            </TooltipContent>
                                          </Tooltip>
                                        ) : isOwner ? (
                                          <Tooltip>
                                            <TooltipTrigger asChild>
                                              <div className="opacity-50 px-2 py-1.5 text-xs flex items-center cursor-not-allowed">
                                                <KeyRound className="h-4 w-4 mr-2" />
                                                {t('users:resetPassword')}
                                              </div>
                                            </TooltipTrigger>
                                            <TooltipContent side="left">
                                              {t('users:cannotResetOwner')}
                                            </TooltipContent>
                                          </Tooltip>
                                        ) : (
                                          <DropdownMenuItem onClick={() => handleOpenReset(member)}>
                                            <KeyRound className="h-4 w-4 mr-2" />
                                            {t('users:resetPassword')}
                                          </DropdownMenuItem>
                                        )}

                                        <DropdownMenuItem
                                          onClick={() => {
                                            setTargetStaff(member)
                                            setRevokeDialogOpen(true)
                                          }}
                                        >
                                          <Smartphone className="h-4 w-4 mr-2" />
                                          {t('users:revokeSessions')}
                                        </DropdownMenuItem>
                                      </>
                                    )}

                                    <DropdownMenuSeparator />

                                    {isArchived ? (
                                      <DropdownMenuItem
                                        onClick={() => {
                                          setTargetStaff(member)
                                          setRestoreDialogOpen(true)
                                        }}
                                        className="text-primary font-medium"
                                      >
                                        <RotateCcw className="h-4 w-4 mr-2" />
                                        {t('users:restoreStaff')}
                                      </DropdownMenuItem>
                                    ) : isSelf ? (
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <div className="opacity-50 px-2 py-1.5 text-xs flex items-center text-destructive cursor-not-allowed">
                                            <Trash2 className="h-4 w-4 mr-2" />
                                            {t('users:archiveStaff')}
                                          </div>
                                        </TooltipTrigger>
                                        <TooltipContent side="left">
                                          {t('users:cannotArchiveSelf')}
                                        </TooltipContent>
                                      </Tooltip>
                                    ) : isOwner ? (
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <div className="opacity-50 px-2 py-1.5 text-xs flex items-center text-destructive cursor-not-allowed">
                                            <Trash2 className="h-4 w-4 mr-2" />
                                            {t('users:archiveStaff')}
                                          </div>
                                        </TooltipTrigger>
                                        <TooltipContent side="left">
                                          {t('users:cannotArchiveOwner')}
                                        </TooltipContent>
                                      </Tooltip>
                                    ) : (
                                      <DropdownMenuItem
                                        onClick={() => {
                                          setTargetStaff(member)
                                          setArchiveDialogOpen(true)
                                        }}
                                        className="text-destructive font-medium focus:text-destructive"
                                      >
                                        <Trash2 className="h-4 w-4 mr-2" />
                                        {t('users:archiveStaff')}
                                      </DropdownMenuItem>
                                    )}
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Cards View (< md) */}
                <div className="md:hidden space-y-3">
                  {staffList.map((member) => {
                    const isSelf = member.id === currentUser?.id
                    const isOwner = member.role === 'owner'
                    const isArchived = Boolean(member.deleted_at)

                    return (
                      <Card
                        key={member.id}
                        className="p-3.5 space-y-3 border-border shadow-xs bg-card hover:border-primary/40 transition-colors cursor-pointer"
                        onClick={() => handleOpenDetail(member)}
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
                              {member.phone && (
                                <span className="text-[11px] text-muted-foreground truncate block font-mono">
                                  {member.phone}
                                </span>
                              )}
                            </div>
                          </div>

                          <div
                            className="flex items-center gap-1.5 shrink-0"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Badge
                              variant={isOwner ? 'default' : 'secondary'}
                              className="text-[10px]"
                            >
                              {isOwner ? t('users:roleOwner') : t('users:roleCashier')}
                            </Badge>

                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-muted-foreground"
                                >
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuItem onClick={() => handleOpenDetail(member)}>
                                  <Eye className="h-4 w-4 mr-2" />
                                  {t('users:viewDetails')}
                                </DropdownMenuItem>

                                {!isArchived && (
                                  <>
                                    {!isOwner && (
                                      <DropdownMenuItem onClick={() => handleOpenEdit(member)}>
                                        <Edit className="h-4 w-4 mr-2" />
                                        {t('users:editStaff')}
                                      </DropdownMenuItem>
                                    )}

                                    {!isSelf && !isOwner && (
                                      <DropdownMenuItem onClick={() => handleOpenReset(member)}>
                                        <KeyRound className="h-4 w-4 mr-2" />
                                        {t('users:resetPassword')}
                                      </DropdownMenuItem>
                                    )}

                                    <DropdownMenuItem
                                      onClick={() => {
                                        setTargetStaff(member)
                                        setRevokeDialogOpen(true)
                                      }}
                                    >
                                      <Smartphone className="h-4 w-4 mr-2" />
                                      {t('users:revokeSessions')}
                                    </DropdownMenuItem>
                                  </>
                                )}

                                <DropdownMenuSeparator />

                                {isArchived ? (
                                  <DropdownMenuItem
                                    onClick={() => {
                                      setTargetStaff(member)
                                      setRestoreDialogOpen(true)
                                    }}
                                    className="text-primary font-medium"
                                  >
                                    <RotateCcw className="h-4 w-4 mr-2" />
                                    {t('users:restoreStaff')}
                                  </DropdownMenuItem>
                                ) : !isSelf && !isOwner ? (
                                  <DropdownMenuItem
                                    onClick={() => {
                                      setTargetStaff(member)
                                      setArchiveDialogOpen(true)
                                    }}
                                    className="text-destructive font-medium focus:text-destructive"
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    {t('users:archiveStaff')}
                                  </DropdownMenuItem>
                                ) : null}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>

                        {/* Metric & Status Footer */}
                        <div
                          className="flex items-center justify-between text-xs text-muted-foreground border-t border-border/60 pt-2"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <span className="flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5 text-primary" />
                            {member.last_login_at
                              ? t('users:lastActive', { time: formatRelative(member.last_login_at) })
                              : t('users:neverLoggedIn')}
                          </span>

                          <div className="flex items-center gap-2">
                            <Badge
                              variant="outline"
                              className={`text-[10px] ${
                                isArchived
                                  ? 'bg-muted text-muted-foreground'
                                  : member.is_active
                                    ? 'bg-success/15 text-success border-success/30'
                                    : 'bg-warning/15 text-warning border-warning/30'
                              }`}
                            >
                              {isArchived
                                ? t('users:archivedBadge')
                                : member.is_active
                                  ? t('users:activeBadge')
                                  : t('users:inactiveBadge')}
                            </Badge>

                            {!isArchived && (
                              <Switch
                                checked={member.is_active}
                                onCheckedChange={() => {
                                  setTargetStaff(member)
                                  setToggleDialogOpen(true)
                                }}
                                disabled={isSelf || (isOwner && member.is_active)}
                                aria-label={t('users:toggleStatusAria', { name: member.name })}
                              />
                            )}
                          </div>
                        </div>
                      </Card>
                    )
                  })}
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
          <form onSubmit={addForm.handleSubmit(onSubmitAdd)} className="space-y-4">
            <FormInput
              name="name"
              control={addForm.control}
              label={t('users:nameLabel')}
              placeholder={t('users:namePlaceholder')}
              required
              error={addForm.formState.errors.name?.message}
            />

            <FormInput
              name="email"
              control={addForm.control}
              label={t('users:emailLabel')}
              type="email"
              placeholder={t('users:emailPlaceholder')}
              required
              error={addForm.formState.errors.email?.message}
            />

            <FormInput
              name="phone"
              control={addForm.control}
              label={t('users:phoneLabel')}
              placeholder={t('users:phonePlaceholder')}
              error={addForm.formState.errors.phone?.message}
            />

            {/* Password Mode Selector */}
            <div className="space-y-2 border-t border-border/60 pt-3">
              <FieldLabel>{t('users:passwordLabel')}</FieldLabel>
              <Controller
                name="password_mode"
                control={addForm.control}
                render={({ field }) => (
                  <RadioGroup
                    value={field.value}
                    onValueChange={field.onChange}
                    className="grid gap-2 text-xs"
                  >
                    <label className="flex items-center gap-2 cursor-pointer p-2 rounded-md border border-border/80 hover:bg-muted/40">
                      <RadioGroupItem value="generate" id="mode-gen" />
                      <span>{t('users:passwordModeGenerate')}</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer p-2 rounded-md border border-border/80 hover:bg-muted/40">
                      <RadioGroupItem value="manual" id="mode-man" />
                      <span>{t('users:passwordModeManual')}</span>
                    </label>
                  </RadioGroup>
                )}
              />
            </div>

            {addForm.watch('password_mode') === 'manual' && (
              <Field error={addForm.formState.errors.password?.message}>
                <FieldLabel htmlFor="manual-password">{t('users:passwordLabel')} *</FieldLabel>
                <PasswordInput
                  id="manual-password"
                  placeholder={t('users:passwordPlaceholder')}
                  hasError={!!addForm.formState.errors.password}
                  {...addForm.register('password')}
                />
                {addForm.formState.errors.password && (
                  <FieldError>{addForm.formState.errors.password.message}</FieldError>
                )}
              </Field>
            )}

            {/* Sticky footer */}
            <div className="sticky bottom-0 -mx-6 -mb-6 mt-6 flex items-center justify-end gap-3 border-t border-border bg-card/95 px-6 py-4 backdrop-blur-xs">
              <Button
                type="button"
                variant="outline"
                onClick={() => setAddDialogOpen(false)}
                disabled={addForm.formState.isSubmitting}
              >
                {t('users:cancelButton')}
              </Button>
              <Button type="submit" disabled={addForm.formState.isSubmitting} className="gap-2">
                {addForm.formState.isSubmitting ? (
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

        {/* Temporary Password Modal with Copy Button */}
        <ResponsiveDialog
          open={tempPasswordModalOpen}
          onOpenChange={setTempPasswordModalOpen}
          title={t('users:tempPasswordModalTitle')}
          description={t('users:tempPasswordModalDesc')}
          className="sm:max-w-md"
        >
          <div className="space-y-4 py-2">
            <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 flex flex-col items-center justify-center gap-3 text-center">
              <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                {t('users:passwordLabel')}
              </span>
              <div className="font-mono text-xl sm:text-2xl font-bold tracking-widest text-foreground bg-card border border-border px-4 py-2 rounded-lg select-all">
                {tempPasswordValue}
              </div>
              <Button
                size="sm"
                variant={copied ? 'default' : 'outline'}
                onClick={() => handleCopyPassword(tempPasswordValue)}
                className="gap-2 h-9"
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? t('users:copiedPassword') : t('users:copyPassword')}
              </Button>
            </div>

            <div className="rounded-lg bg-muted/60 p-3 text-xs text-muted-foreground flex items-start gap-2">
              <ShieldAlert className="h-4 w-4 text-warning shrink-0 mt-0.5" />
              <span>{t('users:mustChangeNotice')}</span>
            </div>

            <div className="flex justify-end pt-2">
              <Button onClick={() => setTempPasswordModalOpen(false)}>
                {t('users:close')}
              </Button>
            </div>
          </div>
        </ResponsiveDialog>

        {/* Edit Staff Dialog */}
        <ResponsiveDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          title={t('users:editStaffModalTitle')}
          description={t('users:editStaffModalDesc')}
          className="sm:max-w-md"
        >
          <form onSubmit={editForm.handleSubmit(onSubmitEdit)} className="space-y-4">
            <FormInput
              name="name"
              control={editForm.control}
              label={t('users:nameLabel')}
              placeholder={t('users:namePlaceholder')}
              required
              error={editForm.formState.errors.name?.message}
            />

            <FormInput
              name="email"
              control={editForm.control}
              label={t('users:emailLabel')}
              type="email"
              placeholder={t('users:emailPlaceholder')}
              required
              error={editForm.formState.errors.email?.message}
            />

            <FormInput
              name="phone"
              control={editForm.control}
              label={t('users:phoneLabel')}
              placeholder={t('users:phonePlaceholder')}
              error={editForm.formState.errors.phone?.message}
            />

            <div className="sticky bottom-0 -mx-6 -mb-6 mt-6 flex items-center justify-end gap-3 border-t border-border bg-card/95 px-6 py-4 backdrop-blur-xs">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditDialogOpen(false)}
                disabled={editForm.formState.isSubmitting}
              >
                {t('users:cancelButton')}
              </Button>
              <Button type="submit" disabled={editForm.formState.isSubmitting}>
                {editForm.formState.isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  t('common:saveChanges')
                )}
              </Button>
            </div>
          </form>
        </ResponsiveDialog>

        {/* Reset Password Dialog */}
        <ResponsiveDialog
          open={resetDialogOpen}
          onOpenChange={setResetDialogOpen}
          title={t('users:resetPasswordModalTitle')}
          description={t('users:resetPasswordModalDesc')}
          className="sm:max-w-md"
        >
          <form onSubmit={resetForm.handleSubmit(onSubmitReset)} className="space-y-4">
            <div className="space-y-2">
              <FieldLabel>{t('users:passwordLabel')}</FieldLabel>
              <Controller
                name="password_mode"
                control={resetForm.control}
                render={({ field }) => (
                  <RadioGroup
                    value={field.value}
                    onValueChange={field.onChange}
                    className="grid gap-2 text-xs"
                  >
                    <label className="flex items-center gap-2 cursor-pointer p-2 rounded-md border border-border/80 hover:bg-muted/40">
                      <RadioGroupItem value="generate" id="reset-mode-gen" />
                      <span>{t('users:passwordModeGenerate')}</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer p-2 rounded-md border border-border/80 hover:bg-muted/40">
                      <RadioGroupItem value="manual" id="reset-mode-man" />
                      <span>{t('users:passwordModeManual')}</span>
                    </label>
                  </RadioGroup>
                )}
              />
            </div>

            {resetForm.watch('password_mode') === 'manual' && (
              <Field error={resetForm.formState.errors.password?.message}>
                <FieldLabel htmlFor="reset-manual-password">{t('users:passwordLabel')} *</FieldLabel>
                <PasswordInput
                  id="reset-manual-password"
                  placeholder={t('users:passwordPlaceholder')}
                  hasError={!!resetForm.formState.errors.password}
                  {...resetForm.register('password')}
                />
                {resetForm.formState.errors.password && (
                  <FieldError>{resetForm.formState.errors.password.message}</FieldError>
                )}
              </Field>
            )}

            <div className="sticky bottom-0 -mx-6 -mb-6 mt-6 flex items-center justify-end gap-3 border-t border-border bg-card/95 px-6 py-4 backdrop-blur-xs">
              <Button
                type="button"
                variant="outline"
                onClick={() => setResetDialogOpen(false)}
                disabled={resetForm.formState.isSubmitting}
              >
                {t('users:cancelButton')}
              </Button>
              <Button type="submit" disabled={resetForm.formState.isSubmitting}>
                {resetForm.formState.isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  t('users:resetPassword')
                )}
              </Button>
            </div>
          </form>
        </ResponsiveDialog>

        {/* Staff Detail Drawer / Sheet */}
        <ResponsiveDialog
          open={detailOpen}
          onOpenChange={setDetailOpen}
          title={t('users:staffDetails')}
          description={targetStaff ? `#${targetStaff.id} — ${targetStaff.name}` : ''}
          className="sm:max-w-lg"
        >
          {targetStaff && (
            <div className="space-y-5 py-2">
              <div className="flex items-center gap-4 border-b border-border/60 pb-4">
                <UserAvatar name={targetStaff.name} email={targetStaff.email} size="lg" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-base text-foreground truncate">
                      {targetStaff.name}
                    </h3>
                    <Badge
                      variant={targetStaff.role === 'owner' ? 'default' : 'secondary'}
                      className="text-[10px]"
                    >
                      {targetStaff.role === 'owner' ? t('users:roleOwner') : t('users:roleCashier')}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground font-mono truncate">
                    {targetStaff.email}
                  </p>
                  {targetStaff.phone && (
                    <p className="text-xs text-muted-foreground font-mono">
                      {targetStaff.phone}
                    </p>
                  )}
                </div>
              </div>

              {/* Aggregates & Metrics */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-border/80 bg-muted/30 p-3 space-y-1">
                  <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <ShoppingBag className="h-3.5 w-3.5 text-primary" />
                    {t('users:salesTodayCol')}
                  </span>
                  <div className="text-lg font-bold text-foreground">
                    <Money amount={targetStaff.sales_total_today || 0} />
                  </div>
                  <span className="text-[11px] text-muted-foreground">
                    {t('users:salesCount', { count: targetStaff.sales_count || 0 })}
                  </span>
                </div>

                <div className="rounded-lg border border-border/80 bg-muted/30 p-3 space-y-1">
                  <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-primary" />
                    {t('users:lastLoginCol')}
                  </span>
                  <div className="text-sm font-semibold text-foreground pt-1">
                    {targetStaff.last_login_at
                      ? formatRelative(targetStaff.last_login_at)
                      : t('users:neverLoggedIn')}
                  </div>
                </div>
              </div>

              {/* Profile Details List */}
              <div className="rounded-lg border border-border/80 divide-y divide-border/60 text-xs">
                <div className="flex items-center justify-between p-3">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <Calendar className="h-3.5 w-3.5" />
                    Member Since
                  </span>
                  <span className="font-medium text-foreground">
                    {targetStaff.created_at ? formatDate(targetStaff.created_at) : '—'}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <Mail className="h-3.5 w-3.5" />
                    Email
                  </span>
                  <span className="font-mono font-medium text-foreground">
                    {targetStaff.email}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <Phone className="h-3.5 w-3.5" />
                    Phone
                  </span>
                  <span className="font-mono font-medium text-foreground">
                    {targetStaff.phone || '—'}
                  </span>
                </div>
              </div>

              {/* Quick Action Buttons */}
              <div className="flex flex-wrap gap-2 pt-2 border-t border-border/60">
                {!targetStaff.deleted_at && (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleOpenEdit(targetStaff)}
                      className="gap-1.5"
                      disabled={targetStaff.role === 'owner'}
                    >
                      <Edit className="h-3.5 w-3.5" />
                      {t('users:editStaff')}
                    </Button>

                    {targetStaff.id !== currentUser?.id && targetStaff.role !== 'owner' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenReset(targetStaff)}
                        className="gap-1.5"
                      >
                        <KeyRound className="h-3.5 w-3.5" />
                        {t('users:resetPassword')}
                      </Button>
                    )}

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setRevokeDialogOpen(true)
                      }}
                      className="gap-1.5"
                    >
                      <Smartphone className="h-3.5 w-3.5" />
                      {t('users:revokeSessions')}
                    </Button>
                  </>
                )}
              </div>
            </div>
          )}
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

        {/* Confirm Archive Dialog */}
        <ConfirmDialog
          open={archiveDialogOpen}
          onOpenChange={setArchiveDialogOpen}
          title={t('users:confirmArchiveTitle')}
          description={t('users:confirmArchiveDesc', { name: targetStaff?.name })}
          confirmText={t('users:confirmArchiveButton')}
          cancelText={t('users:dontProceed')}
          tone="destructive"
          onConfirm={handleConfirmArchive}
          isLoading={archiveMutation.isPending}
        />

        {/* Confirm Restore Dialog */}
        <ConfirmDialog
          open={restoreDialogOpen}
          onOpenChange={setRestoreDialogOpen}
          title={t('users:confirmRestoreTitle')}
          description={t('users:confirmRestoreDesc', { name: targetStaff?.name })}
          confirmText={t('users:confirmRestoreButton')}
          cancelText={t('users:dontProceed')}
          tone="default"
          onConfirm={handleConfirmRestore}
          isLoading={restoreMutation.isPending}
        />

        {/* Confirm Revoke Sessions Dialog */}
        <ConfirmDialog
          open={revokeDialogOpen}
          onOpenChange={setRevokeDialogOpen}
          title={t('users:confirmRevokeTitle')}
          description={t('users:confirmRevokeDesc', { name: targetStaff?.name })}
          confirmText={t('users:confirmRevokeButton')}
          cancelText={t('users:dontProceed')}
          tone="default"
          onConfirm={handleConfirmRevoke}
          isLoading={revokeSessionsMutation.isPending}
        />
      </PageContainer>
    </TooltipProvider>
  )
}

export default StaffPage
