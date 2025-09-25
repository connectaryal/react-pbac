import {
  Permission,
  UserContext,
  PBACConfig,
  PermissionCheckResult,
  ConditionFunction,
  PermissionSet,
} from "../types";

export class PBACCore<T = UserContext> {
  private permissions: PermissionSet;
  private rules: Map<Permission, ConditionFunction<T>> = new Map();
  private user?: T;
  private roles: Set<string> = new Set();
  private rolePermissions: Map<string, PermissionSet> = new Map();

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
   * Get current user context
   */
  getUser(): T | undefined {
    return this.user;
  }

  /**
   * Set or update the user context
   */
  setUser(user: T): void {
    this.user = user;
  }

  /**
   * Get all permissions
   */
  getPermissions(): PermissionSet {
    return this.permissions;
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
   * Get all roles
   */
  getRoles(): PermissionSet {
    return this.roles;
  }

  /**
   * Set roles (replaces existing roles)
   */
  setRoles(roles: string[]): void {
    this.roles = new Set(roles);
  }

  /**
   * Add roles to existing set
   */
  addRoles(roles: string[]): void {
    roles.forEach((role) => this.roles.add(role));
  }

  /**
   * Remove roles
   */
  removeRoles(roles: string[]): void {
    roles.forEach((role) => {
      this.roles.delete(role);
      this.rolePermissions.delete(role);
    });
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
  hasWildcardRole(permissions: PermissionSet): boolean {
    return permissions.has("*");
  }

  /**
   * Get all role permissions
   */
  getAllRolePermissions(): Map<string, PermissionSet> {
    return this.rolePermissions;
  }

  /**
   * Set role permissions (replaces existing)
   */
  setRolePermissions(rolePermissions: Map<string, PermissionSet>): void {
    this.rolePermissions = new Map(rolePermissions);
  }

  /**
   * Get permissions for a specific role
   */
  getRolePermissions(role: string): PermissionSet {
    if (!this.isValidRole(role)) {
      throw new Error(`Role '${role}' is not valid.`);
    }

    const perms = this.rolePermissions.get(role);
    return perms ? new Set(perms) : new Set();
  }
  /**
   * Format permission names, (if single make it an array)
   */
  formatPermissionNames(names: Permission | Permission[]): Permission[] {
    if (!Array.isArray(names)) {
      return [names];
    }
    return names;
  }

  /**
   * Add a condition to a permission
   */
  setCondition(permission: Permission, condition: ConditionFunction<T>): void {
    if (!this.permissions.has(permission)) {
      throw new Error(
        `Cannot add condition. Permission '${permission}' does not exist.`
      );
    }
    this.rules.set(permission, condition);
  }

  /**
   * Get condition for a permission
   */
  getCondition(permission: Permission): ConditionFunction<T> | undefined {
    return this.rules.get(permission);
  }

  /**
   * Remove all conditions for a permission
   */
  clearConditions(permission: Permission): void {
    this.rules.delete(permission);
  }

  /**
   * Check if a role has a specific permission
   */
  hasRolePermission(role: string, permission: Permission): boolean {
    const rolePermissions = this.getRolePermissions(role);

    if (this.hasWildcardRole(rolePermissions)) {
      return true;
    }

    return rolePermissions.has(permission);
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
      if (!wildcardConditions) {
        return { allowed: true };
      }

      // If wildcard has conditions, evaluate them
      const evaluationContext = {
        ...this.user,
        ...context,
      } as T;

      try {
        if (!wildcardConditions(evaluationContext)) {
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

      return { allowed: true };
    }

    // Standard permission check with conditions
    const conditions = this.rules.get(permission);
    if (!conditions) {
      return { allowed: true };
    }

    // Create context for condition evaluation
    const evaluationContext = {
      ...this.user,
      ...context,
    } as T;

    // Execute the condition function
    try {
      if (!conditions(evaluationContext)) {
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
