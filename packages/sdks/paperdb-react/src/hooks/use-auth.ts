/**
 * Authentication hooks for PaperDB React
 */
import { useState, useCallback } from "react";
import { usePaperDB, useClient } from "./context";
import type {
  User,
  Session,
  SignUpOptions,
  SignInOptions,
  AuthProvider,
} from "paperdb";

/**
 * Hook to access auth state and methods
 */
export function useAuth() {
  const { auth, isLoaded } = usePaperDB();
  const client = useClient();

  const signUp = useCallback(
    async (options: SignUpOptions) => {
      return client.auth.signUp(options);
    },
    [client],
  );

  const signIn = useCallback(
    async (options: SignInOptions) => {
      return client.auth.signIn(options);
    },
    [client],
  );

  const signInWithProvider = useCallback(
    async (provider: AuthProvider) => {
      return client.auth.signInWithProvider({ provider });
    },
    [client],
  );

  const signOut = useCallback(async () => {
    return client.auth.signOut();
  }, [client]);

  const updateProfile = useCallback(
    async (data: Partial<Pick<User, "name" | "avatar">>) => {
      return client.auth.updateProfile(data);
    },
    [client],
  );

  return {
    user: auth.user,
    session: auth.session,
    isLoading: auth.isLoading,
    isAuthenticated: auth.isAuthenticated,
    isLoaded,
    signUp,
    signIn,
    signInWithProvider,
    signOut,
    updateProfile,
  };
}

/**
 * Hook to access current user
 */
export function useUser(): User | null {
  const { auth } = usePaperDB();
  return auth.user;
}

/**
 * Hook to access current session
 */
export function useSession(): Session | null {
  const { auth } = usePaperDB();
  return auth.session;
}

/**
 * Hook for sign-in form state management
 */
export function useSignIn() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const client = useClient();

  const submit = useCallback(async () => {
    setError(null);
    setIsLoading(true);

    try {
      await client.auth.signIn({ email, password });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed");
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [client, email, password]);

  const signInWithProvider = useCallback(
    async (provider: AuthProvider) => {
      setError(null);
      setIsLoading(true);

      try {
        await client.auth.signInWithProvider({ provider });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Sign in failed");
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [client],
  );

  return {
    email,
    setEmail,
    password,
    setPassword,
    error,
    isLoading,
    submit,
    signInWithProvider,
  };
}

/**
 * Hook for sign-up form state management
 */
export function useSignUp() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const client = useClient();

  const submit = useCallback(async () => {
    setError(null);
    setIsLoading(true);

    try {
      await client.auth.signUp({ email, password, name: name || undefined });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign up failed");
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [client, email, password, name]);

  return {
    email,
    setEmail,
    password,
    setPassword,
    name,
    setName,
    error,
    isLoading,
    submit,
  };
}
