import { UserCheck, Shield, Palette } from 'lucide-react'
import { PageContainer } from '@/components/layout/PageContainer'
import { PageHeader } from '@/components/layout/PageHeader'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useAuth } from '@/hooks/useAuth'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { getAvatarUrl, getInitials } from '@/lib/avatar'

export function AccountPage() {
  useDocumentTitle('My Account')
  const { user } = useAuth()

  const avatarUrl = getAvatarUrl(user?.name || user?.email)
  const initials = getInitials(user?.name || user?.email)

  return (
    <PageContainer>
      <PageHeader
        title="My Account"
        description="Profile details, security credentials, and application preferences"
      />

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {/* Profile Card */}
        <Card className="border-border/80 md:col-span-1">
          <CardHeader className="pb-2 text-center">
            <Avatar className="mx-auto mb-3 h-20 w-20 rounded-2xl">
              <AvatarImage src={avatarUrl} alt={user?.name} />
              <AvatarFallback className="bg-primary/10 text-primary rounded-2xl text-xl font-bold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <CardTitle className="text-lg font-bold">{user?.name}</CardTitle>
            <CardDescription className="text-xs">{user?.email}</CardDescription>
            <div className="pt-2">
              <Badge
                variant={user?.role === 'owner' ? 'default' : 'secondary'}
                className="text-[10px] uppercase"
              >
                {user?.role_label || user?.role}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="text-muted-foreground border-border mt-4 space-y-2 border-t pt-4 text-xs">
            <div className="flex justify-between">
              <span>Account Status:</span>
              <span className="text-success font-semibold">Active</span>
            </div>
            <div className="flex justify-between">
              <span>Member Since:</span>
              <span>
                {user?.created_at
                  ? new Date(user.created_at).toLocaleDateString()
                  : 'Today'}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Security & Appearance placeholders */}
        <div className="space-y-6 md:col-span-2">
          <Card className="border-border/80">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Shield className="text-primary h-4 w-4" />
                Security & Authentication
              </CardTitle>
              <CardDescription>
                Password updates and active sessions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm">
                Your account is authenticated via Laravel Sanctum bearer tokens.
                Password change dialog will be available in the next phase.
              </p>
            </CardContent>
          </Card>

          <Card className="border-border/80">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Palette className="text-primary h-4 w-4" />
                Appearance
              </CardTitle>
              <CardDescription>
                Color theme and layout preferences
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm">
                You can toggle between Light and Dark mode using the sun/moon
                icon in the topbar or sidebar profile menu.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </PageContainer>
  )
}
