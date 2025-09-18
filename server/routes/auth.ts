import type { RequestHandler } from "express";
import { getDb } from "../lib/mongo";
import { z } from "zod";
import bcrypt from "bcryptjs";
import type { SignUpRequest, SignInRequest, AuthResponse } from "@shared/api";

const signUpSchema = z.object({
  username: z.string().min(3).max(32).regex(/^[a-zA-Z0-9_\-\.]+$/),
  email: z.string().email().max(120),
  password: z.string().min(6).max(200),
});

const signInSchema = z.object({
  identifier: z.string().min(1),
  password: z.string().min(6).max(200),
});

async function ensureIndexes() {
  const db = await getDb();
  const users = db.collection("users");
  await users.createIndex({ email: 1 }, { unique: true });
  await users.createIndex({ username: 1 }, { unique: true });
}

export const handleSignUp: RequestHandler = async (req, res) => {
  try {
    const body: SignUpRequest = signUpSchema.parse(req.body);
    await ensureIndexes();
    const db = await getDb();
    const users = db.collection("users");
    const exists = await users.findOne({ $or: [{ email: body.email.toLowerCase() }, { username: body.username }] });
    if (exists) {
      const resp: AuthResponse = { ok: false, message: "User already exists" };
      return res.status(409).json(resp);
    }
    const passwordHash = await bcrypt.hash(body.password, 10);
    const now = new Date();
    const doc = {
      username: body.username,
      email: body.email.toLowerCase(),
      passwordHash,
      createdAt: now,
      updatedAt: now,
    };
    const r = await users.insertOne(doc);
    await db.collection("auth_events").insertOne({ type: "signup", userId: r.insertedId, ts: now });
    const resp: AuthResponse = { ok: true, userId: String(r.insertedId) };
    res.json(resp);
  } catch (err: any) {
    res.status(400).json({ ok: false, message: err?.message || "Invalid request" } satisfies AuthResponse);
  }
};

export const handleSignIn: RequestHandler = async (req, res) => {
  try {
    const body: SignInRequest = signInSchema.parse(req.body);
    const db = await getDb();
    const users = db.collection("users");
    const q = body.identifier.includes("@") ? { email: body.identifier.toLowerCase() } : { username: body.identifier };
    const user = await users.findOne(q);
    if (!user) return res.status(401).json({ ok: false, message: "Invalid credentials" } satisfies AuthResponse);
    const ok = await bcrypt.compare(body.password, user.passwordHash || "");
    const now = new Date();
    await db.collection("auth_events").insertOne({ type: "signin", userId: user._id, ts: now, ok });
    if (!ok) return res.status(401).json({ ok: false, message: "Invalid credentials" } satisfies AuthResponse);
    res.json({ ok: true, userId: String(user._id) } satisfies AuthResponse);
  } catch (err: any) {
    res.status(400).json({ ok: false, message: err?.message || "Invalid request" } satisfies AuthResponse);
  }
};
