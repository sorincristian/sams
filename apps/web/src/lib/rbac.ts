type RBACUser = {
  role?: string;
  permissions?: Record<string, string>;
  scope?: { garages: string[] };
} | null;

export function canView(user: RBACUser, module: string): boolean {
  if (!user) return false;
  if (user.role === 'SYSTEM_ADMIN') return true;
  if (!user.permissions) return false;
  const access = user.permissions[module];
  return access === 'view' || access === 'manage';
}

export function canManage(user: RBACUser, module: string): boolean {
  if (!user) return false;
  if (user.role === 'SYSTEM_ADMIN') return true;
  if (!user.permissions) return false;
  return user.permissions[module] === 'manage';
}

export function hasGarageScope(user: RBACUser, garageId: string): boolean {
  if (!user || !user.scope || !user.scope.garages) return false;
  return user.scope.garages.includes(garageId);
}
