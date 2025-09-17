import { sanitizeHtml } from "@/lib/html";
import { format } from "date-fns";
import {
  AlignmentType,
  Document as DocxDocument,
  HeadingLevel,
  Packer,
  Paragraph,
  TextRun,
  UnderlineType,
  PageBreak,
} from "docx";

function nanoid(size = 12): string {
  const chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ_abcdefghijklmnopqrstuvwxyz-";
  const array = new Uint8Array(size);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) crypto.getRandomValues(array);
  else for (let i = 0; i < size; i++) array[i] = Math.floor(Math.random() * 256);
  let id = "";
  for (let i = 0; i < size; i++) id += chars[array[i] % chars.length];
  return id;
}

export type Chapter = { id: string; title: string; content: string };

export type BookStatus = "draft" | "published";

export type Book = {
  id: string;
  title: string;
  description: string;
  cover?: string | null;
  content: string; // legacy HTML (kept for compatibility)
  chapters?: Chapter[];
  activeChapterId?: string | null;
  lastEdited: string; // ISO date
  createdAt: string; // ISO date
  completed?: boolean;
  genre?: string | null;
  tags?: string[];
  status?: BookStatus;
};

const STORAGE_KEY = "books:v1";
const STORAGE_LAST_OPEN = "books:lastOpened";
const STORAGE_RECENTS = "books:recent";
const STORAGE_WRITE_DAYS = "books:write:days";

function ensureChapters(b: Book): Book {
  if (b.chapters && b.chapters.length > 0) return b;
  const first: Chapter = { id: nanoid(), title: "Chapter 1", content: (b.content || "") };
  return { ...b, chapters: [first], activeChapterId: first.id };
}

export function loadBooks(): Book[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw) as Book[];
    if (!Array.isArray(arr)) return [];
    return arr.map((b) => ensureChapters({
      ...b,
      id: b.id || nanoid(),
      title: (b.title || "Untitled Book").trim(),
      description: b.description || "",
      content: b.content || "",
      lastEdited: b.lastEdited || new Date().toISOString(),
      createdAt: b.createdAt || new Date().toISOString(),
      completed: !!b.completed,
      genre: b.genre ?? null,
      tags: Array.isArray(b.tags) ? b.tags : typeof (b as any).tags === "string" ? (b as any).tags.split(",").map((t: string) => t.trim()).filter(Boolean) : [],
      status: (b.status as BookStatus) || (b.completed ? "published" : "draft"),
    }));
  } catch {
    return [];
  }
}

export function saveBooks(books: Book[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(books));
}

export function createBook(init?: Partial<Pick<Book, "title" | "description" | "cover" | "content" | "genre" | "tags" | "status">>): Book {
  const now = new Date();
  const chapter: Chapter = { id: nanoid(), title: "Chapter 1", content: init?.content || "" };
  return {
    id: nanoid(),
    title: (init?.title || "Untitled Book").trim() || "Untitled Book",
    description: init?.description || "",
    cover: init?.cover ?? null,
    content: init?.content || "",
    chapters: [chapter],
    activeChapterId: chapter.id,
    createdAt: now.toISOString(),
    lastEdited: now.toISOString(),
    completed: false,
    genre: init?.genre ?? null,
    tags: init?.tags ?? [],
    status: init?.status ?? "draft",
  };
}

export function upsertBook(list: Book[], book: Book): Book[] {
  const idx = list.findIndex((b) => b.id === book.id);
  const next = [...list];
  if (idx >= 0) next[idx] = { ...book };
  else next.unshift(book);
  saveBooks(next);
  return next;
}

export function updateBook(list: Book[], id: string, patch: Partial<Book>): Book[] {
  const idx = list.findIndex((b) => b.id === id);
  if (idx < 0) return list;
  const next = [...list];
  const merged: Book = { ...next[idx], ...patch } as Book;
  if (typeof patch.completed !== "undefined") {
    merged.status = patch.completed ? "published" : (merged.status || "draft");
  }
  merged.lastEdited = new Date().toISOString();
  next[idx] = merged;
  markWritingToday();
  saveBooks(next);
  return next;
}

export function deleteBook(list: Book[], id: string): Book[] {
  const next = list.filter((b) => b.id !== id);
  saveBooks(next);
  if (getLastOpenedBookId() === id) setLastOpenedBookId(null);
  return next;
}

