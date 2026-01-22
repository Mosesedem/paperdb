/**
 * Authentication module for PaperDB SDK
 * Provides Clerk-like auth experience for frontend developers
 */

export interface User {
  id: string;
  email: string;
  name?: string;
  avatar?: string;
  role?: string;
  emailVerified?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Session {
  id: string;
  userId: string;
  expiresAt: string;
  token: string;
}

export interface AuthState {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

export type AuthProvider = "google" | "github" | "apple" | "email";

export interface SignUpOptions {
  email: string;
  password: string;
  name?: string;
}

export interface SignInOptions {
  email: string;
  password: string;
}

export interface SignInWithProviderOptions {
  provider: AuthProvider;
  redirectUrl?: string;
}

export interface MagicLinkOptions {
  email: string;
  redirectUrl?: string;
}

type AuthStateListener = (state: AuthState) => void;

export class AuthClient {
  private baseUrl: string;
  private apiKey: string;
  private state: AuthState = {
    user: null,
    session: null,
    isLoading: true,
    isAuthenticated: false,
  };
  private listeners: Set<AuthStateListener> = new Set();
  private sessionToken: string | null = null;

  constructor(baseUrl: string, apiKey: string) {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
    this.initializeSession();
  }

  private async initializeSession() {
    // Check for existing session in storage
    if (typeof window !== "undefined") {
      const storedToken = localStorage.getItem("paperdb_session_token");
      if (storedToken) {
        this.sessionToken = storedToken;
        try {
          await this.refreshSession();
        } catch {
          this.clearSession();
        }
      }
    }
    this.updateState({ isLoading: false });
  }

  private updateState(partial: Partial<AuthState>) {
    this.state = { ...this.state, ...partial };
    this.listeners.forEach((listener) => listener(this.state));
  }

  private saveSession(session: Session) {
    this.sessionToken = session.token;
    if (typeof window !== "undefined") {
      localStorage.setItem("paperdb_session_token", session.token);
    }
  }

  private clearSession() {
    this.sessionToken = null;
    if (typeof window !== "undefined") {
      localStorage.removeItem("paperdb_session_token");
    }
    this.updateState({
      user: null,
      session: null,
      isAuthenticated: false,
    });
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<T> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "X-API-Key": this.apiKey,
      ...(options.headers as Record<string, string>),
    };

    if (this.sessionToken) {
      headers["Authorization"] = `Bearer ${this.sessionToken}`;
    }

    const res = await fetch(`${this.baseUrl}/auth${endpoint}`, {
      ...options,
      headers,
      credentials: "include",
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: "Request failed" }));
      throw new Error(error.error || error.message || "Request failed");
    }

    return res.json();
  }

  /**
   * Sign up with email and password
   */
  async signUp(
    options: SignUpOptions,
  ): Promise<{ user: User; session: Session }> {
    const result = await this.request<{ user: User; session: Session }>(
      "/sign-up",
      {
        method: "POST",
        body: JSON.stringify(options),
      },
    );

    this.saveSession(result.session);
    this.updateState({
      user: result.user,
      session: result.session,
      isAuthenticated: true,
    });

    return result;
  }

  /**
   * Sign in with email and password
   */
  async signIn(
    options: SignInOptions,
  ): Promise<{ user: User; session: Session }> {
    const result = await this.request<{ user: User; session: Session }>(
      "/sign-in",
      {
        method: "POST",
        body: JSON.stringify(options),
      },
    );

    this.saveSession(result.session);
    this.updateState({
      user: result.user,
      session: result.session,
      isAuthenticated: true,
    });

    return result;
  }

  /**
   * Sign in with OAuth provider (Google, GitHub, Apple)
   */
  async signInWithProvider(options: SignInWithProviderOptions): Promise<void> {
    const { provider, redirectUrl = window.location.href } = options;

    // Get OAuth URL from backend
    const { url } = await this.request<{ url: string }>(
      `/oauth/${provider}/authorize`,
      {
        method: "POST",
        body: JSON.stringify({ redirectUrl }),
      },
    );

    // Redirect to OAuth provider
    window.location.href = url;
  }

  /**
   * Send magic link email
   */
  async sendMagicLink(
    options: MagicLinkOptions,
  ): Promise<{ success: boolean }> {
    return this.request("/magic-link", {
      method: "POST",
      body: JSON.stringify(options),
    });
  }

  /**
   * Verify magic link token
   */
  async verifyMagicLink(
    token: string,
  ): Promise<{ user: User; session: Session }> {
    const result = await this.request<{ user: User; session: Session }>(
      "/magic-link/verify",
      {
        method: "POST",
        body: JSON.stringify({ token }),
      },
    );

    this.saveSession(result.session);
    this.updateState({
      user: result.user,
      session: result.session,
      isAuthenticated: true,
    });

    return result;
  }

  /**
   * Sign out current user
   */
  async signOut(): Promise<void> {
    try {
      await this.request("/sign-out", { method: "POST" });
    } finally {
      this.clearSession();
    }
  }

  /**
   * Get current user
   */
  async getUser(): Promise<User | null> {
    if (!this.sessionToken) return null;

    try {
      const { user } = await this.request<{ user: User }>("/me");
      this.updateState({ user, isAuthenticated: true });
      return user;
    } catch {
      this.clearSession();
      return null;
    }
  }

  /**
   * Get current session
   */
  async getSession(): Promise<Session | null> {
    if (!this.sessionToken) return null;

    try {
      const { session } = await this.request<{ session: Session }>("/session");
      this.updateState({ session });
      return session;
    } catch {
      this.clearSession();
      return null;
    }
  }

  /**
   * Refresh current session
   */
  async refreshSession(): Promise<Session | null> {
    if (!this.sessionToken) return null;

    try {
      const { user, session } = await this.request<{
        user: User;
        session: Session;
      }>("/refresh", { method: "POST" });

      this.saveSession(session);
      this.updateState({ user, session, isAuthenticated: true });
      return session;
    } catch {
      this.clearSession();
      return null;
    }
  }

  /**
   * Update user profile
   */
  async updateProfile(
    data: Partial<Pick<User, "name" | "avatar">>,
  ): Promise<User> {
    const { user } = await this.request<{ user: User }>("/me", {
      method: "PATCH",
      body: JSON.stringify(data),
    });

    this.updateState({ user });
    return user;
  }

  /**
   * Change password
   */
  async changePassword(
    currentPassword: string,
    newPassword: string,
  ): Promise<{ success: boolean }> {
    return this.request("/change-password", {
      method: "POST",
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  }

  /**
   * Request password reset email
   */
  async resetPassword(email: string): Promise<{ success: boolean }> {
    return this.request("/reset-password", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
  }

  /**
   * Confirm password reset with token
   */
  async confirmResetPassword(
    token: string,
    newPassword: string,
  ): Promise<{ success: boolean }> {
    return this.request("/reset-password/confirm", {
      method: "POST",
      body: JSON.stringify({ token, newPassword }),
    });
  }

  /**
   * Subscribe to auth state changes
   */
  onAuthStateChange(listener: AuthStateListener): () => void {
    this.listeners.add(listener);
    // Immediately call with current state
    listener(this.state);

    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Get current auth state synchronously
   */
  getState(): AuthState {
    return this.state;
  }

  /**
   * Get session token for making authenticated requests
   */
  getToken(): string | null {
    return this.sessionToken;
  }
}
