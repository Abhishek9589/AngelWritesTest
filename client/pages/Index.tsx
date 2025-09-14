import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Card, CardContent } from "@/components/ui/card";
import {
  Poem,
  allTags,
  createPoem,
  deletePoem,
  filterByTags,
  formatDate,
  loadPoems,
  normalizeTags,
  preview,
  savePoems,
  searchPoems,
  sortPoems,
  SortOption,
  updatePoem,
} from "@/lib/poems";
import { format, parse, isValid } from "date-fns";
import { ArrowDownAZ, ArrowUpAZ, ArrowDownWideNarrow, ArrowUpWideNarrow, Filter, MoreHorizontal, Plus, Search, Star, StarOff, Upload } from "lucide-react";
import * as mammoth from "mammoth";
import { toast } from "sonner";

export default function Index() {
  const [poems, setPoems] = useState<Poem[]>(() => loadPoems());
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortOption>("newest");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const pageSize = 9;

  useEffect(() => {
    savePoems(poems);
  }, [poems]);

  const tags = useMemo(() => allTags(poems), [poems]);

  const filtered = useMemo(() => {
    const base = sortPoems(filterByTags(searchPoems(poems, query), selectedTags), sort);
    return base;
  }, [poems, query, selectedTags, sort]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * pageSize;
  const paginated = filtered.slice(start, start + pageSize);

  const [openForm, setOpenForm] = useState(false);
  const [editing, setEditing] = useState<Poem | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [writeOpen, setWriteOpen] = useState(false);
  const [writingPoem, setWritingPoem] = useState<Poem | null>(null);
  const [writingContent, setWritingContent] = useState("");
  const formRef = useRef<HTMLFormElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const dateRef = useRef<HTMLInputElement>(null);
  const tagsRef = useRef<HTMLInputElement>(null);
  const draftRef = useRef<HTMLInputElement>(null);

  const applyCreateOrEdit = (title: string, date: string, tags: string[], draft: boolean) => {
    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }
    if (editing) {
      setPoems((prev) => updatePoem(prev, editing.id, { title: title.trim(), date, tags, draft }));
      toast.success("Poem updated");
    } else {
      const poem = createPoem({ title: title.trim(), content: "", date, tags, draft });
      setPoems((prev) => [poem, ...prev]);
      setWritingPoem(poem);
      setWritingContent("");
      setWriteOpen(true);
      toast.success("Poem created");
    }
    setOpenForm(false);
    setEditing(null);
  };

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const title = String(fd.get("title") || "");
    const date = String(fd.get("date") || format(new Date(), "yyyy-MM-dd"));
    const tags = normalizeTags(String(fd.get("tags") || "")
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean));
    const draft = fd.get("draft") === "on";

    applyCreateOrEdit(title, date, tags, draft);
    e.currentTarget.reset();
  };

  const toggleFavorite = (p: Poem) => {
    setPoems((prev) => updatePoem(prev, p.id, { favorite: !p.favorite }));
  };

  const handleDelete = (id: string) => {
    setDeleteId(id);
  };
  const confirmDelete = () => {
    if (!deleteId) return;
    setPoems((prev) => deletePoem(prev, deleteId));
    setDeleteId(null);
  };


  const importRef = useRef<HTMLInputElement>(null);
  const onImportFiles = async (files: FileList) => {
    const arr = Array.from(files);
    let jsonCount = 0;
    const created: Poem[] = [];
    const importedMap = new Map<string, Poem>();
    for (const file of arr) {
      const isJSON = file.type === "application/json" || /\.json$/i.test(file.name);
      const isDOCX = /\.docx$/i.test(file.name);
      if (isJSON) {
        try {
          const text = await file.text();
          const obj = JSON.parse(text);
          const imported: Poem[] = Array.isArray(obj) ? obj : Array.isArray(obj.poems) ? obj.poems : [];
          imported.forEach((p) => importedMap.set(p.id, p));
          jsonCount += imported.length;
        } catch {
          toast.error(`Failed to import JSON file: ${file.name}`);
        }
      } else if (isDOCX) {
        try {
          const arrayBuffer = await file.arrayBuffer();
          const result = await mammoth.extractRawText({ arrayBuffer });
          const title = file.name.replace(/\.docx$/i, "");
          const poem = createPoem({
            title,
            content: (result.value || "").trim(),
            date: format(new Date(), "yyyy-MM-dd"),
            tags: [],
          });
          created.push(poem);
        } catch {
          toast.error(`Failed to import DOCX file: ${file.name}`);
        }
      }
    }
    if (jsonCount === 0 && created.length === 0) {
      toast.error("No supported files imported. Please select .json or .docx files.");
      return;
    }
    setPoems((prev) => {
      const map = new Map<string, Poem>(prev.map((p) => [p.id, p]));
      importedMap.forEach((p) => map.set(p.id, p));
      const next = Array.from(map.values());
      const combined = created.length ? [...created, ...next] : next;
      return sortPoems(combined, sort);
    });
    const parts: string[] = [];
    if (jsonCount) parts.push(`JSON: ${jsonCount}`);
    if (created.length) parts.push(`DOCX: ${created.length}`);
    toast.success(`Imported ${parts.join(" and ")}`);
  };

  return (
    <main className="container py-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-1 items-center gap-2">
            <div className="relative w-full md:w-96">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by title, tag, or content"
                className="pl-9 border-2 border-primary focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(1);
                }}
              />
            </div>
            <Select value={sort} onValueChange={(v) => { setSort(v as SortOption); setPage(1); }}>
              <SelectTrigger className="w-48 border-2 border-primary focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0">
                <SelectValue placeholder="Sort" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest"><div className="flex items-center gap-2"><ArrowDownWideNarrow className="h-4 w-4" /> Newest</div></SelectItem>
                <SelectItem value="oldest"><div className="flex items-center gap-2"><ArrowUpWideNarrow className="h-4 w-4" /> Oldest</div></SelectItem>
                <SelectItem value="alpha"><div className="flex items-center gap-2"><ArrowDownAZ className="h-4 w-4" /> A–Z</div></SelectItem>
                <SelectItem value="ztoa"><div className="flex items-center gap-2"><ArrowUpAZ className="h-4 w-4" /> Z–A</div></SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <input ref={importRef} type="file" accept=".docx,application/json" multiple className="hidden" onChange={(e) => {
              const fs = e.target.files;
              if (fs && fs.length) onImportFiles(fs);
              e.currentTarget.value = "";
            }} />
            <Dialog open={openForm} onOpenChange={(v) => { setOpenForm(v); if (!v) setEditing(null); }}>
              <DialogTrigger asChild>
                <Button className="gap-2"><Plus className="h-4 w-4" /> New Poem</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editing ? "Edit poem" : "Add a new poem"}</DialogTitle>
                  <DialogDescription>Provide title, date, tags (comma separated), and draft. After creating, a full-screen editor opens to write the poem.</DialogDescription>
                </DialogHeader>
                <form ref={formRef} className="grid gap-3" onSubmit={onSubmit}>
                  <Input ref={titleRef} name="title" placeholder="Title" defaultValue={editing?.title} required className="border-2 border-primary focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0" />
                  <div className="flex gap-3">
                    <Input ref={dateRef} name="date" type="date" className="w-40 border-2 border-primary focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0" defaultValue={editing?.date || format(new Date(), "yyyy-MM-dd")} />
                    <Input ref={tagsRef} name="tags" placeholder="Tags (comma separated)" defaultValue={editing?.tags.join(", ") || ""} className="border-2 border-primary focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0" />
                  </div>
                  <label className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                    <input
                      ref={draftRef}
                      type="checkbox"
                      name="draft"
                      defaultChecked={!!editing?.draft}
                      className="h-5 w-5 rounded-md border-2 border-primary bg-background text-primary accent-primary transition-colors hover:bg-primary/10 focus:outline-none focus:ring-0 focus:ring-offset-0"
                    />
                    Draft
                  </label>
                  <button type="submit" className="hidden" aria-hidden="true" />
                  <DialogFooter>
                    <div className="flex-1" />
                    <Button type="button" variant="outline" onClick={() => importRef.current?.click()} className="gap-2"><Upload className="h-4 w-4" /> Import</Button>
                    <Button
                      type="button"
                      onClick={() => {
                        const title = titleRef.current?.value ?? "";
                        const draft = !!draftRef.current?.checked;
                        const tags = normalizeTags(String(tagsRef.current?.value ?? "")
                          .split(",")
                          .map((t) => t.trim())
                          .filter(Boolean));
                        // Convert dd/MM/yyyy (visible) to ISO yyyy-MM-dd
                        const txt = dateRef.current?.value ?? "";
                        let date = format(new Date(), "yyyy-MM-dd");
                        const m = txt.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
                        if (m) {
                          const d = parse(`${m[1].padStart(2, "0")}/${m[2].padStart(2, "0")}/${m[3]}`, "dd/MM/yyyy", new Date());
                          if (isValid(d)) date = format(d, "yyyy-MM-dd");
                        }
                        applyCreateOrEdit(title, date, tags, draft);
                        // reset fields after create/edit
                        formRef.current?.reset();
                      }}
                    >
                      {editing ? "Save Changes" : "Create Poem"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {tags.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground"><Filter className="h-4 w-4" /> Filter:</div>
            {tags.map((t) => {
              const active = selectedTags.includes(t);
              return (
                <button
                  key={t}
                  onClick={() => { setSelectedTags((prev) => prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]); setPage(1); }}
                  className={`rounded-full border px-3 py-1 text-xs transition ${active ? "bg-primary text-primary-foreground border-transparent" : "hover:bg-accent"}`}
                >
                  #{t}
                </button>
              );
            })}
            {selectedTags.length > 0 && (
              <button className="text-xs underline ml-2 text-muted-foreground" onClick={() => setSelectedTags([])}>Clear</button>
            )}
          </div>
        )}

        {poems.length === 0 && (
          <IntroEmpty onCreate={() => setOpenForm(true)} onImport={() => importRef.current?.click()} />
        )}

        <section className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {paginated.map((p) => (
            <Card key={p.id} className="group relative overflow-hidden">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold tracking-tight line-clamp-1">{p.title}</h3>
                    <p className="mt-1 text-xs text-muted-foreground">{formatDate(p.date)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      className={`rounded-full p-2 transition ${p.favorite ? "text-yellow-500" : "text-muted-foreground hover:text-foreground"}`}
                      onClick={() => toggleFavorite(p)}
                      aria-label={p.favorite ? "Unfavorite" : "Favorite"}
                    >
                      {p.favorite ? <Star className="h-4 w-4 fill-yellow-500" /> : <StarOff className="h-4 w-4" />}
                    </button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="icon" variant="ghost" aria-label="Actions"><MoreHorizontal className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => { setEditing(p); setOpenForm(true); }}>Edit</DropdownMenuItem>
                        <DropdownMenuItem asChild><Link to={`/poem/${p.id}`}>Open</Link></DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(p.id)}>Delete</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
                <p className="mt-3 text-sm text-muted-foreground line-clamp-3">{preview(p.content, 220)}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {p.tags.map((t) => (
                    <Badge key={t} variant="secondary">{t}</Badge>
                  ))}
                </div>
                <div className="mt-4">
                  <Link to={`/poem/${p.id}`}><Button variant="outline" size="sm">Read</Button></Link>
                </div>
              </CardContent>
              {p.draft && (
                <div className="absolute right-2 top-2 rounded-md bg-yellow-100 text-yellow-900 text-[10px] px-2 py-0.5 dark:bg-yellow-900 dark:text-yellow-100">Draft</div>
              )}
            </Card>
          ))}
        </section>



        <Dialog open={!!deleteId} onOpenChange={(v) => { if (!v) setDeleteId(null); }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete poem</DialogTitle>
              <DialogDescription>Are you sure you want to delete this poem? This action cannot be undone.</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
              <Button variant="destructive" onClick={confirmDelete}>Delete</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {writeOpen && writingPoem && (
          <div className="fixed inset-0 z-[60] bg-background/95 backdrop-blur">
            <div className="container mx-auto flex h-full flex-col">
              <div className="flex items-center justify-between py-4">
                <h2 className="text-lg font-semibold">Write: {writingPoem.title}</h2>
                <div className="flex items-center gap-2">
                  <Button variant="outline" onClick={() => { setWriteOpen(false); setWritingPoem(null); setWritingContent(""); }}>Close</Button>
                  <Button onClick={() => { if (writingPoem) { setPoems((prev) => updatePoem(prev, writingPoem.id, { content: writingContent })); } setWriteOpen(false); setWritingPoem(null); setWritingContent(""); }}>Save</Button>
                </div>
              </div>
              <div className="flex-1 pb-[3px]">
                <Textarea className="h-full resize-none border-2 border-primary focus:outline-none focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0" value={writingContent} onChange={(e) => setWritingContent(e.target.value)} placeholder="Start writing your poem..." />
              </div>
            </div>
          </div>
        )}

        {totalPages > 1 && (
          <div className="fixed bottom-4 right-4 z-40">
            <div className="flex items-center gap-2 rounded-md border bg-background/95 px-3 py-2 shadow-lg">
              <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1}>Previous</Button>
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <label htmlFor="pageInput" className="sr-only">Page</label>
                <input
                  id="pageInput"
                  type="number"
                  min={1}
                  max={totalPages}
                  value={currentPage}
                  onChange={(e) => {
                    const n = Number(e.target.value);
                    if (!Number.isNaN(n)) setPage(Math.min(Math.max(1, n), totalPages));
                  }}
                  onBlur={(e) => {
                    const n = Number(e.target.value);
                    if (!Number.isNaN(n)) setPage(Math.min(Math.max(1, n), totalPages));
                  }}
                  className="w-14 rounded border bg-background px-2 py-1 text-center text-sm"
                />
                <span>/ {totalPages}</span>
              </div>
              <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>Next</Button>
            </div>
          </div>
        )}

    </main>
  );
}

function IntroEmpty({ onCreate, onImport }: { onCreate: () => void; onImport: () => void }) {
  return (
    <div className="mt-10 rounded-xl border bg-card p-6 text-card-foreground">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-xl font-semibold">Welcome to AngelWrites</h2>
          <p className="mt-1 text-sm text-muted-foreground max-w-2xl">
            Create, organize, and cherish your poems. Add titles, dates, tags, mark favorites, search and sort your collection, and export to PDF or DOCX. Edit anytime in a focused full-screen editor.
          </p>
          <ul className="mt-3 list-disc pl-5 text-sm text-muted-foreground space-y-1">
            <li>Create poems with title, date, tags, and draft status</li>
            <li>Search by title, content, or tag and sort by date or A–Z</li>
            <li>Favorite special pieces and filter by tags</li>
            <li>Import from DOCX/JSON and export individual poems</li>
          </ul>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={onImport} className="gap-2"><Upload className="h-4 w-4" /> Import</Button>
          <Button onClick={onCreate} className="gap-2"><Plus className="h-4 w-4" /> New Poem</Button>
        </div>
      </div>
    </div>
  );
}