export function duplicateBook(list: Book[], id: string): Book[] {
  const src = list.find((b) => b.id === id);
  if (!src) return list;
  const copy: Book = {
    ...src,
    id: nanoid(),
    title: `${src.title} (Copy)`,
    createdAt: new Date().toISOString(),
    lastEdited: new Date().toISOString(),
  };
  const next = [copy, ...list];
  saveBooks(next);
  return next;
}

export function setLastOpenedBookId(id: string | null) {
  if (!id) {
    localStorage.removeItem(STORAGE_LAST_OPEN);
    return;
  }
  localStorage.setItem(STORAGE_LAST_OPEN, id);
  try {
    const raw = localStorage.getItem(STORAGE_RECENTS);
    const arr = Array.isArray(raw ? JSON.parse(raw) : null) ? (JSON.parse(raw) as string[]) : [];
    const next = [id, ...arr.filter((x) => x !== id)].slice(0, 5);
    localStorage.setItem(STORAGE_RECENTS, JSON.stringify(next));
  } catch {}
}

export function getLastOpenedBookId(): string | null {
  return localStorage.getItem(STORAGE_LAST_OPEN);
}

export function getRecentBookIds(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_RECENTS);
    const arr = JSON.parse(raw || "[]");
    return Array.isArray(arr) ? (arr as string[]) : [];
  } catch {
    return [];
  }
}

function toDayString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function markWritingToday() {
  try {
    const today = toDayString(new Date());
    const raw = localStorage.getItem(STORAGE_WRITE_DAYS);
    const arr = Array.isArray(raw ? JSON.parse(raw) : null) ? (JSON.parse(raw) as string[]) : [];
    if (!arr.includes(today)) {
      arr.push(today);
      localStorage.setItem(STORAGE_WRITE_DAYS, JSON.stringify(arr));
    }
  } catch {}
}

export function getWritingDays(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_WRITE_DAYS);
    const arr = JSON.parse(raw || "[]");
    return Array.isArray(arr) ? (arr as string[]) : [];
  } catch {
    return [];
  }
}

// ---- Export helpers (DOCX) ----
function runsFromInline(node: Node, styles?: Partial<{ bold: boolean; italics: boolean; strike: boolean; code: boolean; href?: string }>): TextRun[] {
  const style = styles || {};
  const out: TextRun[] = [];
  node.childNodes.forEach((child) => {
    if (child.nodeType === Node.TEXT_NODE) {
      const t = child.textContent || "";
      if (t.length) {
        out.push(
          new TextRun({
            text: t,
            bold: !!style.bold,
            italics: !!style.italics,
            strike: !!style.strike,
            font: style.code ? "Courier New" : undefined,
            color: style.href ? "1155CC" : undefined,
            underline: style.href ? { type: UnderlineType.SINGLE } : undefined,
          }),
        );
      }
    } else if (child.nodeType === Node.ELEMENT_NODE) {
      const el = child as HTMLElement;
      const tag = el.tagName;
      if (tag === "BR") {
        out.push(new TextRun({ break: 1 }));
        return;
      }
      const nextStyle = { ...style } as any;
      if (tag === "STRONG" || tag === "B") nextStyle.bold = true;
      if (tag === "EM" || tag === "I") nextStyle.italics = true;
      if (tag === "S" || tag === "DEL") nextStyle.strike = true;
      if (tag === "CODE") nextStyle.code = true;
      if (tag === "A") {
        const href = (el.getAttribute("href") || "").trim();
        if (href) nextStyle.href = href;
      }
      out.push(...runsFromInline(el, nextStyle));
    }
  });
  return out;
}

