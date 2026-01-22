/**
 * Offline sync module for PaperDB SDK
 * Local-first data with automatic sync and conflict resolution
 */

export type ConflictResolutionStrategy =
  | "last-write-wins"
  | "first-write-wins"
  | "merge"
  | "manual";

export interface SyncConfig {
  /** Collections to sync offline */
  collections: string[];
  /** Conflict resolution strategy */
  conflictResolution?: ConflictResolutionStrategy;
  /** Custom conflict resolver for 'manual' strategy */
  onConflict?: (local: unknown, remote: unknown) => unknown;
  /** Sync interval in milliseconds (default: 30000) */
  syncInterval?: number;
  /** Maximum offline queue size */
  maxQueueSize?: number;
}

export interface SyncStatus {
  /** Whether currently syncing */
  isSyncing: boolean;
  /** Whether offline */
  isOffline: boolean;
  /** Number of pending changes */
  pendingChanges: number;
  /** Last successful sync time */
  lastSyncAt?: string;
  /** Last sync error if any */
  lastError?: string;
}

export interface PendingChange {
  id: string;
  collection: string;
  operation: "insert" | "update" | "delete";
  documentId?: string;
  data?: Record<string, unknown>;
  createdAt: string;
}

export interface SyncConflict {
  id: string;
  collection: string;
  documentId: string;
  localVersion: Record<string, unknown>;
  remoteVersion: Record<string, unknown>;
  createdAt: string;
}

type SyncEventType =
  | "sync:start"
  | "sync:complete"
  | "sync:error"
  | "online"
  | "offline"
  | "conflict";

type SyncEventListener = (event: {
  type: SyncEventType;
  data?: unknown;
}) => void;

// IndexedDB wrapper for offline storage
class OfflineStorage {
  private dbName: string;
  private db: IDBDatabase | null = null;

  constructor(dbName: string) {
    this.dbName = dbName;
  }

