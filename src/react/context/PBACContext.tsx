import {
  createContext,
  useContext,
  ReactNode,
  useState,
  useCallback,
  useMemo,
} from "react";
import { PBAC } from "../../core/pbac";
import {
  Permission,
  UserContext,
  PBACConfig,
  ConditionFunction,
} from "../../types";

// Context interface
interface PBACContextType<T = UserContext> {
  pbac: PBAC<T>;
  // Permission management methods
  setPermissions: (permissions: Permission[]) => void;
  addPermissions: (permissions: Permission[]) => void;
  removePermissions: (permissions: Permission[]) => void;
  // User management methods
  setUser: (user: T) => void;
  getUser: () => T | undefined;
  // Condition management methods
  addCondition: (
    permission: Permission,
    condition: ConditionFunction<T>
  ) => void;
  clearConditions: (permission: Permission) => void;
  // Permission checking methods
  hasPermission: (permission: Permission) => boolean;
  can: (permission: Permission, context?: Partial<T>) => boolean;
  canAll: (permissions: Permission[], context?: Partial<T>) => boolean;
  canAny: (permissions: Permission[], context?: Partial<T>) => boolean;
  isSuperAdmin: () => boolean;
  // Force re-render trigger
  refresh: () => void;
}

// Create context with default undefined value
const PBACContext = createContext<PBACContextType | undefined>(undefined);

// Provider props interface
interface PBACProviderProps<T = UserContext> {
  children: ReactNode;
  config?: PBACConfig<T>;
  pbacInstance?: PBAC<T>;
}

// Provider component
export function PBACProvider<T = UserContext>({
  children,
  config,
  pbacInstance,
}: PBACProviderProps<T>) {
  // Create PBAC instance from config or use provided instance
  const [pbac] = useState<PBAC<T>>(() => {
    if (pbacInstance) {
      return pbacInstance;
    }
    if (config) {
      return new PBAC(config);
    }
    // Default empty configuration
    return new PBAC({ permissions: [] });
  });

  // Force re-render state for reactive updates
  const [, setRefreshTrigger] = useState(0);
  const refresh = useCallback(() => {
    setRefreshTrigger((prev) => prev + 1);
  }, []);

  // Permission management methods
  const setPermissions = useCallback(
    (permissions: Permission[]) => {
      pbac.setPermissions(permissions);
      refresh();
    },
    [pbac, refresh]
  );

  const addPermissions = useCallback(
    (permissions: Permission[]) => {
      pbac.addPermissions(permissions);
      refresh();
    },
    [pbac, refresh]
  );

  const removePermissions = useCallback(
    (permissions: Permission[]) => {
      pbac.removePermissions(permissions);
      refresh();
    },
    [pbac, refresh]
  );

  // User management methods
  const setUser = useCallback(
    (user: T) => {
      pbac.setUser(user);
      refresh();
    },
    [pbac, refresh]
  );

  const getUser = useCallback(() => {
    return pbac.getUser();
  }, [pbac]);

  // Condition management methods
  const addCondition = useCallback(
    (permission: Permission, condition: ConditionFunction<T>) => {
      pbac.addCondition(permission, condition);
      refresh();
    },
    [pbac, refresh]
  );

  const clearConditions = useCallback(
    (permission: Permission) => {
      pbac.clearConditions(permission);
      refresh();
    },
    [pbac, refresh]
  );

  // Permission checking methods (simplified for React components)
  const hasPermission = useCallback(
    (permission: Permission) => {
      return pbac.hasPermission(permission);
    },
    [pbac]
  );

  const can = useCallback(
    (permission: Permission, context?: Partial<T>) => {
      return pbac.can(permission, context).allowed;
    },
    [pbac]
  );

  const canAll = useCallback(
    (permissions: Permission[], context?: Partial<T>) => {
      return pbac.canAll(permissions, context).allowed;
    },
    [pbac]
  );

  const canAny = useCallback(
    (permissions: Permission[], context?: Partial<T>) => {
      return pbac.canAny(permissions, context).allowed;
    },
    [pbac]
  );

  const isSuperAdmin = useCallback(() => {
    return pbac.isSuperAdmin();
  }, [pbac]);
  // Context value
  const value: PBACContextType<T> = useMemo(
    () => ({
      pbac,
      setPermissions,
      addPermissions,
      removePermissions,
      setUser,
      getUser,
      addCondition,
      clearConditions,
      hasPermission,
      can,
      canAll,
      canAny,
      isSuperAdmin,
      refresh,
    }),
    [
      pbac,
      setPermissions,
      addPermissions,
      removePermissions,
      setUser,
      getUser,
      addCondition,
      clearConditions,
      hasPermission,
      can,
      canAll,
      canAny,
      isSuperAdmin,
      refresh,
    ]
  );

  return (
    <PBACContext.Provider value={value as unknown as PBACContextType}>
      {children}
    </PBACContext.Provider>
  );
}

// Hook to use PBAC context
export function usePBAC<T = UserContext>(): PBACContextType<T> {
  const context = useContext(PBACContext);

  if (!context) {
    throw new Error("usePBAC must be used within a PBACProvider");
  }

  return context as unknown as PBACContextType<T>;
}

// Export context for advanced usage
export { PBACContext };
