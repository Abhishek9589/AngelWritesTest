import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { BookOpen, Library, NotebookPen, Plus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Book, createBook, getLastOpenedBookId, loadBooks, saveBooks, setLastOpenedBookId } from "@/lib/books";

export default function BookHome() {
  const navigate = useNavigate();
  const [books, setBooks] = useState<Book[]>(() => loadBooks());

  useEffect(() => { saveBooks(books); }, [books]);

  const stats = useMemo(() => ({
    total: books.length,
    completed: books.filter((b) => b.completed).length,
    inProgress: books.filter((b) => !b.completed && (b.content?.trim()?.length || 0) > 0).length,
  }), [books]);

  const lastId = getLastOpenedBookId();
  const last = books.find((b) => b.id === lastId) || null;

  return (
    <main className="container py-10 animate-in fade-in-0 slide-in-from-bottom-2 duration-700">
      <section className="relative overflow-hidden rounded-3xl p-8 md:p-12 mb-6 glass">
        <div className="relative z-10">
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight gradient-text">Book Hub</h1>
          <p className="mt-2 md:mt-3 max-w-2xl text-sm md:text-base text-muted-foreground">Start a new book, continue where you left off, or open your library. Your progress is saved locally and can be exported anytime.</p>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Button className="gap-2" onClick={() => {
              const b = createBook({ title: "Untitled Book" });
              setBooks((prev) => [b, ...prev]);
              setLastOpenedBookId(b.id);
              navigate("/book/quill");
            }}><Plus className="h-4 w-4" /> Start New Book</Button>
            <Link to="/book/library"><Button variant="outline" className="gap-2"><Library className="h-4 w-4" /> Open Library</Button></Link>
            <Button variant="outline" className="gap-2" disabled={!last} onClick={() => navigate("/book/quill")}>{last ? <><NotebookPen className="h-4 w-4" /> Resume: {last.title}</> : <><NotebookPen className="h-4 w-4" /> Resume Last Book</>}</Button>
          </div>
        </div>
        <div className="pointer-events-none absolute -top-20 -right-20 h-72 w-72 rounded-full bg-gradient-to-tr from-cyan-400/40 via-fuchsia-500/30 to-pink-500/30 dark:from-cyan-400/20 dark:via-fuchsia-500/16 dark:to-pink-500/16 blur-3xl"></div>
        <div className="pointer-events-none absolute -bottom-16 -left-10 h-56 w-56 rounded-full bg-gradient-to-tr from-emerald-300/40 via-cyan-400/30 to-indigo-400/30 dark:from-emerald-300/20 dark:via-cyan-400/16 dark:to-indigo-400/16 blur-3xl"></div>
      </section>

      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card><CardContent className="p-5"><div className="flex items-center gap-3"><BookOpen className="h-5 w-5" /><div><div className="text-sm text-muted-foreground">Total Books</div><div className="text-2xl font-semibold">{stats.total}</div></div></div></CardContent></Card>
        <Card><CardContent className="p-5"><div className="flex items-center gap-3"><NotebookPen className="h-5 w-5" /><div><div className="text-sm text-muted-foreground">In Progress</div><div className="text-2xl font-semibold">{stats.inProgress}</div></div></div></CardContent></Card>
        <Card><CardContent className="p-5"><div className="flex items-center gap-3"><Library className="h-5 w-5" /><div><div className="text-sm text-muted-foreground">Completed</div><div className="text-2xl font-semibold">{stats.completed}</div></div></div></CardContent></Card>
      </section>
    </main>
  );
}
