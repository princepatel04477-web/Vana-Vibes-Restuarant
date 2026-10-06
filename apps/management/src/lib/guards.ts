/**
 * Role-Based Access Control Guards for Cafe Management and Live Tables
 *
 * Mappings:
 * - 'owner' -> role === 'ADMIN' | 'owner'
 * - 'staff' -> role === 'CHEF' | 'STAFF' | 'staff'
 * Note: 'ADMIN'/'owner' possesses super-access to all staff routes.
 */

export type CafeRole = 'owner' | 'staff';

export interface UserSession {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'CHEF' | 'STAFF' | 'owner' | 'staff';
  cafeId?: string;
}

/**
 * Validates if the user's role satisfies any of the required cafe roles.
 */
export function hasCafeRole(
  userRole: string | undefined | null,
  requiredRoles: CafeRole[]
): boolean {
  if (!userRole) return false;
  const normalized = userRole.toUpperCase();

  const isOwner = normalized === 'ADMIN' || normalized === 'OWNER';
  const isStaff = normalized === 'CHEF' || normalized === 'STAFF';

  for (const r of requiredRoles) {
    if (r === 'owner' && isOwner) return true;
    if (r === 'staff' && (isStaff || isOwner)) return true; // Owner has staff capabilities
  }

  return false;
}

/**
 * Server guard checking authorization or throwing an error.
 */
export function requireCafeRole(
  user: { role?: string; id?: string } | null | undefined,
  requiredRoles: CafeRole[]
): void {
  if (!user) {
    throw new Error('Authentication required: No active user session found.');
  }

  if (!hasCafeRole(user.role, requiredRoles)) {
    throw new Error(
      `Access denied: Required role [${requiredRoles.join(', ')}], but current role is '${user.role || 'unknown'}'.`
    );
  }
}

/**
 * Owner-only assertion guard.
 */
export function requireOwnerRole(user: { role?: string; id?: string } | null | undefined): void {
  requireCafeRole(user, ['owner']);
}
