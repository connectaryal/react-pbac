// Root directory for the library
// Export core classes and types
export { PBAC } from "./core/pbac";
export * from "./types";

// Re-export for convenience
export { PBAC as default } from "./core/pbac";

// Export React components and hooks
export {
  PBACProvider,
  usePBAC,
  PBACContext,
} from "./react/context/PBACContext";
