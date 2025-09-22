import { useCallback, useMemo } from "react";
import { Permission, PermissionCheckResult, UserContext } from "../../types";
import { usePBAC } from "../context/PBACContext";

// Hook for getting all user permissions and related info
export function usePermissions<T = UserContext>() {
  const { pbac, setPermissions, addPermissions, removePermissions } =
    usePBAC<T>();

  const permissions = useMemo(() => pbac.getPermissions(), [pbac]);

  return {
    permissions,
    setPermissions: useCallback(
      (newPermissions: Permission[]) => {
        setPermissions(newPermissions);
      },
      [setPermissions]
    ),
    addPermissions: useCallback(
      (newPermissions: Permission[]) => {
        addPermissions(newPermissions);
      },
      [addPermissions]
    ),
    removePermissions: useCallback(
      (permissionsToRemove: Permission[]) => {
        removePermissions(permissionsToRemove);
      },
      [removePermissions]
    ),
    hasPermission: useCallback(
      (permission: Permission) => {
        return pbac.hasPermission(permission);
      },
      [pbac]
    ),
  };
}

// Hook for user management
export function useUser<T = UserContext>() {
  const { getUser, setUser } = usePBAC<T>();

  const user = useMemo(() => getUser(), [getUser]);

  return {
    user,
    setUser: useCallback(
      (newUser: T) => {
        setUser(newUser);
      },
      [setUser]
    ),
    isLoggedIn: user !== undefined,
    userId: (user as any)?.id,
  };
}

// Hook for dynamic permission checking with multiple scenarios
export function usePermissionChecker<T = UserContext>() {
  const { pbac } = usePBAC<T>();

  return useCallback(
    (
      permission: Permission | Permission[],
      context?: Partial<T>,
      mode: "any" | "all" = "all"
    ): PermissionCheckResult => {
      if (Array.isArray(permission)) {
        return mode === "any"
          ? pbac.canAny(permission, context)
          : pbac.canAll(permission, context);
      }
      return pbac.can(permission, context);
    },
    [pbac]
  );
}

// Hook for conditional permission checking (useful for forms, etc.)
export function useConditionalPermission<T = UserContext>(
  permission: Permission,
  condition: (context?: Partial<T>) => boolean,
  context?: Partial<T>
) {
  const { pbac } = usePBAC<T>();

  return useMemo(() => {
    // First check if condition passes
    if (!condition(context)) {
      return {
        allowed: false,
        reason: "Condition not met",
        can: false,
      };
    }

    // Then check permission
    const result = pbac.can(permission, context);
    return {
      allowed: result.allowed,
      reason: result.reason,
      can: result.allowed,
    };
  }, [pbac, permission, condition, context]);
}

// Hook for resource-based permissions (common pattern)
export function useResourcePermission<T = UserContext, R = any>(
  action: string, // e.g., 'create', 'edit', 'delete', 'view'
  resource: string, // e.g., 'posts', 'users', 'comments'
  resourceData?: R,
  context?: Partial<T>
) {
  const { pbac } = usePBAC<T>();

  // Generate permission string: resource.action (e.g., 'posts.edit')
  const permission = `${resource}.${action}`;

  return useMemo(() => {
    const mergedContext = {
      ...context,
      [resource.slice(0, -1)]: resourceData, // 'posts' -> 'post'
      action,
      resource,
    } as unknown as Partial<T>;

    const result = pbac.can(permission, mergedContext);
    return {
      allowed: result.allowed,
      reason: result.reason,
      can: result.allowed,
      permission,
      resource,
      action,
    };
  }, [pbac, permission, resourceData, context, action, resource]);
}

// Hook for permission debugging (development helper)
export function usePermissionDebug<T = UserContext>() {
  const { pbac } = usePBAC<T>();

  return {
    getAllPermissions: () => pbac.getPermissions(),
    getUser: () => pbac.getUser(),
    testPermission: (permission: Permission, context?: Partial<T>) => {
      const result = pbac.can(permission, context);
      console.log(`Permission Test: ${permission}`, {
        allowed: result.allowed,
        reason: result.reason,
        context,
        user: pbac.getUser(),
        allPermissions: pbac.getPermissions(),
      });
      return result;
    },
  };
}
