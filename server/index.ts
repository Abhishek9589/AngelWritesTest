import "dotenv/config";
import express from "express";
import cors from "cors";
import { handleDemo } from "./routes/demo";
import { pingMongo } from "./lib/mongo";
import { handleSignIn, handleSignUp, handleVerifySignup } from "./routes/auth";
import { bulkUpsertPoems, bulkUpsertBooks, listPoems, listBooks } from "./routes/content";

export function createServer() {
  const app = express();

  // Middleware
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Example API routes
  app.get("/api/ping", (_req, res) => {
    const ping = process.env.PING_MESSAGE ?? "ping";
    res.json({ message: ping });
  });

  app.get("/api/demo", handleDemo);

  // Auth
  app.post("/api/auth/signup", handleSignUp);
  app.post("/api/auth/signup/verify", handleVerifySignup);
  app.post("/api/auth/signin", handleSignIn);

  // Content sync
  app.post("/api/poems/bulk", bulkUpsertPoems);
  app.get("/api/poems", listPoems);
  app.post("/api/books/bulk", bulkUpsertBooks);
  app.get("/api/books", listBooks);

  // Database health check
  app.get("/api/db/ping", async (_req, res) => {
    try {
      const info = await pingMongo();
      res.json({ status: "ok", ...info });
    } catch (err: any) {
      res.status(500).json({ status: "error", message: err?.message || String(err) });
    }
  });

  return app;
}
