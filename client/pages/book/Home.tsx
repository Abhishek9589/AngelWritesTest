import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { BookOpen, Library, NotebookPen, Plus, Clock, FileText, Hash } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Book,
  BookStatus,
  createBook,
  getBookWordCount,
  getLastOpenedBookId,
  getRecentBookIds,
  getWritingDays,
  loadBooks,
  saveBooks,
  setLastOpenedBookId,
} from "@/lib/books";
import { formatDistanceToNow } from "date-fns";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

function computeStreak(days: string[]): number {
  const set = new Set(days);
  const today = new Date();
  let streak = 0;
  for (let i = 0; i < 3650; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    if (set.has(key)) streak++;
    else break;
  }
  return streak;
}

export default function BookHome() {
  const navigate = useNavigate();
  const [books, setBooks] = useState<Book[]>(() => loadBooks());

  useEffect(() => {
    saveBooks(books);
  }, [books]);

  const stats = useMemo(() => {
    const total = books.length;
    const chapters = books.reduce((sum, b) => sum + (b.chapters?.length || 0), 0);
    const totalWords = books.reduce((sum, b) => sum + getBookWordCount(b), 0);
    const streak = computeStreak(getWritingDays());
    return { total, chapters, totalWords, streak };
  }, [books]);

  const lastId = getLastOpenedBookId();
  const last = books.find((b) => b.id === lastId) || null;

  const recents = useMemo(() => {
    const ids = getRecentBookIds();
    const map = new Map(books.map((b) => [b.id, b] as const));
    return ids.map((id) => map.get(id)).filter(Boolean).slice(0, 5) as Book[];
  }, [books]);

  // New Book dialog state
  const [openNew, setOpenNew] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);
  const descRef = useRef<HTMLInputElement>(null);
  const coverRef = useRef<HTMLInputElement>(null);
  const genreRef = useRef<HTMLInputElement>(null);
  const tagsRef = useRef<HTMLInputElement>(null);
  const [statusDraft, setStatusDraft] = useState<BookStatus>("draft");

  const onCreate = () => {
    const title = (titleRef.current?.value || "Untitled Book").toString();
    const description = (descRef.current?.value || "").toString();
    const cover = (coverRef.current?.value || "").toString() || null;
    const genre = (genreRef.current?.value || "").toString() || null;
    const tags = (tagsRef.current?.value || "").split(",").map((t) => t.trim()).filter(Boolean);
    const status = statusDraft || "draft";
    const b = createBook({ title, description, cover, genre, tags, status });
    setBooks((prev) => [b, ...prev]);
    setLastOpenedBookId(b.id);
    setOpenNew(false);
    navigate("/book/quill");
  };

  return (
    <main className="container py-10 animate-in fade-in-0 slide-in-from-bottom-2 duration-700">
      <section className="relative overflow-hidden rounded-3xl p-8 md:p-12 mb-6 glass">
        <div className="relative z-10">
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight gradient-text">Book Hub</h1>
          <p className="mt-2 md:mt-3 max-w-2xl text-sm md:text-base text-muted-foreground">Start a new book, continue where you left off, or open your library. Your progress is saved locally and can be exported anytime.</p>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Button className="gap-2" onClick={() => setOpenNew(true)}><Plus className="h-4 w-4" /> Start New Book</Button>
            <Link to="/book/library"><Button variant="outline" className="gap-2"><Library className="h-4 w-4" /> Open Library</Button></Link>
            <Button variant="outline" className="gap-2" disabled={!last} onClick={() => navigate("/book/quill")}>{last ? <><NotebookPen className="h-4 w-4" /> Resume: {last.title}</> : <><NotebookPen className="h-4 w-4" /> Resume Last Book</>}</Button>
          </div>
        </div>
        <div className="pointer-events-none absolute -top-20 -right-20 h-72 w-72 rounded-full bg-gradient-to-tr from-cyan-400/40 via-fuchsia-500/30 to-pink-500/30 dark:from-cyan-400/20 dark:via-fuchsia-500/16 dark:to-pink-500/16 blur-3xl"></div>
        <div className="pointer-events-none absolute -bottom-16 -left-10 h-56 w-56 rounded-full bg-gradient-to-tr from-emerald-300/40 via-cyan-400/30 to-indigo-400/30 dark:from-emerald-300/20 dark:via-cyan-400/16 dark:to-indigo-400/16 blur-3xl"></div>
      </section>

      {recents.length > 0 && (
        <section className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-semibold">Recently Opened</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {recents.map((b) => (
              <Card key={b.id} className="group">
                <CardContent className="p-4 flex items-start gap-3">
                  <img src={b.cover || "/placeholder.svg"} alt="Cover" className="h-16 w-12 object-cover rounded-md border" />
                  <div className="min-w-0">
                    <div className="text-base font-semibold leading-tight line-clamp-1">{b.title}</div>
                    <div className="text-[11px] text-muted-foreground">Last edited {formatDistanceToNow(new Date(b.lastEdited), { addSuffix: true })}</div>
                    <div className="mt-2 flex items-center gap-2">
                      <Button size="sm" variant="outline" onClick={() => { setLastOpenedBookId(b.id); navigate("/book/quill"); }}>Open</Button>
                      <div className="text-xs text-muted-foreground flex items-center gap-1"><FileText className="h-3 w-3" /> {getBookWordCount(b)} words</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      <section className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card><CardContent className="p-5"><div className="flex items-center gap-3"><BookOpen className="h-5 w-5" /><div><div className="text-sm text-muted-foreground">Total Books</div><div className="text-2xl font-semibold">{stats.total}</div></div></div></CardContent></Card>
        <Card><CardContent className="p-5"><div className="flex items-center gap-3"><Hash className="h-5 w-5" /><div><div className="text-sm text-muted-foreground">Chapters Written</div><div className="text-2xl font-semibold">{stats.chapters}</div></div></div></CardContent></Card>
        <Card><CardContent className="p-5"><div className="flex items-center gap-3"><FileText className="h-5 w-5" /><div><div className="text-sm text-muted-foreground">Total Words</div><div className="text-2xl font-semibold">{stats.totalWords}</div></div></div></CardContent></Card>
        <Card><CardContent className="p-5"><div className="flex items-center gap-3"><Clock className="h-5 w-5" /><div><div className="text-sm text-muted-foreground">Streak</div><div className="text-2xl font-semibold">{stats.streak} days</div></div></div></CardContent></Card>
      </section>

      <Dialog open={openNew} onOpenChange={setOpenNew}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Book</DialogTitle>
            <DialogDescription>Create a fresh project with your metadata.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <Input ref={titleRef} placeholder="Title" />
            <Input ref={descRef} placeholder="Short description" />
            <Input ref={coverRef} placeholder="Cover image URL" />
            <Input ref={genreRef} placeholder="Genre" />
            <Input ref={tagsRef} placeholder="Tags (comma-separated)" />
            <div>
              <label className="text-xs text-muted-foreground">Status</label>
              <Select defaultValue="draft" onValueChange={(v) => setStatusDraft(v as BookStatus)}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenNew(false)}>Cancel</Button>
            <Button onClick={onCreate}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
