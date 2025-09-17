import { useEffect, useMemo, useState } from "react";
import { PRESETS, PresetKey, ThemeToggle, BOOK_PRESETS, POEM_PRESETS } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useLocation } from "react-router-dom";

function getMode(): "light" | "dark" {
  const root = document.documentElement;
  return root.classList.contains("dark") ? "dark" : "light";
}

function getStoredPreset(mode: "light" | "dark", ctx: "poem" | "book"): PresetKey {
  const key = `${mode === "dark" ? "themePresetDark" : "themePresetLight"}_${ctx}`;
  const stored = localStorage.getItem(key) as PresetKey | null;
  if (stored) return stored;
  return ctx === "book" ? ("minimal-zen" as PresetKey) : ("pastel" as PresetKey);
}

function applyPresetFor(mode: "light" | "dark", ctx: "poem" | "book", preset: PresetKey) {
  const storageKey = `${mode === "dark" ? "themePresetDark" : "themePresetLight"}_${ctx}`;
  localStorage.setItem(storageKey, preset);
  const currentCtx = document.location.pathname.startsWith("/book") ? "book" : "poem";
  if (getMode() === mode && currentCtx === ctx) {
    document.documentElement.dataset.theme = preset;
  }
}

export default function Themes() {
  const location = useLocation();
  const currentCtx: "poem" | "book" = location.pathname.startsWith("/book") ? "book" : "poem";
  const [mode, setMode] = useState<"light" | "dark">(() => getMode());
  const [activePoem, setActivePoem] = useState<PresetKey>(() => getStoredPreset(getMode(), "poem"));
  const [activeBook, setActiveBook] = useState<PresetKey>(() => getStoredPreset(getMode(), "book"));

  // React to Light/Dark toggles and keep both contexts in sync
  useEffect(() => {
    const root = document.documentElement;
    const update = () => {
      const nextMode = root.classList.contains("dark") ? "dark" : "light";
      setMode(nextMode);
      const poemPreset = getStoredPreset(nextMode, "poem");
      const bookPreset = getStoredPreset(nextMode, "book");
      setActivePoem(poemPreset);
      setActiveBook(bookPreset);
      root.dataset.theme = currentCtx === "book" ? bookPreset : poemPreset;
    };

    const observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        if (m.type === "attributes" && m.attributeName === "class") update();
      }
    });
    observer.observe(root, { attributes: true });
    update();
    return () => observer.disconnect();
  }, [currentCtx]);

  // Apply the correct preset when switching between Poem/Book routes
  useEffect(() => {
    const preset = currentCtx === "book" ? activeBook : activePoem;
    document.documentElement.dataset.theme = preset;
  }, [currentCtx, activeBook, activePoem]);

  const poemItems = useMemo(() => POEM_PRESETS, []);
  const bookItems = useMemo(() => BOOK_PRESETS, []);

  const applyPreview = (key: PresetKey | null, ctx: "poem" | "book") => {
    if (ctx !== currentCtx) return; // preview only for current context
    if (!key) document.documentElement.dataset.theme = currentCtx === "book" ? activeBook : activePoem;
    else document.documentElement.dataset.theme = key;
  };

  const sections: Array<{ header: string; ctx: "poem" | "book"; items: typeof POEM_PRESETS | typeof BOOK_PRESETS }> =
    currentCtx === "book"
      ? [
          { header: "Book Mode Themes", ctx: "book", items: bookItems },
          { header: "Poem Mode Themes", ctx: "poem", items: poemItems },
        ]
      : [
          { header: "Poem Mode Themes", ctx: "poem", items: poemItems },
          { header: "Book Mode Themes", ctx: "book", items: bookItems },
        ];

  return (
    <main className="container py-10 animate-in fade-in-0 slide-in-from-bottom-2 duration-700">
      <section className="relative overflow-hidden rounded-3xl p-6 md:p-8 glass mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Themes</h1>
          <p className="mt-2 text-sm text-muted-foreground">Themes are saved separately for Poem and Book, and separately for Light/Dark. Toggle mode to set each.</p>
        </div>
        <ThemeToggle />
      </section>

      {sections.map(({ header, ctx, items }) => (
        <div key={header} className="mb-8">
          <h2 className="text-xl font-semibold mb-3">{header}</h2>
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map((p) => (
              <Card
                key={p.key}
                className={cn(
                  "overflow-hidden group bg-transparent",
                  (ctx === "book" ? activeBook : activePoem) === p.key && "ring-2 ring-ring"
                )}
                style={{ background: `linear-gradient(135deg, ${p.swatch[0]}, ${p.swatch[1]}, ${p.swatch[2]})` }}
                onMouseEnter={() => applyPreview(p.key as PresetKey, ctx)}
                onMouseLeave={() => applyPreview(null, ctx)}
              >
                <CardContent className="p-0">
                  <div className="p-4 flex items-start justify-between">
                    <div>
                      <h3 className="text-lg font-semibold tracking-tight text-neutral-900 dark:text-neutral-900">{p.label}</h3>
                      <div className="mt-2 flex items-center gap-1">
                        {p.swatch.map((c, i) => (
                          <span key={i} className="h-4 w-6 rounded-md border border-black/10 dark:border-white/10" style={{ background: c }} />
                        ))}
                      </div>
                    </div>
                    {(ctx === "book" ? activeBook : activePoem) === p.key ? <Badge variant="secondary">Active</Badge> : null}
                  </div>

                  <div className="p-4 flex items-center justify-end gap-2">
                    <Button
                      variant={(ctx === "book" ? activeBook : activePoem) === p.key ? "default" : "outline"}
                      onClick={() => {
                        applyPresetFor(mode, ctx, p.key as PresetKey);
                        if (ctx === "book") setActiveBook(p.key as PresetKey);
                        else setActivePoem(p.key as PresetKey);
                      }}
                    >
                      Use Theme
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </section>
        </div>
      ))}
    </main>
  );
}
