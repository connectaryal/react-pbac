// Root directory for the library
// Export core classes and types
export { PBACCore } from "./core/pbac";
export * from "./types";

// Re-export for convenience
export { PBACCore as default } from "./core/pbac";

// Export React components and hooks
export {
  PBACProvider,
  usePBAC,
  PBACContext,
} from "./react/context/PBACContext";
