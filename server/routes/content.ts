import type { RequestHandler } from "express";
import { getDb } from "../lib/mongo";
import { z } from "zod";
import type { BulkPoemsRequest, PoemDTO, BulkBooksRequest, BookDTO } from "@shared/api";

const poemSchema: z.ZodType<PoemDTO> = z.object({
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
const bookSchema: z.ZodType<BookDTO> = z.object({
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
  await db.collection("poems").createIndex({ id: 1 }, { unique: true });
  await db.collection("books").createIndex({ id: 1 }, { unique: true });
}

export const bulkUpsertPoems: RequestHandler = async (req, res) => {
  try {
    await ensureIndexes();
    const body: BulkPoemsRequest = { poems: z.array(poemSchema).parse((req.body || {}).poems || []) };
    const db = await getDb();
    const ops = body.poems.map((p) => ({ updateOne: { filter: { id: p.id }, update: { $set: p }, upsert: true } }));
    if (ops.length) await db.collection("poems").bulkWrite(ops, { ordered: false });
    res.json({ ok: true, upserted: ops.length });
  } catch (err: any) {
    res.status(400).json({ ok: false, message: err?.message || "Invalid request" });
  }
};

export const listPoems: RequestHandler = async (_req, res) => {
  const db = await getDb();
  const items = await db.collection("poems").find({}, { projection: { _id: 0 } }).toArray();
  res.json({ poems: items as PoemDTO[] });
};

export const bulkUpsertBooks: RequestHandler = async (req, res) => {
  try {
    await ensureIndexes();
    const body: BulkBooksRequest = { books: z.array(bookSchema).parse((req.body || {}).books || []) };
    const db = await getDb();
    const ops = body.books.map((b) => ({ updateOne: { filter: { id: b.id }, update: { $set: b }, upsert: true } }));
    if (ops.length) await db.collection("books").bulkWrite(ops, { ordered: false });
    res.json({ ok: true, upserted: ops.length });
  } catch (err: any) {
    res.status(400).json({ ok: false, message: err?.message || "Invalid request" });
  }
};

export const listBooks: RequestHandler = async (_req, res) => {
  const db = await getDb();
  const items = await db.collection("books").find({}, { projection: { _id: 0 } }).toArray();
  res.json({ books: items as BookDTO[] });
};
