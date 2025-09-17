import { useRef, useState } from "react";
import { Book, exportBookToDOCX, exportBooksJSON, importBooksFromJSON, loadBooks, saveBooks } from "@/lib/books";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function BookManage() {
  const [books, setBooks] = useState<Book[]>(() => loadBooks());
  const [selectedId, setSelectedId] = useState<string | "">(books[0]?.id || "");
  const fileRef = useRef<HTMLInputElement>(null);

  const selected = books.find((b) => b.id === selectedId) || null;

  return (
    <main className="container py-10 animate-in fade-in-0 slide-in-from-bottom-2 duration-700">
      <h1 className="text-2xl font-bold mb-4">Manage</h1>

      <div className="grid gap-4 md:grid-cols-2">
        <section className="rounded-2xl border p-4 glass-soft">
          <h2 className="text-lg font-semibold">Export</h2>
          <p className="text-sm text-muted-foreground">Export a selected book to DOCX or backup all as JSON.</p>
          <div className="mt-3 flex items-center gap-2">
            <Select value={selectedId} onValueChange={(v) => setSelectedId(v)}>
              <SelectTrigger className="w-64"><SelectValue placeholder="Select a book" /></SelectTrigger>
              <SelectContent>
                {books.map((b) => (<SelectItem key={b.id} value={b.id}>{b.title}</SelectItem>))}
              </SelectContent>
            </Select>
            <Button onClick={() => { if (selected) exportBookToDOCX(selected, `${selected.title}.docx`); }} disabled={!selected}>Export DOCX</Button>
            <Button variant="outline" onClick={() => exportBooksJSON(books)}>Backup JSON</Button>
          </div>
        </section>

        <section className="rounded-2xl border p-4 glass-soft">
          <h2 className="text-lg font-semibold">Restore</h2>
          <p className="text-sm text-muted-foreground">Import books from a JSON backup.</p>
          <div className="mt-3 flex items-center gap-2">
            <Input ref={fileRef} type="file" accept="application/json,.json" className="w-64" onChange={async (e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              const text = await f.text();
              const next = importBooksFromJSON(books, text);
              setBooks(next);
              saveBooks(next);
              e.currentTarget.value = "";
            }} />
          </div>
        </section>
      </div>
    </main>
  );
}
