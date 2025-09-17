import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Book,
  BookStatus,
  createBook,
  deleteBook,
  duplicateBook,
  exportBookToDOCX,
  exportBookToEPUB,
  exportBookToPDF,
  exportBooksJSON,
  getBookWordCount,
  getLastOpenedBookId,
  loadBooks,
  saveBooks,
  setLastOpenedBookId,
  updateBook,
} from "@/lib/books";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatDistanceToNow } from "date-fns";
import { BookOpen, Filter, Grid3X3, Image, ListFilter, MoreHorizontal, NotebookPen, Plus, Trash2, Copy, FileDown, FileJson, FileText } from "lucide-react";

export default function BookLibrary() {
  const navigate = useNavigate();
  const [books, setBooks] = useState<Book[]>(() => loadBooks());
  const [editing, setEditing] = useState<Book | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const descRef = useRef<HTMLInputElement>(null);
  const coverRef = useRef<HTMLInputElement>(null);
  const genreRef = useRef<HTMLInputElement>(null);
  const tagsRef = useRef<HTMLInputElement>(null);
  const [statusDraft, setStatusDraft] = useState<BookStatus>("draft");

  // UI state
  const [view, setView] = useState<"grid" | "shelf">(() => (localStorage.getItem("books:view") as any) || "grid");
  const [sortBy, setSortBy] = useState<"lastEdited" | "title" | "wordCount" | "status">(() => (localStorage.getItem("books:sort") as any) || "lastEdited");
  const [filterStatus, setFilterStatus] = useState<"all" | "inprogress" | "completed">(() => (localStorage.getItem("books:filter:status") as any) || "all");
  const [filterGenre, setFilterGenre] = useState<string>(() => localStorage.getItem("books:filter:genre") || "all");
  const [filterTags, setFilterTags] = useState<string>(() => localStorage.getItem("books:filter:tags") || "");

  useEffect(() => { saveBooks(books); }, [books]);

  useEffect(() => { localStorage.setItem("books:view", view); }, [view]);
  useEffect(() => { localStorage.setItem("books:sort", sortBy); }, [sortBy]);
  useEffect(() => { localStorage.setItem("books:filter:status", filterStatus); }, [filterStatus]);
  useEffect(() => { localStorage.setItem("books:filter:genre", filterGenre); }, [filterGenre]);
  useEffect(() => { localStorage.setItem("books:filter:tags", filterTags); }, [filterTags]);

  const onCreate = () => {
    const b = createBook({ title: "Untitled Book" });
    setBooks((prev) => [b, ...prev]);
    setLastOpenedBookId(b.id);
    navigate("/book/quill");
  };

  const lastId = getLastOpenedBookId();

  const genres = useMemo(() => {
    const set = new Set<string>();
    books.forEach((b) => { if (b.genre) set.add(b.genre); });
    return Array.from(set);
  }, [books]);

  const filteredSorted = useMemo(() => {
    const tags = filterTags.split(",").map((t) => t.trim().toLowerCase()).filter(Boolean);
    const byFilter = books.filter((b) => {
      if (filterStatus === "inprogress") {
        const wc = getBookWordCount(b);
        if (b.completed || wc === 0) return false;
      }
      if (filterStatus === "completed" && !b.completed) return false;
      if (filterGenre !== "all" && filterGenre && b.genre !== filterGenre) return false;
      if (tags.length) {
        const setTags = new Set((b.tags || []).map((t) => t.toLowerCase()));
        for (const t of tags) if (!setTags.has(t)) return false;
      }
      return true;
    });
    const withWc = byFilter.map((b) => ({ b, wc: getBookWordCount(b) }));
    withWc.sort((a, c) => {
      if (sortBy === "lastEdited") return new Date(c.b.lastEdited).getTime() - new Date(a.b.lastEdited).getTime();
      if (sortBy === "title") return a.b.title.localeCompare(c.b.title);
      if (sortBy === "wordCount") return c.wc - a.wc;
      if (sortBy === "status") return (a.b.status || "draft").localeCompare(c.b.status || "draft");
      return 0;
    });
    return withWc.map((x) => x.b);
  }, [books, filterStatus, filterGenre, filterTags, sortBy]);

  return (
    <main className="container py-10 animate-in fade-in-0 slide-in-from-bottom-2 duration-700">
      <div className="flex flex-col gap-3 mb-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold">Library</h1>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-md border bg-background p-1">
            <Button variant={view === "grid" ? "default" : "ghost"} onClick={() => setView("grid")} aria-label="Grid view" className="h-8 w-8 p-1"><Grid3X3 className="h-4 w-4" /></Button>
            <Button variant={view === "shelf" ? "default" : "ghost"} onClick={() => setView("shelf")} aria-label="Shelf view" className="h-8 w-8 p-1"><BookOpen className="h-4 w-4" /></Button>
          </div>
          <Button className="gap-2" onClick={onCreate}><Plus className="h-4 w-4" /> New Book</Button>
        </div>
      </div>

      <div className="glass-soft p-3 rounded-xl mb-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
        <div>
          <label className="text-xs text-muted-foreground">Sort by</label>
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
            <SelectTrigger className="mt-1"><SelectValue placeholder="Sort by" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="lastEdited">Last Edited</SelectItem>
              <SelectItem value="title">Title</SelectItem>
              <SelectItem value="wordCount">Word Count</SelectItem>
              <SelectItem value="status">Status</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Filter status</label>
          <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as any)}>
            <SelectTrigger className="mt-1"><SelectValue placeholder="All" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="inprogress">In-progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Filter genre</label>
          <Select value={filterGenre} onValueChange={(v) => setFilterGenre(v)}>
            <SelectTrigger className="mt-1"><SelectValue placeholder="All genres" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              {genres.map((g) => (<SelectItem key={g} value={g}>{g}</SelectItem>))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Filter tags (comma-separated)</label>
          <Input value={filterTags} onChange={(e) => setFilterTags(e.target.value)} placeholder="e.g. fantasy, draft" />
        </div>
      </div>

      {filteredSorted.length === 0 ? (
        <div className="text-center text-sm text-muted-foreground">No books match your filters.</div>
      ) : (
        <section className={view === "grid" ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" : "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3"}>
          {filteredSorted.map((b) => (
            <Card key={b.id} className="group relative overflow-hidden">
              <CardContent className="p-4">
                <div className="flex items-start gap-3 justify-between">
                  <div className="flex items-start gap-3">
                    <img src={b.cover || "/placeholder.svg"} alt="Cover" className={view === "shelf" ? "h-32 w-24 object-cover rounded-md border" : "h-16 w-12 object-cover rounded-md border"} />
                    <div>
                      <div className="text-base font-semibold leading-tight line-clamp-1">{b.title}</div>
                      <div className="text-[11px] text-muted-foreground">Last edited {formatDistanceToNow(new Date(b.lastEdited), { addSuffix: true })}</div>
                      <div className="mt-1 flex flex-wrap items-center gap-1">
                        {b.status ? <Badge variant={b.status === "published" ? "default" : "secondary"}>{b.status}</Badge> : null}
                        {b.completed ? <Badge variant="secondary">Completed</Badge> : <Badge variant="outline">In-progress</Badge>}
                        {b.genre ? <Badge variant="outline">{b.genre}</Badge> : null}
                      </div>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="icon" variant="ghost" aria-label="Actions"><MoreHorizontal className="h-4 w-4" /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => { setLastOpenedBookId(b.id); navigate("/book/quill"); }}><NotebookPen className="h-4 w-4 mr-2" /> Open</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setEditing(b)}>Edit Metadata</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => exportBookToDOCX(b, `${b.title}.docx`)}><FileDown className="h-4 w-4 mr-2" /> Export (DOCX)</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => exportBookToEPUB(b, `${b.title}.epub`)}><FileText className="h-4 w-4 mr-2" /> Export (EPUB)</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => exportBookToPDF(b)}><FileText className="h-4 w-4 mr-2" /> Export (PDF)</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => exportBooksJSON([b], `${b.title}.json`)}><FileJson className="h-4 w-4 mr-2" /> Export (JSON)</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setBooks((prev) => duplicateBook(prev, b.id))}><Copy className="h-4 w-4 mr-2" /> Duplicate</DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive" onClick={() => setDeleteId(b.id)}><Trash2 className="h-4 w-4 mr-2" /> Delete</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <p className="mt-2 text-sm text-muted-foreground line-clamp-3">{b.description || "No description"}</p>
                {lastId === b.id && (
                  <div className="mt-3"><Badge variant="secondary">Last opened</Badge></div>
                )}
                <div className="mt-4 flex items-center justify-between">
                  <Button variant="outline" size="sm" onClick={() => { setLastOpenedBookId(b.id); navigate("/book/quill"); }}>Write</Button>
                  <div className="text-xs text-muted-foreground">{getBookWordCount(b)} words</div>
                </div>
              </CardContent>
            </Card>
          ))}
        </section>
      )}

      <Dialog open={!!editing} onOpenChange={(v) => { if (!v) setEditing(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Metadata</DialogTitle>
            <DialogDescription>Update the book details.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <Input ref={titleRef} defaultValue={editing?.title || ""} placeholder="Title" />
            <Input ref={descRef} defaultValue={editing?.description || ""} placeholder="Short description" />
            <Input ref={coverRef} defaultValue={editing?.cover || ""} placeholder="Cover image URL" />
            <Input ref={genreRef} defaultValue={editing?.genre || ""} placeholder="Genre" />
            <Input ref={tagsRef} defaultValue={(editing?.tags || []).join(", ")} placeholder="Tags (comma-separated)" />
            <div>
              <label className="text-xs text-muted-foreground">Status</label>
              <Select defaultValue={(editing?.status || "draft") as BookStatus} onValueChange={(v) => setStatusDraft(v as BookStatus)}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={() => {
              if (!editing) return;
              const title = (titleRef.current?.value || editing.title).toString();
              const description = (descRef.current?.value || editing.description).toString();
              const cover = (coverRef.current?.value || editing.cover || "").toString() || null;
              const genre = (genreRef.current?.value || editing.genre || "").toString() || null;
              const tags = (tagsRef.current?.value || (editing.tags || []).join(",")).split(",").map((t) => t.trim()).filter(Boolean);
              const status = statusDraft || editing.status || "draft";
              const completed = editing.completed ?? (status === "published");
              setBooks((prev) => updateBook(prev, editing.id, { title, description, cover, genre, tags, status, completed }));
              setEditing(null);
            }}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteId} onOpenChange={(v) => { if (!v) setDeleteId(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete book</DialogTitle>
            <DialogDescription>This action cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => { if (!deleteId) return; setBooks((prev) => deleteBook(prev, deleteId)); setDeleteId(null); }}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
