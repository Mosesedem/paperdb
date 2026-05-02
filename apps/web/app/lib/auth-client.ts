"use client";

import {
  signIn as nextAuthSignIn,
  signOut as nextAuthSignOut,
  getSession as nextAuthGetSession,
} from "next-auth/react";

export const authClient = {
  signIn: {
    social: async ({
      provider,
      callbackURL,
    }: {
      provider: "google" | "github";
      callbackURL?: string;
    }) => {
      await nextAuthSignIn(provider, {
        redirectTo: callbackURL || "/dashboard",
      });
    },
  },
  getSession: async () => {
    const data = await nextAuthGetSession();
    return { data };
  },
  signOut: async () => {
    await nextAuthSignOut({ redirectTo: "/" });
  },
};
