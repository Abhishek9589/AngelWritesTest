import type { RequestHandler } from "express";
import { getDb } from "../lib/mongo";
import { z } from "zod";
import bcrypt from "bcryptjs";
import type { SignUpRequest, SignInRequest, AuthResponse } from "@shared/api";
import { createMailer } from "../lib/mailer";

const signUpSchema = z.object({
  username: z.string().min(3).max(32).regex(/^[a-zA-Z0-9_\-\.]+$/),
  email: z.string().email().max(120),
  password: z.string().min(6).max(200),
});

const signInSchema = z.object({
  identifier: z.string().min(1),
  password: z.string().min(6).max(200),
});

const verifySchema = z.object({
  email: z.string().email().max(120),
  code: z.string().regex(/^\d{6}$/),
});

async function ensureIndexes() {
  const db = await getDb();
  const users = db.collection("users");
  await users.createIndex({ email: 1 }, { unique: true });
  await users.createIndex({ username: 1 }, { unique: true });
}

function generateOtp(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
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

    // Create OTP entry
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 10 * 60 * 1000);
    const code = generateOtp();
    const codeHash = await bcrypt.hash(code, 8);
    const passwordHash = await bcrypt.hash(body.password, 10);

    // Upsert pending signup by email
    await db.collection("signup_otps").updateOne(
      { email: body.email.toLowerCase() },
      {
        $set: {
          email: body.email.toLowerCase(),
          username: body.username,
          passwordHash,
          codeHash,
          expiresAt,
          attempts: 0,
          updatedAt: now,
          createdAt: now,
        },
      },
      { upsert: true }
    );

    // Send OTP email
    try {
      const mailer = createMailer();
      await mailer.sendOtp(body.email, code);
    } catch (mailErr) {
      return res.status(500).json({ ok: false, message: "Failed to send OTP" });
    }

    res.json({ ok: true, message: "OTP sent" });
  } catch (err: any) {
    res.status(400).json({ ok: false, message: err?.message || "Invalid request" } satisfies AuthResponse);
  }
};

export const handleVerifySignup: RequestHandler = async (req, res) => {
  try {
    const { email, code } = verifySchema.parse(req.body);
    const db = await getDb();
    const pending = await db.collection("signup_otps").findOne({ email: email.toLowerCase() });
    if (!pending) return res.status(400).json({ ok: false, message: "No pending signup" });
    if (pending.expiresAt && new Date(pending.expiresAt) < new Date()) return res.status(400).json({ ok: false, message: "OTP expired" });

    const ok = await bcrypt.compare(code, pending.codeHash || "");
    if (!ok) {
      await db.collection("signup_otps").updateOne({ _id: pending._id }, { $inc: { attempts: 1 }, $set: { updatedAt: new Date() } });
      return res.status(401).json({ ok: false, message: "Invalid OTP" });
    }

    // Create user
    await ensureIndexes();
    const users = db.collection("users");
    const exists = await users.findOne({ $or: [{ email: email.toLowerCase() }, { username: pending.username }] });
    if (exists) {
      await db.collection("signup_otps").deleteOne({ _id: pending._id });
      return res.status(409).json({ ok: false, message: "User already exists" });
    }
    const now = new Date();
    const r = await users.insertOne({
      username: pending.username,
      email: email.toLowerCase(),
      passwordHash: pending.passwordHash,
      createdAt: now,
      updatedAt: now,
    });
    await db.collection("auth_events").insertOne({ type: "signup_verified", userId: r.insertedId, ts: now });
    await db.collection("signup_otps").deleteOne({ _id: pending._id });

    res.json({ ok: true, userId: String(r.insertedId) } satisfies AuthResponse);
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
