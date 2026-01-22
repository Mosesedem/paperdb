/**
 * Realtime subscription hooks for PaperDB React
 */
import { useState, useEffect, useCallback, useRef } from "react";
import { useClient } from "./context";

interface RealtimeEvent<T = unknown> {
  type: "insert" | "update" | "delete";
  collection: string;
  data: T;
}

interface RealtimeOptions {
  enabled?: boolean;
}

/**
 * Hook to subscribe to realtime updates for a collection
 */
export function useRealtime<T = Record<string, unknown>>(
  collection: string,
  callback: (event: RealtimeEvent<T>) => void,
  options?: RealtimeOptions,
) {
  const client = useClient();
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (options?.enabled === false) return;

    let unsubscribe: (() => void) | null = null;

    try {
      unsubscribe = (client.realtime as any).subscribe(
        collection,
        (event: RealtimeEvent<T>) => {
          callbackRef.current(event);
        },
      );
      setIsConnected(true);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Connection failed"));
      setIsConnected(false);
    }

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [client, collection, options?.enabled]);

  return { isConnected, error };
}

/**
 * Hook for realtime collection data that auto-updates
 */
export function useRealtimeCollection<
  T extends { _id: string } = Record<string, unknown> & { _id: string },
>(
  collection: string,
  initialData: T[] = [],
): {
  data: T[];
  isConnected: boolean;
  error: Error | null;
} {
  const [data, setData] = useState<T[]>(initialData);

  const handleEvent = useCallback((event: RealtimeEvent<T>) => {
    setData((current) => {
      switch (event.type) {
        case "insert":
          return [...current, event.data];
        case "update":
          return current.map((item) =>
            item._id === event.data._id ? event.data : item,
          );
        case "delete":
          return current.filter((item) => item._id !== event.data._id);
        default:
          return current;
      }
    });
  }, []);

  const { isConnected, error } = useRealtime<T>(collection, handleEvent);

  return { data, isConnected, error };
}