function paragraphFromElement(el: HTMLElement): Paragraph[] {
  const tag = el.tagName;
  const paragraphs: Paragraph[] = [];
  const spacing = { line: 408, lineRule: "auto" } as const;

  if (tag === "P") {
    const children = runsFromInline(el);
    paragraphs.push(new Paragraph({ children, spacing }));
  } else if (tag === "H1" || tag === "H2" || tag === "H3" || tag === "H4" || tag === "H5" || tag === "H6") {
    const level: Record<string, HeadingLevel> = {
      H1: HeadingLevel.HEADING_1,
      H2: HeadingLevel.HEADING_2,
      H3: HeadingLevel.HEADING_3,
      H4: HeadingLevel.HEADING_4,
      H5: HeadingLevel.HEADING_5,
      H6: HeadingLevel.HEADING_6,
    };
    const children = runsFromInline(el);
    paragraphs.push(new Paragraph({ heading: level[tag], children, spacing }));
  } else if (tag === "UL" || tag === "OL") {
    const isOrdered = tag === "OL";
    const items = Array.from(el.children).filter((c) => c.tagName === "LI") as HTMLElement[];
    items.forEach((li) => {
      const children = runsFromInline(li);
      if (isOrdered) {
        paragraphs.push(new Paragraph({ children, numbering: { reference: "ol", level: 0 }, spacing }));
      } else {
        paragraphs.push(new Paragraph({ children, bullet: { level: 0 }, spacing }));
      }
    });
  } else if (tag === "BLOCKQUOTE") {
    const inner = runsFromInline(el);
    paragraphs.push(new Paragraph({ children: inner, spacing, indent: { left: 720 }, border: { left: { color: "CCCCCC", space: 1, size: 6 } } }));
  } else if (tag === "PRE") {
    const text = el.textContent || "";
    const lines = text.split(/\r?\n/);
    const runs: TextRun[] = [];
    lines.forEach((ln, i) => {
      if (i > 0) runs.push(new TextRun({ break: 1 }));
      runs.push(new TextRun({ text: ln, font: "Courier New" }));
    });
    paragraphs.push(new Paragraph({ children: runs, spacing }));
  } else if (tag === "HR") {
    paragraphs.push(new Paragraph({ thematicBreak: true }));
  } else if (tag === "DIV") {
    Array.from(el.childNodes).forEach((n) => {
      if (n.nodeType === Node.TEXT_NODE) {
        const t = (n.textContent || "").trim();
        if (t) paragraphs.push(new Paragraph({ children: [new TextRun({ text: t })], spacing }));
      } else if (n.nodeType === Node.ELEMENT_NODE) {
        paragraphs.push(...paragraphFromElement(n as HTMLElement));
      }
    });
  }

  return paragraphs;
}

function buildParagraphsFromHTML(html: string): Paragraph[] {
  const container = document.createElement("div");
  container.innerHTML = sanitizeHtml(html || "");
  const out: Paragraph[] = [];
  Array.from(container.childNodes).forEach((node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const t = (node.textContent || "").trim();
      if (t) out.push(new Paragraph({ children: [new TextRun({ text: t })] }));
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      out.push(...paragraphFromElement(node as HTMLElement));
    }
  });
  return out.length ? out : [new Paragraph("")];
}

