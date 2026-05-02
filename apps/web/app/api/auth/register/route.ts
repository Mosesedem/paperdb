import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import bcrypt from "bcryptjs";
import { sql } from "@/app/lib/server/db";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = String(body?.email || "")
      .trim()
      .toLowerCase();
    const password = String(body?.password || "");
    const name = String(body?.name || "").trim() || null;

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 },
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 },
      );
    }

    const exists =
      await sql`SELECT id FROM users WHERE email = ${email} LIMIT 1`;
    if (exists.length > 0) {
      return NextResponse.json(
        { error: "Email already exists" },
        { status: 409 },
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const now = new Date().toISOString();

    await sql`
      INSERT INTO users (id, email, password_hash, name, created_at, updated_at)
      VALUES (${nanoid()}, ${email}, ${passwordHash}, ${name}, ${now}, ${now})
    `;

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    console.error("Register error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
