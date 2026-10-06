import { lazy, Suspense } from 'react'
import { createBrowserRouter } from 'react-router'

// Layouts
import { AppLayout } from '@/components/layout/AppLayout'
import { AuthLayout } from '@/components/layout/AuthLayout'
import { PosLayout } from '@/components/layout/PosLayout'
import { PublicLayout } from '@/components/layout/PublicLayout'
import { MinimalLayout } from '@/components/layout/MinimalLayout'

// Guards
import { ProtectedRoute } from '@/routes/ProtectedRoute'
import { GuestRoute } from '@/routes/GuestRoute'
import { RoleRoute } from '@/routes/RoleRoute'

// Error Boundary
import { RouteErrorBoundary } from '@/features/system/RouteErrorBoundary'

// Lazy-loaded pages
const LandingPage = lazy(() =>
  import('@/features/landing/pages/LandingPage').then((m) => ({
    default: m.LandingPage,
  })),
)
const LoginPage = lazy(() =>
  import('@/features/auth/pages/LoginPage').then((m) => ({
    default: m.LoginPage,
  })),
)
const RegisterPage = lazy(() =>
  import('@/features/auth/pages/RegisterPage').then((m) => ({
    default: m.RegisterPage,
  })),
)
const ForgotPasswordPage = lazy(() =>
  import('@/features/auth/pages/ForgotPasswordPage').then((m) => ({
    default: m.ForgotPasswordPage,
  })),
)
const ResetPasswordPage = lazy(() =>
  import('@/features/auth/pages/ResetPasswordPage').then((m) => ({
    default: m.ResetPasswordPage,
  })),
)
const DashboardPage = lazy(() =>
  import('@/features/dashboard/pages/DashboardPage').then((m) => ({
    default: m.DashboardPage,
  })),
)
const PosPage = lazy(() =>
  import('@/features/pos/pages/PosPage').then((m) => ({ default: m.PosPage })),
)
const SalesPage = lazy(() =>
  import('@/features/sales/pages/SalesPage').then((m) => ({
    default: m.SalesPage,
  })),
)
const SaleDetailPage = lazy(() =>
  import('@/features/sales/pages/SaleDetailPage').then((m) => ({
    default: m.SaleDetailPage,
  })),
)
const ProductsPage = lazy(() =>
  import('@/features/products/pages/ProductsPage').then((m) => ({
    default: m.ProductsPage,
  })),
)
const ProductDetailPage = lazy(() =>
  import('@/features/products/pages/ProductDetailPage').then((m) => ({
    default: m.ProductDetailPage,
  })),
)
const CategoriesPage = lazy(() =>
  import('@/features/categories/pages/CategoriesPage').then((m) => ({
    default: m.CategoriesPage,
  })),
)
const InventoryPage = lazy(() =>
  import('@/features/inventory/pages/InventoryPage').then((m) => ({
    default: m.InventoryPage,
  })),
)
const CustomersPage = lazy(() =>
  import('@/features/customers/pages/CustomersPage').then((m) => ({
    default: m.CustomersPage,
  })),
)
const CustomerDetailPage = lazy(() =>
  import('@/features/customers/pages/CustomerDetailPage').then((m) => ({
    default: m.CustomerDetailPage,
  })),
)
const UtangPage = lazy(() =>
  import('@/features/utang/pages/UtangPage').then((m) => ({
    default: m.UtangPage,
  })),
)
const ReportsPage = lazy(() =>
  import('@/features/reports/pages/ReportsPage').then((m) => ({
    default: m.ReportsPage,
  })),
)
const StaffPage = lazy(() =>
  import('@/features/staff/pages/StaffPage').then((m) => ({
    default: m.StaffPage,
  })),
)
const SettingsPage = lazy(() =>
  import('@/features/settings/pages/SettingsPage').then((m) => ({
    default: m.SettingsPage,
  })),
)
const AccountPage = lazy(() =>
  import('@/features/account/pages/AccountPage').then((m) => ({
    default: m.AccountPage,
  })),
)
const DevUiPage = lazy(() =>
  import('@/features/dev/pages/DevUiPage').then((m) => ({
    default: m.DevUiPage,
  })),
)
const ForbiddenPage = lazy(() =>
  import('@/features/system/ForbiddenPage').then((m) => ({
    default: m.ForbiddenPage,
  })),
)
const NotFoundPage = lazy(() =>
  import('@/features/system/NotFoundPage').then((m) => ({
    default: m.NotFoundPage,
  })),
)

function SuspenseWrap({ children }) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[50vh] items-center justify-center">
          <div className="border-primary h-8 w-8 animate-spin rounded-full border-4 border-t-transparent" />
        </div>
      }
    >
      {children}
    </Suspense>
  )
}

