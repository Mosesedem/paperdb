/**
 * Sign In component for PaperDB React
 * A pre-built, customizable sign-in form
 */
import React, { FormEvent, useState } from "react";
import { useSignIn } from "../hooks/use-auth";
import type { AuthProvider } from "paperdb";

export interface SignInProps {
  /** Redirect URL after successful sign in */
  redirectUrl?: string;
  /** Show OAuth provider buttons */
  providers?: AuthProvider[];
  /** Custom styling */
  className?: string;
  /** Callback on successful sign in */
  onSuccess?: () => void;
  /** Callback on error */
  onError?: (error: Error) => void;
  /** Custom styles object */
  styles?: {
    container?: React.CSSProperties;
    form?: React.CSSProperties;
    input?: React.CSSProperties;
    button?: React.CSSProperties;
    error?: React.CSSProperties;
    divider?: React.CSSProperties;
    providerButton?: React.CSSProperties;
  };
  /** Custom labels */
  labels?: {
    title?: string;
    email?: string;
    password?: string;
    submit?: string;
    divider?: string;
    signUpLink?: string;
  };
  /** Link to sign up page */
  signUpUrl?: string;
}

const defaultStyles: SignInProps["styles"] = {
  container: {
    maxWidth: "400px",
    margin: "0 auto",
    padding: "2rem",
    fontFamily: "system-ui, -apple-system, sans-serif",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
  },
  input: {
    padding: "0.75rem",
    fontSize: "1rem",
    border: "1px solid #e2e8f0",
    borderRadius: "0.375rem",
    outline: "none",
  },
  button: {
    padding: "0.75rem",
    fontSize: "1rem",
    fontWeight: 500,
    color: "white",
    backgroundColor: "#0070f3",
    border: "none",
    borderRadius: "0.375rem",
    cursor: "pointer",
  },
  error: {
    padding: "0.75rem",
    fontSize: "0.875rem",
    color: "#dc2626",
    backgroundColor: "#fef2f2",
    borderRadius: "0.375rem",
  },
  divider: {
    display: "flex",
    alignItems: "center",
    gap: "1rem",
    color: "#94a3b8",
    fontSize: "0.875rem",
  },
  providerButton: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "0.5rem",
    padding: "0.75rem",
    fontSize: "1rem",
    fontWeight: 500,
    color: "#374151",
    backgroundColor: "white",
    border: "1px solid #e2e8f0",
    borderRadius: "0.375rem",
    cursor: "pointer",
  },
};

const providerLabels: Record<AuthProvider, string> = {
  google: "Continue with Google",
  github: "Continue with GitHub",
  apple: "Continue with Apple",
  email: "Continue with Email",
};

const providerIcons: Record<AuthProvider, string> = {
  google: "🔵",
  github: "⚫",
  apple: "🍎",
  email: "✉️",
};

export function SignIn({
  redirectUrl,
  providers = [],
  className,
  onSuccess,
  onError,
  styles = {},
  labels = {},
  signUpUrl,
}: SignInProps) {
  const {
    email,
    setEmail,
    password,
    setPassword,
    error,
    isLoading,
    submit,
    signInWithProvider,
  } = useSignIn();

  const mergedStyles = {
    ...defaultStyles,
    ...styles,
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await submit();
      onSuccess?.();
      if (redirectUrl && typeof window !== "undefined") {
        window.location.href = redirectUrl;
      }
    } catch (err) {
      onError?.(err instanceof Error ? err : new Error("Sign in failed"));
    }
  };

  const handleProviderClick = async (provider: AuthProvider) => {
    try {
      await signInWithProvider(provider);
      onSuccess?.();
    } catch (err) {
      onError?.(err instanceof Error ? err : new Error("Sign in failed"));
    }
  };

  return (
    <div className={className} style={mergedStyles.container}>
      <h2
        style={{ marginBottom: "1.5rem", fontSize: "1.5rem", fontWeight: 600 }}
      >
        {labels.title || "Sign In"}
      </h2>

      {error && <div style={mergedStyles.error}>{error}</div>}

      <form onSubmit={handleSubmit} style={mergedStyles.form}>
        <input
          type="email"
          placeholder={labels.email || "Email"}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={mergedStyles.input}
        />
        <input
          type="password"
          placeholder={labels.password || "Password"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          style={mergedStyles.input}
        />
        <button
          type="submit"
          disabled={isLoading}
          style={{
            ...mergedStyles.button,
            opacity: isLoading ? 0.7 : 1,
          }}
        >
          {isLoading ? "Signing in..." : labels.submit || "Sign In"}
        </button>
      </form>

      {providers.length > 0 && (
        <>
          <div style={{ ...mergedStyles.divider, margin: "1.5rem 0" }}>
            <div
              style={{ flex: 1, height: "1px", backgroundColor: "#e2e8f0" }}
            />
            <span>{labels.divider || "or"}</span>
            <div
              style={{ flex: 1, height: "1px", backgroundColor: "#e2e8f0" }}
            />
          </div>

          <div
            style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}
          >
            {providers.map((provider) => (
              <button
                key={provider}
                type="button"
                onClick={() => handleProviderClick(provider)}
                style={mergedStyles.providerButton}
              >
                <span>{providerIcons[provider]}</span>
                <span>{providerLabels[provider]}</span>
              </button>
            ))}
          </div>
        </>
      )}

      {signUpUrl && (
        <p
          style={{
            marginTop: "1.5rem",
            fontSize: "0.875rem",
            color: "#64748b",
            textAlign: "center",
          }}
        >
          {labels.signUpLink || "Don't have an account?"}{" "}
          <a href={signUpUrl} style={{ color: "#0070f3" }}>
            Sign up
          </a>
        </p>
      )}
    </div>
  );
}
