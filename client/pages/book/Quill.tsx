import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { LoadingScreen } from "@/components/ui/loading";
import { POET_SARCASTIC_MESSAGES } from "@/lib/messages";
import { Book, Chapter, getLastOpenedBookId, loadBooks, saveBooks, setLastOpenedBookId, updateBook } from "@/lib/books";
import { useNavigate } from "react-router-dom";
import { Plus, Trash2, ArrowUp, ArrowDown, Edit2 } from "lucide-react";

const RichEditor = lazy(() => import("@/components/RichEditor"));

function nid(size = 12): string {
  const chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ_abcdefghijklmnopqrstuvwxyz-";
  const array = new Uint8Array(size);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) crypto.getRandomValues(array);
  else for (let i = 0; i < size; i++) array[i] = Math.floor(Math.random() * 256);
  let id = "";
  for (let i = 0; i < size; i++) id += chars[array[i] % chars.length];
  return id;
}

export default function BookQuill() {
  const navigate = useNavigate();
  const [books, setBooks] = useState<Book[]>(() => loadBooks());
  const [bookId, setBookId] = useState<string | null>(() => getLastOpenedBookId());

  const current = useMemo(() => books.find((b) => b.id === bookId) || null, [books, bookId]);

  // Ensure chapters exist (migration)
  useEffect(() => {
    if (!current) return;
    if (!current.chapters || current.chapters.length === 0) {
      const first: Chapter = { id: nid(), title: "Chapter 1", content: current.content || "" };
      setBooks((prev) => updateBook(prev, current.id, { chapters: [first], activeChapterId: first.id }));
    }
  }, [current?.id]);

  useEffect(() => { saveBooks(books); }, [books]);

  useEffect(() => {
    const id = getLastOpenedBookId();
    if (!id) return;
    setBookId(id);
  }, []);

  const chapterId = current?.activeChapterId || (current?.chapters && current.chapters[0]?.id) || null;
  const chapter = current?.chapters?.find((c) => c.id === chapterId) || null;
  const [value, setValue] = useState<string>(chapter?.content || "");
  const valueRef = useRef<string>(value);

  // Keep editor value in sync when chapter changes
  useEffect(() => {
    setValue(chapter?.content || "");
    valueRef.current = chapter?.content || "";
  }, [chapterId]);

  // Autosave editor content
  useEffect(() => {
    if (!current || !chapter) return;
    const t = window.setTimeout(() => {
      if (valueRef.current !== value) valueRef.current = value;
      if (value !== chapter.content) {
        const nextChapters = (current.chapters || []).map((c) => (c.id === chapter.id ? { ...c, content: value } : c));
        setBooks((prev) => updateBook(prev, current.id, { chapters: nextChapters }));
      }
    }, 800);
    return () => window.clearTimeout(t);
  }, [value, chapter?.id, current?.id]);

  if (!current) {
    return (
      <main className="container py-10">
        <div className="rounded-2xl border p-6 glass-soft">
          <h2 className="text-lg font-semibold">Quill</h2>
          <p className="text-sm text-muted-foreground mt-1">Select a book from Library to begin writing in Quill.</p>
          <div className="mt-4"><Button onClick={() => navigate("/book/library")}>Open Library</Button></div>
        </div>
      </main>
    );
  }

  const chapters = current.chapters || [];

  const addChapter = () => {
    const idx = chapters.length + 1;
    const ch: Chapter = { id: nid(), title: `Chapter ${idx}`, content: "" };
    setBooks((prev) => updateBook(prev, current.id, { chapters: [...chapters, ch], activeChapterId: ch.id }));
  };
  const deleteChapter = (id: string) => {
    if (chapters.length <= 1) return; // keep at least one
    const next = chapters.filter((c) => c.id !== id);
    const nextActive = next[0]?.id || null;
    setBooks((prev) => updateBook(prev, current.id, { chapters: next, activeChapterId: nextActive }));
  };
  const renameChapter = (id: string) => {
    const title = prompt("Chapter title", chapters.find((c) => c.id === id)?.title || "");
    if (title == null) return;
    const next = chapters.map((c) => (c.id === id ? { ...c, title: title.trim() || c.title } : c));
    setBooks((prev) => updateBook(prev, current.id, { chapters: next }));
  };
  const moveChapter = (id: string, dir: -1 | 1) => {
    const i = chapters.findIndex((c) => c.id === id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= chapters.length) return;
    const next = [...chapters];
    const [sp] = next.splice(i, 1);
    next.splice(j, 0, sp);
    setBooks((prev) => updateBook(prev, current.id, { chapters: next }));
  };

  return (
    <main className="container h-[calc(100vh-8rem)] py-4 animate-in fade-in-0 slide-in-from-bottom-2 duration-700">
      <div className="flex items-center justify-between mb-3">
        <h1 className="text-xl font-semibold">{current.title}</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => navigate("/book/library")}>Library</Button>
          <Button onClick={() => { if (chapter) setBooks((prev) => updateBook(prev, current.id, { chapters: chapters.map((c) => c.id === chapter.id ? { ...c, content: value } : c) })); setLastOpenedBookId(current.id); }}>Save</Button>
        </div>
      </div>
      <div className="grid grid-cols-12 gap-4 h-[calc(100%-3rem)]">
        <aside className="col-span-12 md:col-span-3 lg:col-span-2 rounded-2xl border p-3 glass-soft overflow-auto">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-medium text-muted-foreground">Chapters</div>
            <Button size="sm" variant="outline" className="h-8 px-3" onClick={addChapter}><Plus className="h-4 w-4" /></Button>
          </div>
          <nav className="space-y-1">
            {chapters.map((c, idx) => (
              <div key={c.id} className={`group rounded-xl border px-3 py-2 ${c.id === chapterId ? "bg-primary/10 border-primary/30" : "hover:bg-accent"}`}>
                <button className="w-full text-left" onClick={() => setBooks((prev) => updateBook(prev, current.id, { activeChapterId: c.id }))}>
                  <div className="text-sm font-medium line-clamp-1">{c.title}</div>
                </button>
                <div className="mt-1 flex items-center gap-1 opacity-80">
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => moveChapter(c.id, -1)} disabled={idx === 0}><ArrowUp className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => moveChapter(c.id, 1)} disabled={idx === chapters.length - 1}><ArrowDown className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => renameChapter(c.id)}><Edit2 className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => deleteChapter(c.id)} disabled={chapters.length <= 1}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </div>
            ))}
          </nav>
        </aside>

        <section className="col-span-12 md:col-span-9 lg:col-span-10">
          {!chapter ? (
            <div className="rounded-2xl border p-6 glass-soft h-full">
              <div className="text-sm text-muted-foreground">No chapter selected.</div>
            </div>
          ) : (
            <div className="h-full rounded-2xl overflow-hidden">
              <Suspense fallback={<LoadingScreen fullscreen={false} messages={POET_SARCASTIC_MESSAGES} />}>
                <RichEditor value={value} onChange={(v) => setValue(v)} placeholder="Begin your chapter..." />
              </Suspense>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
