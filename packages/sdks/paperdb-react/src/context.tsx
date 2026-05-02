/**
 * PaperDB React Context and Provider
 */
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  ReactNode,
} from "react";
import type { AuthClient, AuthState, User, Session } from "paperdb";

// Types for the client returned by createClient
interface PaperDBClient {
  auth: AuthClient;
  [key: string]: unknown;
}

interface PaperDBContextValue {
  client: PaperDBClient | null;
  auth: AuthState;
  isLoaded: boolean;
}

const PaperDBContext = createContext<PaperDBContextValue | null>(null);

export interface PaperDBProviderProps {
  children: ReactNode;
  client: PaperDBClient;
}

/**
 * PaperDB Provider component
 * Wrap your app with this to enable PaperDB hooks and components
 */
export function PaperDBProvider({ children, client }: PaperDBProviderProps) {
  const [auth, setAuth] = useState<AuthState>({
    user: null,
    session: null,
    isLoading: true,
    isAuthenticated: false,
  });
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (!client?.auth) return;

    // Subscribe to auth state changes
    const unsubscribe = client.auth.onAuthStateChange((state) => {
      setAuth(state);
      if (!state.isLoading) {
        setIsLoaded(true);
      }
    });

    return unsubscribe;
  }, [client]);

  const value = useMemo(
    () => ({
      client,
      auth,
      isLoaded,
    }),
    [client, auth, isLoaded],
  );

  return (
    <PaperDBContext.Provider value={value}>{children}</PaperDBContext.Provider>
  );
}

/**
 * Hook to access PaperDB context
 */
export function usePaperDB() {
  const context = useContext(PaperDBContext);
  if (!context) {
    throw new Error("usePaperDB must be used within a PaperDBProvider");
  }
  return context;
}

/**
 * Hook to access PaperDB client
 */
export function useClient() {
  const { client } = usePaperDB();
  if (!client) {
    throw new Error("PaperDB client not initialized");
  }
  return client;
}
