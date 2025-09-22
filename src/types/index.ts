// Core permission types
export type Permission = string;

// Condition function that can be applied to permissions
export type ConditionFunction<T = any> = (context: T) => boolean;

// Permission with optional condition
export interface PermissionRule<T = any> {
  permission: Permission;
  condition?: ConditionFunction<T>;
}

// User context that can be passed to conditions
export interface UserContext {
  id: string | number;
  [key: string]: any;
}

// Main configuration for the PBAC system
export interface PBACConfig<T = UserContext> {
  permissions: Permission[];
  user?: T;
}

// Permission check result
export interface PermissionCheckResult {
  allowed: boolean;
  reason?: string;
}
