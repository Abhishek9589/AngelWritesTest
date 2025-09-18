import * as React from "react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LogIn, PenLine } from "lucide-react";
import { toast } from "sonner";

function SignInForm() {
  const [loading, setLoading] = React.useState(false);
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const payload = {
      identifier: String(fd.get("identifier") || "").trim(),
      password: String(fd.get("password") || ""),
    };
    if (!payload.identifier || !payload.password) return;
    setLoading(true);
    try {
      const r = await fetch("/api/auth/signin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await r.json();
      if (!r.ok || !data.ok) throw new Error(data?.message || "Sign in failed");
      toast.success("Signed in");
    } catch (err) {
      toast.error(String((err as any)?.message || err));
    } finally {
      setLoading(false);
    }
  }
  return (
    <form className="space-y-4" onSubmit={onSubmit}>
      <div className="space-y-2">
        <Label htmlFor="signin-identifier">Email or Username</Label>
        <Input id="signin-identifier" name="identifier" type="text" autoComplete="username" placeholder="you@domain.com or your handle" />
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="signin-password">Password</Label>
          <Button type="button" variant="link" className="px-0 text-xs text-foreground/70 hover:text-foreground">Forgot password?</Button>
        </div>
        <Input id="signin-password" name="password" type="password" autoComplete="current-password" placeholder="••••••••" />
      </div>
      <Button type="submit" className="w-full" disabled={loading}>{loading ? "Signing in…" : "Continue"}</Button>
    </form>
  );
}

function SignUpForm() {
  const [loading, setLoading] = React.useState(false);
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const payload = {
      username: String(fd.get("username") || "").trim(),
      email: String(fd.get("email") || "").trim(),
      password: String(fd.get("password") || ""),
    };
    if (!payload.username || !payload.email || !payload.password) return;
    setLoading(true);
    try {
      const r = await fetch("/api/auth/signup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await r.json();
      if (!r.ok || !data.ok) throw new Error(data?.message || "Sign up failed");
      toast.success("Account created");
    } catch (err) {
      toast.error(String((err as any)?.message || err));
    } finally {
      setLoading(false);
    }
  }
  return (
    <form className="space-y-4" onSubmit={onSubmit}>
      <div className="space-y-2">
        <Label htmlFor="signup-username">Pen Name</Label>
        <Input id="signup-username" name="username" type="text" autoComplete="username" placeholder="your-pen-name" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="signup-email">Email</Label>
        <Input id="signup-email" name="email" type="email" autoComplete="email" placeholder="you@domain.com" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="signup-password">Password</Label>
        <Input id="signup-password" name="password" type="password" autoComplete="new-password" placeholder="Create a strong password" />
      </div>
      <Button type="submit" className="w-full" disabled={loading}>{loading ? "Creating…" : "Create account"}</Button>
    </form>
  );
}

export default function JoinUs() {
  const [mode, setMode] = React.useState<"signin" | "signup">("signin");

  return (
    <main className="container py-10 animate-in fade-in-0 slide-in-from-bottom-2 duration-700">
      <div className="mx-auto max-w-5xl grid gap-6 md:grid-cols-2 items-center min-h-[50vh]">
        <section className="rounded-3xl p-8 md:p-10 glass-soft">
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight gradient-text">Join Us</h1>
          <p className="mt-2 max-w-xl text-sm md:text-base text-muted-foreground">Become part of our community. Get early features, share feedback, and help shape the future of AngelWrites.</p>

          <div className="mt-6">
            <ToggleGroup
              className="inline-flex rounded-full glass p-1 gap-1 ring-1 ring-white/25 dark:ring-white/10"
              type="single"
              value={mode}
              onValueChange={(v) => v && setMode(v as typeof mode)}
              size="sm"
              aria-label="Choose how you want to proceed"
            >
              <ToggleGroupItem
                value="signin"
                aria-label="Continue Writing"
                className="rounded-full h-9 px-4 md:h-10 md:px-5 font-medium text-foreground/90 hover:bg-white/40 dark:hover:bg-white/10 hover:text-foreground border border-transparent data-[state=on]:shadow-md data-[state=on]:ring-1 data-[state=on]:ring-white/30"
              >
                <LogIn className="mr-2 h-4 w-4" /> Continue Writing
              </ToggleGroupItem>
              <ToggleGroupItem
                value="signup"
                aria-label="Start Writing"
                className="rounded-full h-9 px-4 md:h-10 md:px-5 font-medium text-foreground/90 hover:bg-white/40 dark:hover:bg-white/10 hover:text-foreground border border-transparent data-[state=on]:shadow-md data-[state=on]:ring-1 data-[state=on]:ring-white/30"
              >
                <PenLine className="mr-2 h-4 w-4" /> Start Writing
              </ToggleGroupItem>
            </ToggleGroup>

            <p className="mt-3 text-xs text-muted-foreground">
              {mode === "signin" ? "Returning author? Pick up where you left off." : "New to AngelWrites? Create your space and begin."}
            </p>
          </div>
        </section>

        <div className="w-full max-w-md mx-auto md:ml-auto rounded-3xl glass p-6 md:p-8">
          {mode === "signin" ? <SignInForm /> : <SignUpForm />}
        </div>
      </div>
    </main>
  );
}
