import { MongoClient, Db } from "mongodb";

let _client: MongoClient | null = null;
let _db: Db | null = null;

function getUri(): string {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not set");
  return uri;
}

function getDbName(): string {
  return process.env.MONGODB_DB || "angelwrites";
}

export async function getMongoClient(): Promise<MongoClient> {
  if (_client) return _client;
  const client = new MongoClient(getUri(), { serverApi: { version: "1", strict: true, deprecationErrors: true } as any });
  _client = await client.connect();
  return _client;
}

export async function getDb(): Promise<Db> {
  if (_db) return _db;
  const client = await getMongoClient();
  _db = client.db(getDbName());
  return _db;
}

export async function pingMongo(): Promise<{ ok: boolean; db: string }> {
  const db = await getDb();
  await db.command({ ping: 1 });
  return { ok: true, db: db.databaseName };
}

export async function closeMongo(): Promise<void> {
  if (_client) {
    await _client.close();
    _client = null;
    _db = null;
  }
}