export const router = createBrowserRouter([
  // Public Landing route
  {
    path: '/',
    element: <PublicLayout />,
    errorElement: <RouteErrorBoundary />,
    children: [
      {
        index: true,
        element: (
          <SuspenseWrap>
            <LandingPage />
          </SuspenseWrap>
        ),
      },
    ],
  },

  // Guest Auth routes
  {
    element: (
      <GuestRoute>
        <AuthLayout />
      </GuestRoute>
    ),
    errorElement: <RouteErrorBoundary />,
    children: [
      {
        path: 'login',
        element: (
          <SuspenseWrap>
            <LoginPage />
          </SuspenseWrap>
        ),
      },
      {
        path: 'register',
        element: (
          <SuspenseWrap>
            <RegisterPage />
          </SuspenseWrap>
        ),
      },
      {
        path: 'forgot-password',
        element: (
          <SuspenseWrap>
            <ForgotPasswordPage />
          </SuspenseWrap>
        ),
      },
      {
        path: 'password-reset/:token',
        element: (
          <SuspenseWrap>
            <ResetPasswordPage />
          </SuspenseWrap>
        ),
      },
    ],
  },

  // Focus POS Shell
  {
    element: (
      <ProtectedRoute>
        <PosLayout />
      </ProtectedRoute>
    ),
    errorElement: <RouteErrorBoundary />,
    children: [
      {
        path: 'pos',
        handle: { breadcrumb: 'POS' },
        element: (
          <RoleRoute ability="pos.use">
            <SuspenseWrap>
              <PosPage />
            </SuspenseWrap>
          </RoleRoute>
        ),
      },
    ],
  },

  // Main App Shell (Sidebar + Topbar + Bottom Nav)
  {
    element: (
      <ProtectedRoute>
        <AppLayout />
      </ProtectedRoute>
    ),
    errorElement: <RouteErrorBoundary />,
    children: [
      {
        path: 'dashboard',
        handle: { breadcrumb: 'Dashboard' },
        element: (
          <SuspenseWrap>
            <DashboardPage />
          </SuspenseWrap>
        ),
      },
      {
        path: 'sales',
        handle: { breadcrumb: 'Sales' },
        element: (
          <SuspenseWrap>
            <SalesPage />
          </SuspenseWrap>
        ),
      },
      {
        path: 'sales/:id',
        handle: { breadcrumb: 'Sale Details' },
        element: (
          <SuspenseWrap>
            <SaleDetailPage />
          </SuspenseWrap>
        ),
      },
      {
        path: 'products',
        handle: { breadcrumb: 'Products' },
        element: (
          <RoleRoute ability="products.view">
            <SuspenseWrap>
              <ProductsPage />
            </SuspenseWrap>
          </RoleRoute>
        ),
      },
      {
        path: 'products/:id',
        handle: { breadcrumb: 'Product Details' },
        element: (
          <RoleRoute ability="products.view">
            <SuspenseWrap>
              <ProductDetailPage />
            </SuspenseWrap>
          </RoleRoute>
        ),
      },
      {
        path: 'categories',
        handle: { breadcrumb: 'Categories' },
        element: (
          <RoleRoute ability="categories.manage">
            <SuspenseWrap>
              <CategoriesPage />
            </SuspenseWrap>
          </RoleRoute>
        ),
      },
      {
        path: 'inventory',
        handle: { breadcrumb: 'Stock' },
        element: (
          <RoleRoute ability="inventory.adjust">
            <SuspenseWrap>
              <InventoryPage />
            </SuspenseWrap>
          </RoleRoute>
        ),
      },
      {
        path: 'customers',
        handle: { breadcrumb: 'Customers' },
        element: (
          <RoleRoute ability="customers.view">
            <SuspenseWrap>
              <CustomersPage />
            </SuspenseWrap>
          </RoleRoute>
        ),
      },
      {
        path: 'customers/:id',
        handle: { breadcrumb: 'Customer Profile' },
        element: (
          <RoleRoute ability="customers.view">
            <SuspenseWrap>
              <CustomerDetailPage />
            </SuspenseWrap>
          </RoleRoute>
        ),
      },
      {
        path: 'utang',
        handle: { breadcrumb: 'Utang' },
        element: (
          <RoleRoute ability="utang.record_payment">
            <SuspenseWrap>
              <UtangPage />
            </SuspenseWrap>
          </RoleRoute>
        ),
      },
      {
        path: 'reports',
        handle: { breadcrumb: 'Reports' },
        element: (
          <RoleRoute ability="reports.view">
            <SuspenseWrap>
              <ReportsPage />
            </SuspenseWrap>
          </RoleRoute>
        ),
      },
      {
        path: 'staff',
        handle: { breadcrumb: 'Staff' },
        element: (
          <RoleRoute ability="staff.manage">
            <SuspenseWrap>
              <StaffPage />
            </SuspenseWrap>
          </RoleRoute>
        ),
      },
      {
        path: 'settings',
        handle: { breadcrumb: 'Settings' },
        element: (
          <RoleRoute ability="settings.manage">
            <SuspenseWrap>
              <SettingsPage />
            </SuspenseWrap>
          </RoleRoute>
        ),
      },
      {
        path: 'account',
        handle: { breadcrumb: 'Account' },
        element: (
          <RoleRoute ability="account.manage">
            <SuspenseWrap>
              <AccountPage />
            </SuspenseWrap>
          </RoleRoute>
        ),
      },
      {
        path: 'dev/ui',
        handle: { breadcrumb: 'UI Kit (Dev)' },
        element: (
          <RoleRoute roles={['owner']}>
            <SuspenseWrap>
              <DevUiPage />
            </SuspenseWrap>
          </RoleRoute>
        ),
      },
    ],
  },

  // Minimal Layout (403, 404, etc.)
  {
    element: <MinimalLayout />,
    errorElement: <RouteErrorBoundary />,
    children: [
      {
        path: '403',
        element: (
          <SuspenseWrap>
            <ForbiddenPage />
          </SuspenseWrap>
        ),
      },
      {
        path: '*',
        element: (
          <SuspenseWrap>
            <NotFoundPage />
          </SuspenseWrap>
        ),
      },
    ],
  },
])
