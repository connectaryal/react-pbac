import { useMemo } from "react";
import { Permission, UserContext } from "../../types";
import { usePBAC } from "../context/PBACContext";

// Hook for checking a single permission with optional context
export function useCan<T = UserContext>(
  permission: Permission,
  context?: Partial<T>
) {
  const { pbac } = usePBAC<T>();

  return useMemo(() => {
    const result = pbac.can(permission, context);
    return {
      allowed: result.allowed,
      reason: result.reason,
      // Convenience boolean for quick checks
      can: result.allowed,
    };
  }, [pbac, permission, context]);
}

// Hook for checking multiple permissions (all must pass)
export function useCanAll<T = UserContext>(
  permissions: Permission[],
  context?: Partial<T>
) {
  const { pbac } = usePBAC<T>();

  return useMemo(() => {
    const result = pbac.canAll(permissions, context);
    return {
      allowed: result.allowed,
      reason: result.reason,
      can: result.allowed,
      permissions,
    };
  }, [pbac, permissions, context]);
}

// Hook for checking multiple permissions (any can pass)
export function useCanAny<T = UserContext>(
  permissions: Permission[],
  context?: Partial<T>
) {
  const { pbac } = usePBAC<T>();

  return useMemo(() => {
    const result = pbac.canAny(permissions, context);
    return {
      allowed: result.allowed,
      reason: result.reason,
      can: result.allowed,
      permissions,
    };
  }, [pbac, permissions, context]);
}
