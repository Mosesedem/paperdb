// Context and Provider
export { PaperDBProvider, usePaperDB, useClient } from "./context";
export type { PaperDBProviderProps } from "./context";

// Auth hooks
export {
  useAuth,
  useUser,
  useSession,
  useSignIn,
  useSignUp,
} from "./hooks/use-auth";

// Collection hooks
export {
  useCollection,
  useDocument,
  useInsert,
  useUpdate,
  useDelete,
  useCount,
} from "./hooks/use-collection";

// Realtime hooks
export { useRealtime, useRealtimeCollection } from "./hooks/use-realtime";

// UI Components
export { SignIn } from "./components/SignIn";
export type { SignInProps } from "./components/SignIn";

export { SignUp } from "./components/SignUp";
export type { SignUpProps } from "./components/SignUp";

export { UserButton } from "./components/UserButton";
export type { UserButtonProps } from "./components/UserButton";

export {
  SignedIn,
  SignedOut,
  ProtectRoute,
  RoleGuard,
} from "./components/AuthGuards";
export type {
  SignedInProps,
  SignedOutProps,
  ProtectRouteProps,
  RoleGuardProps,
} from "./components/AuthGuards";