export async function exportBookToDOCX(book: Book, filename = "angelwrites-book.docx") {
  const doc = new DocxDocument({
    numbering: {
      config: [
        { reference: "ol", levels: [{ level: 0, format: "decimal", text: "%1.", alignment: AlignmentType.START }] },
      ],
    },
    sections: [
      {
        properties: {},
        children: [
          new Paragraph({ text: book.title, heading: HeadingLevel.HEADING_1 }),
          new Paragraph({ children: [new TextRun({ text: format(new Date(book.lastEdited), "PPP"), italics: true })] }),
          new Paragraph({}),
          ...(book.chapters && book.chapters.length
            ? book.chapters.flatMap((ch, idx) => [
                ...(idx > 0 ? [new Paragraph({ children: [new PageBreak()] })] : []),
                new Paragraph({ text: ch.title, heading: HeadingLevel.HEADING_2 }),
                ...buildParagraphsFromHTML(ch.content),
              ])
            : buildParagraphsFromHTML(book.content)),
        ],
      },
    ],
  });
  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function download(filename: string, data: string | Blob, mime = "application/octet-stream") {
  const blob = data instanceof Blob ? data : new Blob([data], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function exportBooksJSON(books: Book[], filename = "angelwrites-books.json") {
  download(filename, JSON.stringify({ books }, null, 2), "application/json");
}

export function getBookWordCount(book: Book): number {
  const html = (book.chapters && book.chapters.length ? book.chapters.map((c) => c.content).join("\n") : book.content) || "";
  const text = html.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
  if (!text) return 0;
  return text.split(/\s+/).length;
}

export async function exportBookToEPUB(book: Book, filename = "book.epub") {
  const { default: JSZip } = await import("jszip");
  const zip = new JSZip();
  zip.file("mimetype", "application/epub+zip", { compression: "STORE" });
  zip.file(
    "META-INF/container.xml",
    `<?xml version="1.0" encoding="UTF-8"?>\n<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">\n  <rootfiles>\n    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>\n  </rootfiles>\n</container>`,
  );
  const chapters = book.chapters && book.chapters.length ? book.chapters : [{ id: "legacy", title: book.title, content: book.content }];
  const manifestItems: string[] = [];
  const spineItems: string[] = [];
  chapters.forEach((ch, idx) => {
    const id = `ch${idx + 1}`;
    const xhtml = `<?xml version="1.0" encoding="utf-8"?>\n<!DOCTYPE html>\n<html xmlns="http://www.w3.org/1999/xhtml">\n<head>\n  <title>${escapeXml(ch.title)}</title>\n  <meta charset="utf-8"/>\n</head>\n<body>\n  <h1>${escapeXml(ch.title)}</h1>\n  ${sanitizeHtml(ch.content || "")}
</body>\n</html>`;
    zip.file(`OEBPS/${id}.xhtml`, xhtml);
    manifestItems.push(`<item id="${id}" href="${id}.xhtml" media-type="application/xhtml+xml"/>`);
    spineItems.push(`<itemref idref="${id}"/>`);
  });
  const opf = `<?xml version="1.0" encoding="UTF-8"?>\n<package version="2.0" xmlns="http://www.idpf.org/2007/opf" unique-identifier="BookId">\n  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">\n    <dc:title>${escapeXml(book.title)}</dc:title>\n    <dc:language>en</dc:language>\n    <dc:date>${new Date(book.lastEdited).toISOString()}</dc:date>\n  </metadata>\n  <manifest>\n    ${manifestItems.join("\n    ")}\n    <item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>\n  </manifest>\n  <spine toc="ncx">\n    ${spineItems.join("\n    ")}\n  </spine>\n</package>`;
  const toc = `<?xml version="1.0" encoding="UTF-8"?>\n<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">\n  <head>\n    <meta name="dtb:uid" content="id"/>\n    <meta name="dtb:depth" content="1"/>\n  </head>\n  <docTitle><text>${escapeXml(book.title)}</text></docTitle>\n  <navMap>\n    ${chapters
      .map((ch, i) => `<navPoint id="navPoint-${i + 1}" playOrder="${i + 1}"><navLabel><text>${escapeXml(ch.title)}</text></navLabel><content src="ch${i + 1}.xhtml"/></navPoint>`)
      .join("\n    ")}\n  </navMap>\n</ncx>`;
  zip.file("OEBPS/content.opf", opf);
  zip.file("OEBPS/toc.ncx", toc);
  const blob = await zip.generateAsync({ type: "blob", mimeType: "application/epub+zip" });
  download(filename, blob, "application/epub+zip");
}

function escapeXml(s: string): string {
  return (s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\"/g, "&quot;").replace(/'/g, "&apos;");
}

export function exportBookToPDF(book: Book) {
  const w = window.open("", "_blank");
  if (!w) return;
  const styles = `body{font-family:system-ui,Segoe UI,Roboto,Helvetica,Arial,sans-serif;line-height:1.5;padding:40px;} h1,h2,h3{margin:1.2em 0 .5em;} hr{margin:2em 0;} .meta{color:#666;font-size:12px;margin-bottom:20px}`;
  const body = `<!doctype html><html><head><meta charset="utf-8"/><title>${escapeXml(book.title)}</title><style>${styles}</style></head><body><h1>${escapeXml(book.title)}</h1><div class="meta">Last edited ${format(new Date(book.lastEdited), "PPP")}</div>${
    book.chapters && book.chapters.length
      ? book.chapters.map((c, i) => `<h2>${escapeXml(c.title)}</h2>${sanitizeHtml(c.content || "")}${i < (book.chapters?.length || 0) - 1 ? "<hr/>" : ""}`).join("")
      : sanitizeHtml(book.content)
  }</body></html>`;
  w.document.open();
  w.document.write(body);
  w.document.close();
  w.focus();
  w.print();
}

export function importBooksFromJSON(list: Book[], json: string): Book[] {
  try {
    const obj = JSON.parse(json);
    const imported: Book[] = Array.isArray(obj) ? obj : Array.isArray(obj.books) ? obj.books : [];
    const map = new Map<string, Book>(list.map((b) => [b.id, b]));
    imported.forEach((b) => map.set(b.id, b));
    const next = Array.from(map.values());
    saveBooks(next);
    return next;
  } catch {
    return list;
  }
}
