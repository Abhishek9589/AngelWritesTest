import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "react-router-dom";

function getSystemPref(): "light" | "dark" {
  if (typeof window === "undefined") return "light";
  return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

export const POEM_PRESETS = [
  { key: "pastel", label: "Pastel Airy", swatch: ["#a2d2ff", "#cdb4db", "#b9fbc0"] },
  { key: "sunset", label: "Sunset Glow", swatch: ["#ffd6a5", "#ffb5a7", "#ff8a5b"] },
  { key: "ocean", label: "Ocean Breeze", swatch: ["#dbeafe", "#bbf7d0", "#22d3ee"] },
  { key: "aurora", label: "Aurora Nights", swatch: ["#ede9fe", "#a78bfa", "#22d3ee"] },
  { key: "strawberry", label: "Strawberry Milk", swatch: ["#ffe5ec", "#ffcad4", "#ff6b8a"] },
] as const;

export const BOOK_PRESETS = [
  { key: "minimal-zen", label: "Minimal Zen", swatch: ["#f7f7f5", "#dfe7e1", "#7fbf8e"] },
  { key: "forest-haven", label: "Forest Haven", swatch: ["#e6f0e8", "#9bbf98", "#7a5d3b"] },
  { key: "desert-dusk", label: "Desert Dusk", swatch: ["#f2e9dc", "#d8a48f", "#b5653e"] },
  { key: "midnight-quartz", label: "Midnight Quartz", swatch: ["#e6e7ec", "#a78bfa", "#64748b"] },
  { key: "aurora-flow", label: "Aurora Flow", swatch: ["#dbeafe", "#f5d0fe", "#fbcfe8"] },
] as const;

export const PRESETS = [...POEM_PRESETS, ...BOOK_PRESETS] as const;

export type PresetKey = typeof PRESETS[number]["key"];

function getContext(pathname: string): "poem" | "book" {
  return pathname.startsWith("/book") ? "book" : "poem";
}

function getStoredPreset(mode: "light" | "dark", context: "poem" | "book"): PresetKey {
  const key = `${mode === "dark" ? "themePresetDark" : "themePresetLight"}_${context}`;
  const stored = localStorage.getItem(key) as PresetKey | null;
  if (stored) return stored;
  return context === "book" ? ("minimal-zen" as PresetKey) : ("pastel" as PresetKey);
}

export function ThemeToggle() {
  const location = useLocation();
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    const stored = localStorage.getItem("theme");
    return (stored as "light" | "dark") || getSystemPref();
  });

  // Migrate legacy keys to context-aware storage
  useEffect(() => {
    const legacySingle = localStorage.getItem("themePreset") as PresetKey | null;
    const legacyLight = localStorage.getItem("themePresetLight") as PresetKey | null;
    const legacyDark = localStorage.getItem("themePresetDark") as PresetKey | null;
    if (legacySingle) {
      ["poem", "book"].forEach((ctx) => {
        if (!localStorage.getItem(`themePresetLight_${ctx}`)) localStorage.setItem(`themePresetLight_${ctx}`, legacySingle);
        if (!localStorage.getItem(`themePresetDark_${ctx}`)) localStorage.setItem(`themePresetDark_${ctx}`, legacySingle);
      });
      localStorage.removeItem("themePreset");
    }
    if (legacyLight || legacyDark) {
      ["poem", "book"].forEach((ctx) => {
        if (legacyLight && !localStorage.getItem(`themePresetLight_${ctx}`)) localStorage.setItem(`themePresetLight_${ctx}`, legacyLight);
        if (legacyDark && !localStorage.getItem(`themePresetDark_${ctx}`)) localStorage.setItem(`themePresetDark_${ctx}`, legacyDark);
      });
      localStorage.removeItem("themePresetLight");
      localStorage.removeItem("themePresetDark");
    }
  }, []);

  // Apply dark class and the context-aware preset for the active mode
  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") root.classList.add("dark");
    else root.classList.remove("dark");
    localStorage.setItem("theme", theme);
    const ctx = getContext(location.pathname);
    root.dataset.theme = getStoredPreset(theme, ctx);
  }, [theme, location.pathname]);

  // Initial apply on mount
  useEffect(() => {
    const mode = (localStorage.getItem("theme") as "light" | "dark") || getSystemPref();
    const ctx = getContext(location.pathname);
    document.documentElement.dataset.theme = getStoredPreset(mode, ctx);
  }, [location.pathname]);

  const toggle = () => setTheme((t) => (t === "dark" ? "light" : "dark"));

  return (
    <div className="flex items-center gap-1">
      <Button
        variant="ghost"
        size="icon"
        aria-label="Toggle light/dark"
        onClick={toggle}
        className="transition-colors hover:bg-primary/15 hover:text-primary"
      >
        {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      </Button>
    </div>
  );
}
