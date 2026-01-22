/**
 * Auth guard components for PaperDB React
 * Control rendering based on authentication state
 */
import React, { ReactNode } from "react";
import { useAuth } from "../hooks/use-auth";

export interface SignedInProps {
  children: ReactNode;
  /** Fallback content while loading */
  fallback?: ReactNode;
}

/**
 * Render children only when user is signed in
 */
export function SignedIn({ children, fallback = null }: SignedInProps) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) return <>{fallback}</>;
  if (!isAuthenticated) return null;

  return <>{children}</>;
}

export interface SignedOutProps {
  children: ReactNode;
  /** Fallback content while loading */
  fallback?: ReactNode;
}

/**
 * Render children only when user is signed out
 */
export function SignedOut({ children, fallback = null }: SignedOutProps) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) return <>{fallback}</>;
  if (isAuthenticated) return null;

  return <>{children}</>;
}

export interface ProtectRouteProps {
  children: ReactNode;
  /** Content to show while loading */
  fallback?: ReactNode;
  /** URL to redirect to when not authenticated */
  redirectUrl?: string;
  /** Custom unauthorized component */
  unauthorized?: ReactNode;
}

/**
 * Protect a route - only allow authenticated users
 * Optionally redirects unauthenticated users
 */
export function ProtectRoute({
  children,
  fallback = null,
  redirectUrl,
  unauthorized,
}: ProtectRouteProps) {
  const { isAuthenticated, isLoading, isLoaded } = useAuth();

  // Show fallback while loading
  if (isLoading || !isLoaded) {
    return <>{fallback}</>;
  }

  // Handle unauthenticated users
  if (!isAuthenticated) {
    if (redirectUrl && typeof window !== "undefined") {
      window.location.href = redirectUrl;
      return <>{fallback}</>;
    }

    if (unauthorized) {
      return <>{unauthorized}</>;
    }

    return null;
  }

  return <>{children}</>;
}

export interface RoleGuardProps {
  children: ReactNode;
  /** Required role(s) to render children */
  roles: string | string[];
  /** Fallback when user doesn't have required role */
  fallback?: ReactNode;
}

/**
 * Render children only when user has the required role
 */
export function RoleGuard({
  children,
  roles,
  fallback = null,
}: RoleGuardProps) {
  const { user, isLoading, isAuthenticated } = useAuth();

  if (isLoading) return null;
  if (!isAuthenticated || !user) return <>{fallback}</>;

  const requiredRoles = Array.isArray(roles) ? roles : [roles];
  const userRole = user.role || "user";

  if (!requiredRoles.includes(userRole)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
