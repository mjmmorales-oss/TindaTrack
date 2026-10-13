/**
 * Dev-only demo accounts data.
 * This file is only loaded when import.meta.env.DEV is true
 * and is stripped from production bundles by Vite tree-shaking.
 */
export const DEMO_ACCOUNTS = [
  {
    role: 'Owner',
    email: 'owner@tindatrack.test',
    password: 'password',
    label: 'Owner Demo',
  },
  {
    role: 'Cashier',
    email: 'cashier@tindatrack.test',
    password: 'password',
    label: 'Cashier Demo',
  },
]
