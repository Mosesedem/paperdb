/**
 * Search module for PaperDB SDK
 * Full-text search across collections with relevance ranking
 */

export interface SearchResult<T = Record<string, unknown>> {
  /** The matched document */
  document: T & { _id: string };
  /** Relevance score (higher is more relevant) */
  score: number;
  /** Matched text snippets with highlights */
  highlights: SearchHighlight[];
  /** The collection the document belongs to */
  collection: string;
}

export interface SearchHighlight {
  /** Field name where match was found */
  field: string;
  /** Text snippet with match highlighted */
  snippet: string;
  /** Match positions in the snippet */
  positions: Array<{ start: number; end: number }>;
}

export interface SearchOptions {
  /** Collections to search in (defaults to all searchable collections) */
  collections?: string[];
  /** Fields to search in (defaults to all searchable fields) */
  fields?: string[];
  /** Maximum number of results per collection */
  limit?: number;
  /** Offset for pagination */
  offset?: number;
  /** Filter results by field values */
  filter?: Record<string, unknown>;
  /** Sort order (defaults to relevance) */
  sort?: "relevance" | "createdAt" | "updatedAt";
  /** Sort direction */
  sortOrder?: "asc" | "desc";
  /** Enable fuzzy matching */
  fuzzy?: boolean;
  /** Highlight configuration */
  highlight?: {
    /** Tag to wrap matched text (default: <mark>) */
    tag?: string;
    /** Number of characters around match in snippet */
    snippetLength?: number;
  };
}

export interface SearchResponse<T = Record<string, unknown>> {
  /** Search results */
  results: SearchResult<T>[];
  /** Total number of matches */
  total: number;
  /** Time taken in milliseconds */
  took: number;
  /** Whether there are more results */
  hasMore: boolean;
  /** Search suggestions (for typos) */
  suggestions?: string[];
}

export interface IndexStatus {
  collection: string;
  fields: string[];
  documentCount: number;
  lastUpdated: string;
  status: "ready" | "building" | "error";
}

export class SearchClient {
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
    const res = await fetch(`${this.baseUrl}/search${endpoint}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
        ...(options.headers as Record<string, string>),
      },
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: "Request failed" }));
      throw new Error(error.error || error.message || "Request failed");
    }

    return res.json();
  }

  /**
   * Search across collections
   */
  async search<T = Record<string, unknown>>(
    query: string,
    options: SearchOptions = {},
  ): Promise<SearchResponse<T>> {
    return this.request("/", {
      method: "POST",
      body: JSON.stringify({
        query,
        ...options,
      }),
    });
  }

  /**
   * Search within a specific collection
   */
  async searchCollection<T = Record<string, unknown>>(
    collection: string,
    query: string,
    options: Omit<SearchOptions, "collections"> = {},
  ): Promise<SearchResponse<T>> {
    return this.search(query, {
      ...options,
      collections: [collection],
    });
  }

  /**
   * Get search suggestions (autocomplete)
   */
  async suggest(
    query: string,
    options?: {
      collections?: string[];
      fields?: string[];
      limit?: number;
    },
  ): Promise<string[]> {
    return this.request("/suggest", {
      method: "POST",
      body: JSON.stringify({ query, ...options }),
    });
  }

  /**
   * Get similar documents
   */
  async findSimilar<T = Record<string, unknown>>(
    collection: string,
    documentId: string,
    options?: {
      limit?: number;
      fields?: string[];
    },
  ): Promise<SearchResult<T>[]> {
    return this.request("/similar", {
      method: "POST",
      body: JSON.stringify({
        collection,
        documentId,
        ...options,
      }),
    });
  }

  /**
   * Get index status for collections
   */
  async getIndexStatus(collections?: string[]): Promise<IndexStatus[]> {
    const params = collections ? `?collections=${collections.join(",")}` : "";
    return this.request(`/index/status${params}`);
  }

  /**
   * Rebuild search index for a collection
   */
  async rebuildIndex(
    collection: string,
  ): Promise<{ status: string; jobId: string }> {
    return this.request(`/index/${collection}/rebuild`, {
      method: "POST",
    });
  }
}

/**
 * Create a search result highlighter for custom rendering
 */
export function createHighlighter(options?: {
  tag?: string;
  className?: string;
}) {
  const tag = options?.tag ?? "mark";
  const className = options?.className ? ` class="${options.className}"` : "";

  return {
    /**
     * Apply highlights to a snippet
     */
    highlight(
      snippet: string,
      positions: Array<{ start: number; end: number }>,
    ): string {
      if (!positions.length) return snippet;

      // Sort positions by start index (descending) to avoid offset issues
      const sorted = [...positions].sort((a, b) => b.start - a.start);

      let result = snippet;
      for (const { start, end } of sorted) {
        result =
          result.slice(0, start) +
          `<${tag}${className}>` +
          result.slice(start, end) +
          `</${tag}>` +
          result.slice(end);
      }

      return result;
    },

    /**
     * Extract highlighted snippets from search result
     */
    getSnippets(result: SearchResult): string[] {
      return result.highlights.map((h) =>
        this.highlight(h.snippet, h.positions),
      );
    },
  };
}
