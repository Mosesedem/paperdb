/**
 * Storage module for PaperDB SDK
 * Upload, manage, and serve files with automatic CDN distribution
 */

export interface StorageFile {
  id: string;
  name: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  cdnUrl: string;
  path: string;
  metadata?: Record<string, unknown>;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UploadOptions {
  /** Custom file name (defaults to original file name) */
  name?: string;
  /** Folder path to store the file */
  folder?: string;
  /** Whether the file should be publicly accessible */
  isPublic?: boolean;
  /** Custom metadata to attach to the file */
  metadata?: Record<string, unknown>;
  /** Image transformation options */
  transform?: ImageTransformOptions;
}

export interface ImageTransformOptions {
  /** Resize width */
  width?: number;
  /** Resize height */
  height?: number;
  /** Resize fit mode */
  fit?: "cover" | "contain" | "fill" | "inside" | "outside";
  /** Output format */
  format?: "webp" | "jpeg" | "png" | "avif";
  /** Quality (1-100) */
  quality?: number;
}

export interface ListFilesOptions {
  folder?: string;
  limit?: number;
  offset?: number;
  sortBy?: "name" | "size" | "createdAt";
  sortOrder?: "asc" | "desc";
}

export interface SignedUrlOptions {
  /** Expiration time in seconds (default: 3600) */
  expiresIn?: number;
  /** Image transformation options */
  transform?: ImageTransformOptions;
}

export class StorageClient {
  private baseUrl: string;
  private apiKey: string;

  constructor(baseUrl: string, apiKey: string) {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<T> {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.apiKey}`,
      ...(options.headers as Record<string, string>),
    };

    // Don't set Content-Type for FormData (browser sets it with boundary)
    if (!(options.body instanceof FormData)) {
      headers["Content-Type"] = "application/json";
    }

    const res = await fetch(`${this.baseUrl}/storage${endpoint}`, {
      ...options,
      headers,
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: "Request failed" }));
      throw new Error(error.error || error.message || "Request failed");
    }

    return res.json();
  }

  /**
   * Upload a file
   */
  async upload(
    file: File | Blob,
    options: UploadOptions = {},
  ): Promise<StorageFile> {
    const formData = new FormData();

    // Add file
    const fileName =
      options.name || (file instanceof File ? file.name : "file");
    formData.append("file", file, fileName);

    // Add options
    if (options.folder) formData.append("folder", options.folder);
    if (options.isPublic !== undefined)
      formData.append("isPublic", String(options.isPublic));
    if (options.metadata)
      formData.append("metadata", JSON.stringify(options.metadata));
    if (options.transform)
      formData.append("transform", JSON.stringify(options.transform));

    return this.request("/upload", {
      method: "POST",
      body: formData,
    });
  }

  /**
   * Upload multiple files
   */
  async uploadMany(
    files: (File | Blob)[],
    options: Omit<UploadOptions, "name"> = {},
  ): Promise<StorageFile[]> {
    const formData = new FormData();

    files.forEach((file, index) => {
      const fileName = file instanceof File ? file.name : `file-${index}`;
      formData.append("files", file, fileName);
    });

    if (options.folder) formData.append("folder", options.folder);
    if (options.isPublic !== undefined)
      formData.append("isPublic", String(options.isPublic));
    if (options.metadata)
      formData.append("metadata", JSON.stringify(options.metadata));
    if (options.transform)
      formData.append("transform", JSON.stringify(options.transform));

    return this.request("/upload-many", {
      method: "POST",
      body: formData,
    });
  }

  /**
   * Upload from URL
   */
  async uploadFromUrl(
    url: string,
    options: UploadOptions = {},
  ): Promise<StorageFile> {
    return this.request("/upload-url", {
      method: "POST",
      body: JSON.stringify({ url, ...options }),
    });
  }

  /**
   * List files
   */
  async list(options: ListFilesOptions = {}): Promise<{
    files: StorageFile[];
    total: number;
    hasMore: boolean;
  }> {
    const params = new URLSearchParams();
    if (options.folder) params.set("folder", options.folder);
    if (options.limit) params.set("limit", String(options.limit));
    if (options.offset) params.set("offset", String(options.offset));
    if (options.sortBy) params.set("sortBy", options.sortBy);
    if (options.sortOrder) params.set("sortOrder", options.sortOrder);

    const query = params.toString();
    return this.request(`/${query ? `?${query}` : ""}`);
  }

  /**
   * Get file by ID
   */
  async get(id: string): Promise<StorageFile> {
    return this.request(`/${id}`);
  }

  /**
   * Get file by path
   */
  async getByPath(path: string): Promise<StorageFile> {
    return this.request(`/path/${encodeURIComponent(path)}`);
  }

  /**
   * Update file metadata
   */
  async update(
    id: string,
    options: {
      name?: string;
      isPublic?: boolean;
      metadata?: Record<string, unknown>;
    },
  ): Promise<StorageFile> {
    return this.request(`/${id}`, {
      method: "PATCH",
      body: JSON.stringify(options),
    });
  }

  /**
   * Delete a file
   */
  async delete(id: string): Promise<{ success: boolean }> {
    return this.request(`/${id}`, {
      method: "DELETE",
    });
  }

  /**
   * Delete multiple files
   */
  async deleteMany(ids: string[]): Promise<{ deleted: number }> {
    return this.request("/delete-many", {
      method: "POST",
      body: JSON.stringify({ ids }),
    });
  }

  /**
   * Move/rename a file
   */
  async move(
    id: string,
    options: { folder?: string; name?: string },
  ): Promise<StorageFile> {
    return this.request(`/${id}/move`, {
      method: "POST",
      body: JSON.stringify(options),
    });
  }

  /**
   * Copy a file
   */
  async copy(
    id: string,
    options: { folder?: string; name?: string },
  ): Promise<StorageFile> {
    return this.request(`/${id}/copy`, {
      method: "POST",
      body: JSON.stringify(options),
    });
  }

  /**
   * Get a signed URL for private file access
   */
  async getSignedUrl(
    id: string,
    options: SignedUrlOptions = {},
  ): Promise<{ url: string; expiresAt: string }> {
    return this.request(`/${id}/signed-url`, {
      method: "POST",
      body: JSON.stringify(options),
    });
  }

  /**
   * Get transformed image URL
   */
  getImageUrl(
    file: StorageFile | string,
    transform: ImageTransformOptions,
  ): string {
    const baseUrl = typeof file === "string" ? file : file.cdnUrl;
    const params = new URLSearchParams();

    if (transform.width) params.set("w", String(transform.width));
    if (transform.height) params.set("h", String(transform.height));
    if (transform.fit) params.set("fit", transform.fit);
    if (transform.format) params.set("f", transform.format);
    if (transform.quality) params.set("q", String(transform.quality));

    return `${baseUrl}?${params.toString()}`;
  }

  /**
   * Create a folder
   */
  async createFolder(
    path: string,
  ): Promise<{ path: string; createdAt: string }> {
    return this.request("/folders", {
      method: "POST",
      body: JSON.stringify({ path }),
    });
  }

  /**
   * List folders
   */
  async listFolders(parentPath?: string): Promise<string[]> {
    const params = parentPath
      ? `?parent=${encodeURIComponent(parentPath)}`
      : "";
    return this.request(`/folders${params}`);
  }

  /**
   * Delete a folder (must be empty)
   */
  async deleteFolder(path: string): Promise<{ success: boolean }> {
    return this.request(`/folders/${encodeURIComponent(path)}`, {
      method: "DELETE",
    });
  }
}
