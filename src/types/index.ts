// Core permission types
export type Permission = string;

export type PermissionSet = Set<Permission>;

// Condition function that can be applied to permissions
export type ConditionFunction<T = any> = (context: T) => boolean;

// Permission with optional condition
export interface PermissionRule<T = any> {
  permission: Permission;
  condition?: ConditionFunction<T>;
}

export interface IPermissionConfig {
  permissions: string[];
  requireAll?: boolean; // true = AND logic, false = OR logic (default)
}

export type PermissionCheck = string | string[] | IPermissionConfig;

// User context that can be passed to conditions
export interface UserContext {
  id?: string | number;
  roles?: string[];
  [key: string]: any;
}

// Main configuration for the PBAC system
export interface PBACConfig<T = UserContext> {
  permissions: Permission[];
  user?: T;
  roles?: string[];
  rolePermissions?: Map<string, PermissionSet>;
}

// Permission check result
export interface PermissionCheckResult {
  allowed: boolean;
  reason?: string;
}
