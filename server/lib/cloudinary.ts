import { v2 as cloudinary } from "cloudinary";

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} is not set`);
  return v;
}

let _configured = false;
export function ensureCloudinaryConfigured() {
  if (_configured) return;
  const cloud_name = required("CLOUDINARY_CLOUD_NAME");
  const api_key = required("CLOUDINARY_API_KEY");
  const api_secret = required("CLOUDINARY_API_SECRET");
  cloudinary.config({ cloud_name, api_key, api_secret });
  _configured = true;
}

export async function uploadImage(file: string, folder = "angelwrites/books"): Promise<string> {
  ensureCloudinaryConfigured();
  const res = await cloudinary.uploader.upload(file, {
    folder,
    resource_type: "image",
    overwrite: true,
    transformation: [
      // Basic normalization to reasonable size
      { quality: "auto", fetch_format: "auto" },
    ],
  });
  return res.secure_url || res.url;
}
