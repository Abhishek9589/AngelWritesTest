import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Book, createBook, deleteBook, duplicateBook, exportBookToDOCX, exportBooksJSON, getLastOpenedBookId, loadBooks, saveBooks, setLastOpenedBookId, updateBook } from "@/lib/books";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { Image, MoreHorizontal, NotebookPen, Plus, Trash2, Copy, FileDown, FileJson } from "lucide-react";

export default function BookLibrary() {
  const navigate = useNavigate();
  const [books, setBooks] = useState<Book[]>(() => loadBooks());
  const [editing, setEditing] = useState<Book | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const descRef = useRef<HTMLInputElement>(null);

  useEffect(() => { saveBooks(books); }, [books]);

  const onCreate = () => {
    const b = createBook({ title: "Untitled Book" });
    setBooks((prev) => [b, ...prev]);
    setLastOpenedBookId(b.id);
    navigate("/book/quill");
  };

  const lastId = getLastOpenedBookId();

  const cards = useMemo(() => books, [books]);

  return (
    <main className="container py-10 animate-in fade-in-0 slide-in-from-bottom-2 duration-700">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Library</h1>
        <Button className="gap-2" onClick={onCreate}><Plus className="h-4 w-4" /> New Book</Button>
      </div>

      {cards.length === 0 ? (
        <div className="text-center text-sm text-muted-foreground">No books yet. Click "New Book" to get started.</div>
      ) : (
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {cards.map((b) => (
            <Card key={b.id} className="group relative overflow-hidden">
              <CardContent className="p-4">
                <div className="flex items-start gap-3 justify-between">
                  <div className="flex items-start gap-3">
                    <img src={b.cover || "/placeholder.svg"} alt="Cover" className="h-16 w-12 object-cover rounded-md border" />
                    <div>
                      <div className="text-base font-semibold leading-tight line-clamp-1">{b.title}</div>
                      <div className="text-[11px] text-muted-foreground">Last edited {formatDistanceToNow(new Date(b.lastEdited), { addSuffix: true })}</div>
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
                <div className="mt-4"><Button variant="outline" size="sm" onClick={() => { setLastOpenedBookId(b.id); navigate("/book/quill"); }}>Write</Button></div>
              </CardContent>
            </Card>
          ))}
        </section>
      )}

      <Dialog open={!!editing} onOpenChange={(v) => { if (!v) setEditing(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Metadata</DialogTitle>
            <DialogDescription>Update the book title, description, or cover URL.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <Input ref={titleRef} defaultValue={editing?.title || ""} placeholder="Title" />
            <Input ref={descRef} defaultValue={editing?.description || ""} placeholder="Short description" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={() => {
              if (!editing) return;
              const title = (titleRef.current?.value || editing.title).toString();
              const description = (descRef.current?.value || editing.description).toString();
              setBooks((prev) => updateBook(prev, editing.id, { title, description }));
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
