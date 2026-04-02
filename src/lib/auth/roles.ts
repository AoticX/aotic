import type { AppRole } from '@/types/database'

// ---------------------------------------------------------------------------
// ROLE CONSTANTS
// ---------------------------------------------------------------------------

export const ROLES = {
  OWNER: 'owner' as AppRole,
  BRANCH_MANAGER: 'branch_manager' as AppRole,
  SALES_EXECUTIVE: 'sales_executive' as AppRole,
  WORKSHOP_TECHNICIAN: 'workshop_technician' as AppRole,
  QC_INSPECTOR: 'qc_inspector' as AppRole,
  ACCOUNTS_FINANCE: 'accounts_finance' as AppRole,
  FRONT_DESK: 'front_desk' as AppRole,
} as const

// ---------------------------------------------------------------------------
// ROLE DISPLAY LABELS
// ---------------------------------------------------------------------------

export const ROLE_LABELS: Record<AppRole, string> = {
  owner:                'Owner / Super Admin',
  branch_manager:       'Branch Manager / Supervisor',
  sales_executive:      'Sales Executive',
  workshop_technician:  'Workshop Technician',
  qc_inspector:         'QC Inspector',
  accounts_finance:     'Accounts / Finance',
  front_desk:           'Front Desk / Customer Support',
}

// ---------------------------------------------------------------------------
// ROLE → DEFAULT REDIRECT AFTER LOGIN
// Technician and QC get mobile-first /workshop routes
// All others get desktop /dashboard routes
// ---------------------------------------------------------------------------

export const ROLE_DEFAULT_ROUTES: Record<AppRole, string> = {
  owner:                '/owner',
  branch_manager:       '/manager',
  sales_executive:      '/sales',
  workshop_technician:  '/technician',
  qc_inspector:         '/qc',
  accounts_finance:     '/accounts',
  front_desk:           '/front-desk',
}

// ---------------------------------------------------------------------------
// ROUTE → ALLOWED ROLES MAP
// Used in middleware to guard every route segment
// ---------------------------------------------------------------------------

export const PROTECTED_ROUTES: Record<string, AppRole[]> = {
  '/owner':       ['owner'],
  '/manager':     ['owner', 'branch_manager'],
  '/sales':       ['owner', 'branch_manager', 'sales_executive', 'front_desk'],
  '/accounts':    ['owner', 'branch_manager', 'accounts_finance'],
  '/front-desk':  ['owner', 'branch_manager', 'front_desk'],
  '/technician':  ['owner', 'branch_manager', 'workshop_technician'],
  '/qc':          ['owner', 'branch_manager', 'qc_inspector'],
}

// ---------------------------------------------------------------------------
// PERMISSION HELPERS
// ---------------------------------------------------------------------------

/** Roles that can see all financial data */
export const FINANCE_ROLES: AppRole[] = ['owner', 'branch_manager', 'accounts_finance']

/** Roles that can approve discounts >5% */
export const DISCOUNT_APPROVER_ROLES: AppRole[] = ['owner']

/** Roles that can override the 70% advance lock */
export const ADVANCE_OVERRIDE_ROLES: AppRole[] = ['owner', 'branch_manager']

/** Roles that can sign off on QC */
export const QC_SIGNOFF_ROLES: AppRole[] = ['owner', 'branch_manager', 'qc_inspector']

/** Roles that can create job cards */
export const JOB_CARD_CREATOR_ROLES: AppRole[] = ['owner', 'branch_manager']

/** Roles that use the MOBILE-FIRST interface */
export const MOBILE_ROLES: AppRole[] = ['workshop_technician', 'qc_inspector']

/** Roles that use the DESKTOP-FIRST interface */
export const DESKTOP_ROLES: AppRole[] = [
  'owner',
  'branch_manager',
  'sales_executive',
  'accounts_finance',
  'front_desk',
]

// ---------------------------------------------------------------------------
// GUARDS
// ---------------------------------------------------------------------------

export function isMobileRole(role: AppRole): boolean {
  return MOBILE_ROLES.includes(role)
}

export function canApproveDiscount(role: AppRole): boolean {
  return DISCOUNT_APPROVER_ROLES.includes(role)
}

export function canOverrideAdvance(role: AppRole): boolean {
  return ADVANCE_OVERRIDE_ROLES.includes(role)
}

export function canSignOffQC(role: AppRole): boolean {
  return QC_SIGNOFF_ROLES.includes(role)
}

export function isRouteAllowed(pathname: string, role: AppRole): boolean {
  // Find the most specific matching route prefix
  const matchedRoute = Object.keys(PROTECTED_ROUTES)
    .filter((route) => pathname.startsWith(route))
    .sort((a, b) => b.length - a.length)[0]

  if (!matchedRoute) return true  // unprotected route
  return PROTECTED_ROUTES[matchedRoute].includes(role)
}

export function getDefaultRoute(role: AppRole): string {
  return ROLE_DEFAULT_ROUTES[role] ?? '/login'
}
