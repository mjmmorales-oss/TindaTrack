export const ALL_ABILITIES = [
  'dashboard.full',
  'pos.use',
  'sales.view_all',
  'sales.void',
  'products.view',
  'products.manage',
  'products.view_cost',
  'categories.manage',
  'inventory.adjust',
  'customers.view',
  'customers.manage',
  'customers.delete',
  'utang.record_payment',
  'reports.view',
  'staff.manage',
  'settings.manage',
  'account.manage',
]

export const ROLE_ABILITIES = {
  owner: ALL_ABILITIES,
  cashier: [
    'pos.use',
    'products.view',
    'customers.view',
    'customers.manage',
    'utang.record_payment',
    'account.manage',
  ],
}

/**
 * Check if a role possesses a given ability.
 * @param {string|null|undefined} role
 * @param {string} ability
 * @returns {boolean}
 */
export function hasAbility(role, ability) {
  if (!role || !ability) return false
  const abilities = ROLE_ABILITIES[role] || []
  return abilities.includes(ability)
}
