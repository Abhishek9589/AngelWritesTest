import type { RequestHandler } from "express";
import { getDb } from "../lib/mongo";
import { z } from "zod";
import type { BulkPoemsRequest, PoemDTO, BulkBooksRequest, BookDTO } from "@shared/api";

const poemSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  content: z.string().default(""),
  date: z.string().min(4),
  tags: z.array(z.string()).default([]),
  favorite: z.boolean().optional(),
  draft: z.boolean().optional(),
  createdAt: z.number(),
  updatedAt: z.number(),
  versions: z
    .array(z.object({ id: z.string(), ts: z.number(), title: z.string(), content: z.string(), date: z.string(), tags: z.array(z.string()) }))
    .optional(),
});

const chapterSchema = z.object({ id: z.string(), title: z.string(), content: z.string() });
const bookSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().default(""),
  cover: z.string().nullable().optional(),
  content: z.string().default(""),
  chapters: z.array(chapterSchema).optional(),
  activeChapterId: z.string().nullable().optional(),
  lastEdited: z.string(),
  createdAt: z.string(),
  completed: z.boolean().optional(),
  genre: z.string().nullable().optional(),
  tags: z.array(z.string()).optional(),
  status: z.enum(["draft", "published"]).optional(),
});

async function ensureIndexes() {
  const db = await getDb();
  // Keep existing indexes; also add ownerId-based indexes for scoping
  await db.collection("poems").createIndex({ ownerId: 1, id: 1 }, { unique: true, partialFilterExpression: { ownerId: { $exists: true } } });
  await db.collection("books").createIndex({ ownerId: 1, id: 1 }, { unique: true, partialFilterExpression: { ownerId: { $exists: true } } });
}

export const bulkUpsertPoems: RequestHandler = async (req, res) => {
  try {
    await ensureIndexes();
    const rawBody = (req.body || {}) as any;
    const body = { poems: z.array(poemSchema).parse(rawBody.poems || []), ownerId: typeof rawBody.ownerId === 'string' ? rawBody.ownerId : undefined };
    const ownerId = (req.header("x-user-id") as string) || body.ownerId || undefined;
    const db = await getDb();
    const ops = body.poems.map((p) => ({
      updateOne: {
        filter: ownerId ? { ownerId, id: p.id } : { id: p.id },
        update: { $set: ownerId ? { ...p, ownerId } : p },
        upsert: true,
      },
    }));
    if (ops.length) await db.collection("poems").bulkWrite(ops, { ordered: false });
    res.json({ ok: true, upserted: ops.length });
  } catch (err: any) {
    // Do not crash when DB is unavailable; acknowledge request but not persisted
    const body = (req.body || {}) as any;
    const count = Array.isArray(body.poems) ? body.poems.length : 0;
    res.json({ ok: false, upserted: 0, message: err?.message || "db_unavailable", received: count });
  }
};

export const listPoems: RequestHandler = async (req, res) => {
  try {
    const ownerId = (req.header("x-user-id") as string) || (req.query.ownerId as string) || undefined;
    const db = await getDb();
    const filter = ownerId ? { ownerId } : { ownerId: "__none__" };
    const items = await db.collection("poems").find(filter, { projection: { _id: 0 } }).toArray();
    const poems = z.array(poemSchema).parse(items);
    res.json({ poems });
  } catch (err: any) {
    // Graceful fallback: no DB -> empty list
    res.json({ poems: [] as PoemDTO[], error: err?.message || "db_unavailable" });
  }
};

export const bulkUpsertBooks: RequestHandler = async (req, res) => {
  try {
    await ensureIndexes();
    const rawBody = (req.body || {}) as any;
    const body = { books: z.array(bookSchema).parse(rawBody.books || []), ownerId: typeof rawBody.ownerId === 'string' ? rawBody.ownerId : undefined };
    const ownerId = (req.header("x-user-id") as string) || body.ownerId || undefined;
    const db = await getDb();
    const ops = body.books.map((b) => ({
      updateOne: {
        filter: ownerId ? { ownerId, id: b.id } : { id: b.id },
        update: { $set: ownerId ? { ...b, ownerId } : b },
        upsert: true,
      },
    }));
    if (ops.length) await db.collection("books").bulkWrite(ops, { ordered: false });
    res.json({ ok: true, upserted: ops.length });
  } catch (err: any) {
    const body = (req.body || {}) as any;
    const count = Array.isArray(body.books) ? body.books.length : 0;
    res.json({ ok: false, upserted: 0, message: err?.message || "db_unavailable", received: count });
  }
};

export const listBooks: RequestHandler = async (req, res) => {
  try {
    const ownerId = (req.header("x-user-id") as string) || (req.query.ownerId as string) || undefined;
    const db = await getDb();
    const filter = ownerId ? { ownerId } : { ownerId: "__none__" };
    const items = await db.collection("books").find(filter, { projection: { _id: 0 } }).toArray();
    const books = z.array(bookSchema).parse(items);
    res.json({ books });
  } catch (err: any) {
    res.json({ books: [] as BookDTO[], error: err?.message || "db_unavailable" });
  }
};
