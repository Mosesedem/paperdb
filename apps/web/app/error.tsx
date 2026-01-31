// app/error.tsx
"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

type ErrorPageProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function Error({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    // You can log the error to your error tracking service here
    console.error("Global error boundary caught:", error);

    // Optional: send to logging service
    // example: Sentry.captureException(error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-lg w-full text-center space-y-8 py-12">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-red-100 text-red-600 mb-2">
          <AlertTriangle size={40} />
        </div>

        <h1 className="text-4xl md:text-5xl font-bold tracking-tight ">
          Something went wrong
        </h1>

        <div className="space-y-4">
          <p className="text-lg text-gray-400">
            We're sorry — an unexpected error occurred.
          </p>

          {process.env.NODE_ENV === "development" && (
            <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg text-left font-mono text-sm overflow-auto max-h-60">
              <p className="font-semibold text-red-800 mb-2">
                Error details (dev only):
              </p>
              <pre className="text-red-700 whitespace-pre-wrap break-words">
                {error.message}
              </pre>
              {error.digest && (
                <p className="mt-3 text-xs text-gray-500">
                  Digest: {error.digest}
                </p>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center pt-6">
          <button
            onClick={reset}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors shadow-sm hover:shadow"
          >
            <RefreshCw size={18} />
            Try again
          </button>

          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium rounded-lg transition-colors border border-gray-300"
          >
            <Home size={18} />
            Back to home
          </Link>
        </div>

        <p className="text-sm text-gray-500 pt-8">
          If the problem persists, please contact support.
        </p>
      </div>
    </div>
  );
}

// Optional: better SEO & UX
export const metadata = {
  title: "Error - Something went wrong",
  description:
    "An unexpected error occurred. Please try again or go back to the homepage.",
};
