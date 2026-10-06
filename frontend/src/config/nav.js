import {
  LayoutDashboard,
  ScanBarcode,
  ReceiptText,
  Package,
  Tags,
  Warehouse,
  Users,
  NotebookPen,
  ChartColumn,
  UserCog,
  Settings,
} from 'lucide-react'

export const NAV_GROUPS = [
  {
    title: 'Overview',
    items: [
      {
        title: 'Dashboard',
        path: '/dashboard',
        icon: LayoutDashboard,
        ability: null, // Available to all authenticated roles
      },
      {
        title: 'POS',
        path: '/pos',
        icon: ScanBarcode,
        ability: 'pos.use',
      },
      {
        title: 'Sales',
        path: '/sales',
        icon: ReceiptText,
        ability: null, // Owner sees all, Cashier sees own
      },
    ],
  },
  {
    title: 'Inventory',
    items: [
      {
        title: 'Products',
        path: '/products',
        icon: Package,
        ability: 'products.view',
      },
      {
        title: 'Categories',
        path: '/categories',
        icon: Tags,
        ability: 'categories.manage',
      },
      {
        title: 'Stock',
        path: '/inventory',
        icon: Warehouse,
        ability: 'inventory.adjust',
        badgeKey: 'lowStock',
      },
    ],
  },
  {
    title: 'Customers',
    items: [
      {
        title: 'Customers',
        path: '/customers',
        icon: Users,
        ability: 'customers.view',
      },
      {
        title: 'Utang',
        path: '/utang',
        icon: NotebookPen,
        ability: 'utang.record_payment',
        badgeKey: 'overdueUtang',
      },
    ],
  },
  {
    title: 'Insights',
    items: [
      {
        title: 'Reports',
        path: '/reports',
        icon: ChartColumn,
        ability: 'reports.view',
      },
    ],
  },
  {
    title: 'Admin',
    items: [
      {
        title: 'Staff',
        path: '/staff',
        icon: UserCog,
        ability: 'staff.manage',
      },
      {
        title: 'Settings',
        path: '/settings',
        icon: Settings,
        ability: 'settings.manage',
      },
    ],
  },
]
