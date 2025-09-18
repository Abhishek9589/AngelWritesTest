export async function uploadCover(file: string): Promise<string> {
  const r = await fetch("/api/upload/cover", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ file }),
  });
  const raw = await r.text();
  let data: any = {};
  try { data = raw ? JSON.parse(raw) : {}; } catch {}
  if (!r.ok || data?.ok === false || !data?.url) {
    throw new Error(data?.message || "Upload failed");
  }
  return data.url as string;
}