  async init(): Promise<void> {
    if (typeof indexedDB === "undefined") {
      throw new Error("IndexedDB is not available");
    }

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = () => {
        const db = request.result;

        // Store for cached documents
        if (!db.objectStoreNames.contains("documents")) {
          const docStore = db.createObjectStore("documents", { keyPath: "id" });
          docStore.createIndex("collection", "collection", { unique: false });
        }

        // Store for pending changes
        if (!db.objectStoreNames.contains("pending")) {
          db.createObjectStore("pending", {
            keyPath: "id",
            autoIncrement: true,
          });
        }

        // Store for sync metadata
        if (!db.objectStoreNames.contains("meta")) {
          db.createObjectStore("meta", { keyPath: "key" });
        }

        // Store for conflicts
        if (!db.objectStoreNames.contains("conflicts")) {
          db.createObjectStore("conflicts", { keyPath: "id" });
        }
      };
    });
  }

  private getStore(
    storeName: string,
    mode: IDBTransactionMode = "readonly",
  ): IDBObjectStore {
    if (!this.db) throw new Error("Database not initialized");
    const tx = this.db.transaction(storeName, mode);
    return tx.objectStore(storeName);
  }

  async get<T>(storeName: string, key: string): Promise<T | undefined> {
    return new Promise((resolve, reject) => {
      const request = this.getStore(storeName).get(key);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  }

  async getAll<T>(storeName: string): Promise<T[]> {
    return new Promise((resolve, reject) => {
      const request = this.getStore(storeName).getAll();
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  }

  async getAllByIndex<T>(
    storeName: string,
    indexName: string,
    value: string,
  ): Promise<T[]> {
    return new Promise((resolve, reject) => {
      const store = this.getStore(storeName);
      const index = store.index(indexName);
      const request = index.getAll(value);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  }

  async put<T>(storeName: string, value: T): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = this.getStore(storeName, "readwrite").put(value);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async delete(storeName: string, key: string | number): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = this.getStore(storeName, "readwrite").delete(key);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async clear(storeName: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = this.getStore(storeName, "readwrite").clear();
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }
}

export class SyncClient {
  private baseUrl: string;
  private apiKey: string;
  private config: SyncConfig;
  private storage: OfflineStorage;
  private listeners: Set<SyncEventListener> = new Set();
  private syncInterval: ReturnType<typeof setInterval> | null = null;
  private status: SyncStatus = {
    isSyncing: false,
    isOffline: false,
    pendingChanges: 0,
  };

  constructor(baseUrl: string, apiKey: string, config: SyncConfig) {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
    this.config = {
      conflictResolution: "last-write-wins",
      syncInterval: 30000,
      maxQueueSize: 1000,
      ...config,
    };
    this.storage = new OfflineStorage(`paperdb_${apiKey.slice(0, 8)}`);
  }

  /**
   * Initialize offline sync
   */
  async init(): Promise<void> {
    await this.storage.init();

    // Set up online/offline listeners
    if (typeof window !== "undefined") {
      window.addEventListener("online", () => this.handleOnline());
      window.addEventListener("offline", () => this.handleOffline());
      this.status.isOffline = !navigator.onLine;
    }

    // Start sync interval
    this.startSyncInterval();

    // Initial sync
    if (!this.status.isOffline) {
      await this.sync();
    }
  }

  private startSyncInterval(): void {
    if (this.syncInterval) return;

    this.syncInterval = setInterval(
      () => this.sync(),
      this.config.syncInterval,
    );
  }

  private stopSyncInterval(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  private handleOnline(): void {
    this.status.isOffline = false;
    this.emit({ type: "online" });
    this.sync();
  }

  private handleOffline(): void {
    this.status.isOffline = true;
    this.emit({ type: "offline" });
  }

  private emit(event: { type: SyncEventType; data?: unknown }): void {
    this.listeners.forEach((listener) => listener(event));
  }

  /**
   * Queue a change for sync
   */
  async queueChange(
    change: Omit<PendingChange, "id" | "createdAt">,
  ): Promise<void> {
    const pending = await this.storage.getAll<PendingChange>("pending");

    if (pending.length >= (this.config.maxQueueSize ?? 1000)) {
      throw new Error("Offline queue is full. Please sync first.");
    }

    await this.storage.put("pending", {
      ...change,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    } as PendingChange);

    this.status.pendingChanges = pending.length + 1;
  }

  /**
   * Get cached documents for a collection
   */
  async getCached<T>(collection: string): Promise<T[]> {
    const docs = await this.storage.getAllByIndex<{
      id: string;
      collection: string;
      data: T;
    }>("documents", "collection", collection);
    return docs.map((d) => d.data);
  }

  /**
   * Cache a document locally
   */
  async cache<T extends { _id: string }>(
    collection: string,
    document: T,
  ): Promise<void> {
    await this.storage.put("documents", {
      id: `${collection}:${document._id}`,
      collection,
      data: document,
      cachedAt: new Date().toISOString(),
    });
  }

  /**
   * Sync with server
   */
  async sync(): Promise<{ synced: number; conflicts: number }> {
    if (this.status.isOffline || this.status.isSyncing) {
      return { synced: 0, conflicts: 0 };
    }

    this.status.isSyncing = true;
    this.emit({ type: "sync:start" });

    try {
      const pending = await this.storage.getAll<PendingChange>("pending");
      let synced = 0;
      let conflicts = 0;

      for (const change of pending) {
        try {
          await this.syncChange(change);
          await this.storage.delete("pending", change.id);
          synced++;
        } catch (error) {
          if (error instanceof ConflictError) {
            await this.handleConflict(change, error.remoteVersion);
            conflicts++;
          } else {
            console.error("Sync error:", error);
          }
        }
      }

      // Refresh cached data
      for (const collection of this.config.collections) {
        await this.refreshCollection(collection);
      }

      this.status.pendingChanges = (
        await this.storage.getAll("pending")
      ).length;
      this.status.lastSyncAt = new Date().toISOString();
      this.status.lastError = undefined;

      this.emit({ type: "sync:complete", data: { synced, conflicts } });
      return { synced, conflicts };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Sync failed";
      this.status.lastError = message;
      this.emit({ type: "sync:error", data: { error: message } });
      throw error;
    } finally {
      this.status.isSyncing = false;
    }
  }

  private async syncChange(change: PendingChange): Promise<void> {
    const url = `${this.baseUrl}/${change.collection}/docs${
      change.documentId ? `/${change.documentId}` : ""
    }`;

    const method =
      change.operation === "insert"
        ? "POST"
        : change.operation === "update"
          ? "PATCH"
          : "DELETE";

    const res = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
        "X-Sync-Version": change.createdAt,
      },
      body: change.data ? JSON.stringify(change.data) : undefined,
    });

    if (res.status === 409) {
      const { remote } = await res.json();
      throw new ConflictError(remote);
    }

    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: "Sync failed" }));
      throw new Error(error.error || "Sync failed");
    }
  }

  private async handleConflict(
    change: PendingChange,
    remoteVersion: Record<string, unknown>,
  ): Promise<void> {
    const conflict: SyncConflict = {
      id: crypto.randomUUID(),
      collection: change.collection,
      documentId: change.documentId!,
      localVersion: change.data ?? {},
      remoteVersion,
      createdAt: new Date().toISOString(),
    };

    const strategy = this.config.conflictResolution ?? "last-write-wins";

    if (strategy === "manual") {
      await this.storage.put("conflicts", conflict);
      this.emit({ type: "conflict", data: conflict });
    } else if (strategy === "last-write-wins") {
      // Local wins, retry sync
      await this.queueChange({
        ...change,
        data: { ...change.data, _forceUpdate: true },
      });
    } else if (strategy === "first-write-wins") {
      // Remote wins, discard local change
      await this.storage.delete("pending", change.id);
    } else if (strategy === "merge" && this.config.onConflict) {
      // Custom merge
      const merged = this.config.onConflict(change.data, remoteVersion);
      await this.queueChange({
        ...change,
        data: merged as Record<string, unknown>,
      });
    }
  }

  private async refreshCollection(collection: string): Promise<void> {
    try {
      const res = await fetch(`${this.baseUrl}/${collection}/docs`, {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
      });

      if (res.ok) {
        const docs = await res.json();
        for (const doc of docs) {
          await this.cache(collection, doc);
        }
      }
    } catch {
      // Ignore refresh errors
    }
  }

  /**
   * Get conflicts waiting for resolution
   */
  async getConflicts(): Promise<SyncConflict[]> {
    return this.storage.getAll("conflicts");
  }

  /**
   * Resolve a conflict
   */
  async resolveConflict(
    conflictId: string,
    resolution: "local" | "remote" | Record<string, unknown>,
  ): Promise<void> {
    const conflict = await this.storage.get<SyncConflict>(
      "conflicts",
      conflictId,
    );
    if (!conflict) throw new Error("Conflict not found");

    let data: Record<string, unknown>;
    if (resolution === "local") {
      data = conflict.localVersion;
    } else if (resolution === "remote") {
      data = conflict.remoteVersion;
    } else {
      data = resolution;
    }

    await this.queueChange({
      collection: conflict.collection,
      operation: "update",
      documentId: conflict.documentId,
      data: { ...data, _forceUpdate: true },
    });

    await this.storage.delete("conflicts", conflictId);
  }

  /**
   * Get pending changes
   */
  async getPendingChanges(): Promise<PendingChange[]> {
    return this.storage.getAll("pending");
  }

  /**
   * Get current sync status
   */
  getStatus(): SyncStatus {
    return { ...this.status };
  }

  /**
   * Force sync now
   */
  async force(): Promise<{ synced: number; conflicts: number }> {
    return this.sync();
  }

  /**
   * Clear all cached data
   */
  async clearCache(): Promise<void> {
    await this.storage.clear("documents");
  }

  /**
   * Subscribe to sync events
   */
  on(listener: SyncEventListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Stop syncing and clean up
   */
  destroy(): void {
    this.stopSyncInterval();
    this.listeners.clear();

    if (typeof window !== "undefined") {
      window.removeEventListener("online", () => this.handleOnline());
      window.removeEventListener("offline", () => this.handleOffline());
    }
  }
}

class ConflictError extends Error {
  remoteVersion: Record<string, unknown>;

  constructor(remoteVersion: Record<string, unknown>) {
    super("Sync conflict detected");
    this.name = "ConflictError";
    this.remoteVersion = remoteVersion;
  }
}
