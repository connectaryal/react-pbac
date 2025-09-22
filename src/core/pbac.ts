import {
  Permission,
  UserContext,
  PBACConfig,
  PermissionCheckResult,
  ConditionFunction,
} from "../types";

export class PBACCore<T = UserContext> {
  private permissions: Set<Permission>;
  private readonly rules: Map<Permission, ConditionFunction<T>[]>;
  private user?: T;
  private roles: Set<string> = new Set();
  private rolePermissions: Map<string, Set<Permission>> = new Map();

  /**
   * Initialize PBAC system with config
   */
  constructor(config: PBACConfig<T>) {
    this.permissions = new Set(config.permissions);
    this.rules = new Map();
    this.roles = new Set(config.roles);
    this.user = config.user;
    this.rolePermissions = new Map(config.rolePermissions);
  }

  /**
   * Set or update the user context
   */
  setUser(user: T): void {
    this.user = user;
  }

  /**
   * Get current user context
   */
  getUser(): T | undefined {
    return this.user;
  }

  /**
   * Set permissions (replaces existing permissions)
   */
  setPermissions(permissions: Permission[]): void {
    this.permissions = new Set(permissions);
  }

  /**
   * Add permissions to existing set
   */
  addPermissions(permissions: Permission[]): void {
    permissions.forEach((permission) => this.permissions.add(permission));
  }

  /**
   * Remove permissions
   */
  removePermissions(permissions: Permission[]): void {
    permissions.forEach((permission) => {
      this.permissions.delete(permission);
      this.rules.delete(permission);
    });
  }

  /**
   * Set roles (replaces existing roles)
   */
  setRoles(roles: string[]): void {
    this.roles = new Set(roles);
  }

  /**
   * Check if a role exists in the system
   */
  hasRole(role: string): boolean {
    return this.roles.has(role);
  }

  /**
   * Check if the role is valid
   */
  isValidRole(role: string): boolean {
    return this.roles.has(role);
  }

  /**
   * Is wildcard role present
   */
  hasWildcardRole(permissions: Set<Permission>): boolean {
    return permissions.has("*");
  }

  /**
   * Get all role permissions
   */
  getAllRolePermissions(): Map<string, Set<Permission>> {
    return this.rolePermissions;
  }

  /**
   * Set role permissions (replaces existing)
   */
  setRolePermissions(rolePermissions: Map<string, Set<Permission>>): void {
    this.rolePermissions = new Map(rolePermissions);
  }

  /**
   * Get permissions for a specific role
   */
  getRolePermissions(role: string): Set<Permission> {
    if (!this.isValidRole(role)) {
      throw new Error(`Role '${role}' is not valid.`);
    }

    const perms = this.rolePermissions.get(role);
    return perms ? new Set(perms) : new Set();
  }

  /**
   * Check if a role has a specific permission
   */
  hasRolePermissions(role: string, permission: Permission): boolean {
    const roles = this.getRolePermissions(role);

    if (this.hasWildcardRole(roles)) {
      return true;
    }

    return roles.has(permission);
  }

  /**
   * Format permission names, (if single make it an array)
   */
  formatPermissionNames(permissions: Permission | Permission[]): Permission[] {
    if (!Array.isArray(permissions)) {
      return [permissions];
    }
    return permissions;
  }

  /**
   * Get all permissions
   */
  getPermissions(): Permission[] {
    return Array.from(this.permissions);
  }

  /**
   * Add a condition to a permission
   */
  addCondition(permission: Permission, condition: ConditionFunction<T>): void {
    if (!this.rules.has(permission)) {
      this.rules.set(permission, []);
    }
    this.rules.get(permission)!.push(condition);
  }

  /**
   * Remove all conditions for a permission
   */
  clearConditions(permission: Permission): void {
    this.rules.delete(permission);
  }

  hasRolePermission(role: string, permission: Permission): boolean {
    // Check for wildcard permission (super-admin access)
    if (this.hasWildcardRole(this.permissions)) {
      return true;
    }

    return this.permissions.has(`${role}:${permission}`);
  }

  /**
   * Check if user has a specific permission
   * Returns true if user has the specific permission or wildcard (*) access
   */
  hasPermission(permission: Permission): boolean {
    // Check for wildcard permission (super-admin access)
    if (this.hasWildcardRole(this.permissions)) {
      return true;
    }

    return this.permissions.has(permission);
  }

  /**
   * Check permission with conditions
   * Wildcard (*) permissions bypass all conditions unless explicitly set
   */
  can(permission: Permission, context?: Partial<T>): PermissionCheckResult {
    // Check for wildcard permission (super-admin access)
    const hasWildcard = this.permissions.has("*");

    // First check if permission exists (specific or wildcard)
    if (!this.hasPermission(permission)) {
      return {
        allowed: false,
        reason: `Permission '${permission}' not granted`,
      };
    }

    // For wildcard permissions, check if there are specific conditions set for '*'
    if (hasWildcard && !this.permissions.has(permission)) {
      const wildcardConditions = this.rules.get("*");

      // If no conditions on wildcard, allow everything
      if (!wildcardConditions || wildcardConditions.length === 0) {
        return { allowed: true };
      }

      // If wildcard has conditions, evaluate them
      const evaluationContext = {
        ...this.user,
        ...context,
      } as T;

      for (const condition of wildcardConditions) {
        try {
          if (!condition(evaluationContext)) {
            return {
              allowed: false,
              reason: `Wildcard condition failed for permission '${permission}'`,
            };
          }
        } catch (error) {
          return {
            allowed: false,
            reason: `Error evaluating wildcard condition: ${error}`,
          };
        }
      }

      return { allowed: true };
    }

    // Standard permission check with conditions
    const conditions = this.rules.get(permission);
    if (!conditions || conditions.length === 0) {
      return { allowed: true };
    }

    // Create context for condition evaluation
    const evaluationContext = {
      ...this.user,
      ...context,
    } as T;

    // All conditions must pass
    for (const condition of conditions) {
      try {
        if (!condition(evaluationContext)) {
          return {
            allowed: false,
            reason: `Condition failed for permission '${permission}'`,
          };
        }
      } catch (error) {
        return {
          allowed: false,
          reason: `Error evaluating condition for permission '${permission}': ${error}`,
        };
      }
    }

    return { allowed: true };
  }

  /**
   * Check multiple permissions (all must pass)
   */
  canAll(
    permissions: Permission[],
    context?: Partial<T>
  ): PermissionCheckResult {
    for (const permission of permissions) {
      const result = this.can(permission, context);
      if (!result.allowed) {
        return result;
      }
    }
    return { allowed: true };
  }

  /**
   * Check multiple permissions (any can pass)
   */
  canAny(
    permissions: Permission[],
    context?: Partial<T>
  ): PermissionCheckResult {
    const failedReasons: string[] = [];

    for (const permission of permissions) {
      const result = this.can(permission, context);
      if (result.allowed) {
        return { allowed: true };
      }
      if (result.reason) {
        failedReasons.push(result.reason);
      }
    }

    return {
      allowed: false,
      reason: `None of the permissions passed: ${failedReasons.join(", ")}`,
    };
  }
}
