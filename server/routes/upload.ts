import type { RequestHandler } from "express";
import { z } from "zod";
import { uploadImage } from "../lib/cloudinary";

const bodySchema = z.object({ file: z.string().min(8) });

export const handleUploadCover: RequestHandler = async (req, res) => {
  try {
    const { file } = bodySchema.parse(req.body || {});
    const url = await uploadImage(file, "angelwrites/books");
    res.json({ ok: true, url });
  } catch (err: any) {
    res.status(400).json({ ok: false, message: err?.message || "upload_failed" });
  }
};
