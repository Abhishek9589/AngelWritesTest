import * as React from "react";
import { Calendar as CalendarIcon } from "lucide-react";
import { format, parse, parseISO, isValid } from "date-fns";

import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";

function isoToDMY(iso?: string | null): string {
  if (!iso) return "";
  const d = parseISO(iso);
  if (!isValid(d)) return "";
  return format(d, "dd/MM/yyyy");
}
function dmyToISO(dmy: string): string | null {
  const trimmed = String(dmy ?? "").trim();
  const m = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  const day = Number(m[1]);
  const month = Number(m[2]);
  const year = Number(m[3]);
  const d = parse(`${String(day).padStart(2, "0")}/${String(month).padStart(2, "0")}/${year}`, "dd/MM/yyyy", new Date());
  if (!isValid(d)) return null;
  return format(d, "yyyy-MM-dd");
}

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, name, defaultValue, value, onChange, ...props }, forwardedRef) => {
    if (type === "date") {
      const [open, setOpen] = React.useState(false);

      // Derive display text from controlled/uncontrolled inputs
      const derivedText = React.useMemo(() => {
        if (typeof value === "string") {
          if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return isoToDMY(value);
          return value; // assume already dd/MM/yyyy
        }
        if (typeof defaultValue === "string") {
          if (/^\d{4}-\d{2}-\d{2}$/.test(defaultValue)) return isoToDMY(defaultValue);
          return defaultValue;
        }
        return "";
      }, [value, defaultValue]);

      const [text, setText] = React.useState<string>(derivedText);
      React.useEffect(() => {
        // keep local text in sync when parent value changes (controlled)
        if (value !== undefined) setText(derivedText);
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, [value, derivedText]);

      const iso = React.useMemo(() => dmyToISO(text) ?? null, [text]);

      const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const raw = e.target.value.replace(/[^0-9/]/g, "");
        let next = raw;
        // auto insert '/'
        if (/^\d{3}$/.test(raw)) next = raw.slice(0, 2) + "/" + raw.slice(2);
        if (/^\d{5}$/.test(next)) next = next.slice(0, 5) + "/" + next.slice(5);
        setText(next);
        // propagate to parent with dd/MM/yyyy in target.value
        onChange?.({ ...e, target: { ...e.target, value: next } } as React.ChangeEvent<HTMLInputElement>);
      };

      const setFromDate = (d: Date) => {
        const txt = format(d, "dd/MM/yyyy");
        setText(txt);
        setOpen(false);
      };

      return (
        <div className="relative">
          {/* Hidden ISO field for form submissions */}
          <input type="hidden" name={name} value={iso ?? ""} onChange={() => {}} />

          {/* Visible dd/MM/yyyy input */}
          <input
            type="text"
            name={undefined}
            placeholder="DD/MM/YYYY"
            value={text}
            onChange={handleTextChange}
            className={cn(
              "flex h-10 w-full rounded-md border border-input bg-background px-3 pr-10 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
              className,
            )}
            ref={forwardedRef}
            {...props}
          />

          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                aria-label="Open calendar"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground dark:text-white hover:opacity-90"
                tabIndex={-1}
                onClick={() => setOpen((v) => !v)}
              >
                <CalendarIcon className="h-4 w-4" />
              </button>
            </PopoverTrigger>
            <PopoverContent align="end" className="p-2 w-auto">
              <Calendar
                mode="single"
                selected={iso ? parseISO(iso) : undefined}
                onSelect={(d) => { if (d) setFromDate(d); }}
                fromYear={1900}
                toYear={2100}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
      );
    }

    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm [color-scheme:light] dark:[color-scheme:dark]",
          className,
        )}
        ref={forwardedRef}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
