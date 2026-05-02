"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import Link from "next/link";
import Ttile from "@/components/ttile";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      setError("Invalid email or password");
      setLoading(false);
      return;
    }

    window.location.href = "/dashboard";
  };

  return (
    <>
      <Ttile>Login - PaperDB</Ttile>
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="w-full max-w-md rounded-xl border bg-white p-8 shadow-sm">
          <h1 className="text-2xl font-semibold">Sign in to PaperDB</h1>

          {error && (
            <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-md border px-3 py-2"
                required
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-md border px-3 py-2"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-md bg-teal-700 px-4 py-2 font-medium text-white hover:bg-teal-800 disabled:opacity-50"
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>

          <div className="mt-4 space-y-2 text-sm">
            <button
              onClick={() => signIn("google", { redirectTo: "/dashboard" })}
              className="w-full rounded-md border px-4 py-2"
            >
              Continue with Google
            </button>
            <button
              onClick={() => signIn("github", { redirectTo: "/dashboard" })}
              className="w-full rounded-md border px-4 py-2"
            >
              Continue with GitHub
            </button>
          </div>

          <div className="mt-4 text-center text-sm">
            <Link
              href="/forgot-password"
              className="text-teal-700 hover:underline"
            >
              Forgot password?
            </Link>
          </div>

          <div className="mt-2 text-center text-sm text-gray-600">
            Don't have an account?{" "}
            <Link href="/signup" className="text-teal-700 hover:underline">
              Sign up
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
