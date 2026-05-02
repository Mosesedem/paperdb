import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import GitHub from "next-auth/providers/github";
import bcrypt from "bcryptjs";
import { sql } from "@/app/lib/server/db";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      name: "Email and Password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = String(credentials?.email || "")
          .trim()
          .toLowerCase();
        const password = String(credentials?.password || "");

        if (!email || !password) {
          return null;
        }

        const rows = await sql`
          SELECT id, email, name, password_hash
          FROM users
          WHERE email = ${email}
          LIMIT 1
        `;

        if (rows.length === 0 || !rows[0].password_hash) {
          return null;
        }

        const isValid = await bcrypt.compare(password, rows[0].password_hash);
        if (!isValid) {
          return null;
        }

        return {
          id: rows[0].id,
          email: rows[0].email,
          name: rows[0].name || undefined,
        };
      },
    }),
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    }),
    GitHub({
      clientId: process.env.GITHUB_CLIENT_ID || "",
      clientSecret: process.env.GITHUB_CLIENT_SECRET || "",
    }),
  ],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async signIn({ user, account }) {
      if (!user.email) return false;

      if (account?.provider === "google" || account?.provider === "github") {
        const existing = await sql`
          SELECT id FROM users WHERE email = ${user.email.toLowerCase()} LIMIT 1
        `;

        if (existing.length === 0) {
          const { nanoid } = await import("nanoid");
          const now = new Date().toISOString();
          await sql`
            INSERT INTO users (id, email, name, avatar, email_verified, created_at, updated_at)
            VALUES (${nanoid()}, ${user.email.toLowerCase()}, ${user.name || null}, ${user.image || null}, TRUE, ${now}, ${now})
          `;
        }
      }

      return true;
    },
    async jwt({ token, user }) {
      if (user?.email) {
        const rows = await sql`
          SELECT id, email, name FROM users WHERE email = ${user.email.toLowerCase()} LIMIT 1
        `;
        if (rows.length > 0) {
          token.id = rows[0].id;
          token.email = rows[0].email;
          token.name = rows[0].name || token.name;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = String(token.id || "");
      }
      return session;
    },
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60,
  },
});
