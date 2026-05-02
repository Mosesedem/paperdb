/**
 * Collection hooks for PaperDB React
 * Provides reactive data fetching and mutations
 */
import { useState, useEffect, useCallback, useRef } from "react";
import { useClient } from "./context";

interface CollectionClient {
  find: (options?: FindOptions) => Promise<unknown[]>;
  get: (
    id: string,
    options?: { select?: Record<string, boolean> },
  ) => Promise<unknown>;
  insert: (data: Record<string, unknown>) => Promise<unknown>;
  update: (id: string, data: Record<string, unknown>) => Promise<unknown>;
  delete: (id: string) => Promise<unknown>;
  count: (options?: { filter?: Record<string, unknown> }) => Promise<number>;
}

interface FindOptions {
  filter?: Record<string, unknown>;
  sort?: string;
  limit?: number;
  offset?: number;
}

interface QueryResult<T> {
  data: T[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  isRefetching: boolean;
}

interface DocumentResult<T> {
  data: T | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

interface MutationResult<T> {
  mutate: (data: T) => Promise<unknown>;
  isLoading: boolean;
  error: Error | null;
  data: unknown | null;
  reset: () => void;
}

/**
 * Hook to query a collection with reactive updates
 */
export function useCollection<T = Record<string, unknown>>(
  collection: CollectionClient | string,
  options?: FindOptions & { enabled?: boolean },
): QueryResult<T> {
  const client = useClient();
  const [data, setData] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefetching, setIsRefetching] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const collectionClient =
    typeof collection === "string"
      ? (client as unknown as Record<string, CollectionClient>)[collection]
      : collection;

  const optionsRef = useRef(options);
  optionsRef.current = options;

  const fetch = useCallback(async () => {
    if (optionsRef.current?.enabled === false) return;

    try {
      const { enabled, ...findOptions } = optionsRef.current || {};
      const result = await collectionClient.find(findOptions);
      setData(result as T[]);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to fetch"));
    }
  }, [collectionClient]);

  const refetch = useCallback(async () => {
    setIsRefetching(true);
    try {
      await fetch();
    } finally {
      setIsRefetching(false);
    }
  }, [fetch]);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      setIsLoading(true);
      await fetch();
      if (mounted) {
        setIsLoading(false);
      }
    };

    load();

    return () => {
      mounted = false;
    };
  }, [fetch]);

  return { data, isLoading, error, refetch, isRefetching };
}

/**
 * Hook to get a single document by ID
 */
export function useDocument<T = Record<string, unknown>>(
  collection: CollectionClient | string,
  id: string | null,
  options?: { select?: Record<string, boolean>; enabled?: boolean },
): DocumentResult<T> {
  const client = useClient();
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const collectionClient =
    typeof collection === "string"
      ? (client as unknown as Record<string, CollectionClient>)[collection]
      : collection;

  const fetch = useCallback(async () => {
    if (!id || options?.enabled === false) {
      setData(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const result = await collectionClient.get(id, {
        select: options?.select,
      });
      setData(result as T);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to fetch"));
      setData(null);
    } finally {
      setIsLoading(false);
    }
  }, [collectionClient, id, options?.select, options?.enabled]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { data, isLoading, error, refetch: fetch };
}

/**
 * Hook for inserting documents
 */
export function useInsert<T = Record<string, unknown>>(
  collection: CollectionClient | string,
): MutationResult<T> {
  const client = useClient();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [data, setData] = useState<unknown | null>(null);

  const collectionClient =
    typeof collection === "string"
      ? (client as unknown as Record<string, CollectionClient>)[collection]
      : collection;

  const mutate = useCallback(
    async (doc: T) => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await collectionClient.insert(
          doc as Record<string, unknown>,
        );
        setData(result);
        return result;
      } catch (err) {
        const error = err instanceof Error ? err : new Error("Insert failed");
        setError(error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [collectionClient],
  );

  const reset = useCallback(() => {
    setError(null);
    setData(null);
  }, []);

  return { mutate, isLoading, error, data, reset };
}

/**
 * Hook for updating documents
 */
export function useUpdate<T = Record<string, unknown>>(
  collection: CollectionClient | string,
): MutationResult<{ id: string; data: Partial<T> }> {
  const client = useClient();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [data, setData] = useState<unknown | null>(null);

  const collectionClient =
    typeof collection === "string"
      ? (client as unknown as Record<string, CollectionClient>)[collection]
      : collection;

  const mutate = useCallback(
    async ({ id, data: updateData }: { id: string; data: Partial<T> }) => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await collectionClient.update(
          id,
          updateData as Record<string, unknown>,
        );
        setData(result);
        return result;
      } catch (err) {
        const error = err instanceof Error ? err : new Error("Update failed");
        setError(error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [collectionClient],
  );

  const reset = useCallback(() => {
    setError(null);
    setData(null);
  }, []);

  return { mutate, isLoading, error, data, reset };
}

/**
 * Hook for deleting documents
 */
export function useDelete(
  collection: CollectionClient | string,
): MutationResult<string> {
  const client = useClient();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [data, setData] = useState<unknown | null>(null);

  const collectionClient =
    typeof collection === "string"
      ? (client as unknown as Record<string, CollectionClient>)[collection]
      : collection;

  const mutate = useCallback(
    async (id: string) => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await collectionClient.delete(id);
        setData(result);
        return result;
      } catch (err) {
        const error = err instanceof Error ? err : new Error("Delete failed");
        setError(error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [collectionClient],
  );

  const reset = useCallback(() => {
    setError(null);
    setData(null);
  }, []);

  return { mutate, isLoading, error, data, reset };
}

/**
 * Hook to get document count
 */
export function useCount(
  collection: CollectionClient | string,
  filter?: Record<string, unknown>,
): { count: number; isLoading: boolean; error: Error | null } {
  const client = useClient();
  const [count, setCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const collectionClient =
    typeof collection === "string"
      ? (client as unknown as Record<string, CollectionClient>)[collection]
      : collection;

  useEffect(() => {
    let mounted = true;

    const fetch = async () => {
      setIsLoading(true);
      try {
        const result = await collectionClient.count({ filter });
        if (mounted) {
          setCount(result);
          setError(null);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err : new Error("Failed to count"));
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    fetch();

    return () => {
      mounted = false;
    };
  }, [collectionClient, filter]);

  return { count, isLoading, error };
}
