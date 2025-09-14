import "./global.css";

import { useEffect, useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { createRoot } from "react-dom/client";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Outlet, Link, Navigate, NavLink } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import PoemDetail from "./pages/PoemDetail";
import Favorites from "./pages/Favorites";
import Dashboard from "./pages/Dashboard";
import Manage from "./pages/Manage";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Analytics } from "@vercel/analytics/react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button, buttonVariants } from "@/components/ui/button";
import { loadSiteTitle, saveSiteTitle } from "@/lib/site";
import { cn } from "@/lib/utils";

const queryClient = new QueryClient();

function Layout() {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState<string>(() => loadSiteTitle());

  useEffect(() => {
    document.title = `${title} - Poetry Manager`;
  }, [title]);

  const onSave = () => {
    const next = title.trim() || "AngelWrites";
    saveSiteTitle(next);
    setTitle(next);
    setOpen(false);
  };

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img src="https://cdn.builder.io/api/v1/image/assets%2Faddb4921f9a9401eae5d6e57d8e51a79%2F11516b0de05449e998114111d9a9fa80?format=webp&width=64" alt={title} className="h-8 w-8 object-contain" />
            <span className="text-lg font-extrabold tracking-tight bg-clip-text text-transparent bg-[linear-gradient(120deg,hsl(var(--primary)),hsl(var(--accent-foreground)))]">{title}</span>
          </Link>
          <nav className="flex items-center gap-2">
            <NavLink end to="/" className={({ isActive }) => cn(buttonVariants({ variant: isActive ? "default" : "ghost", size: "default" }), !isActive && "hover:bg-primary/15 hover:text-primary")}>Home</NavLink>
            <NavLink to="/favorites" className={({ isActive }) => cn(buttonVariants({ variant: isActive ? "default" : "ghost", size: "default" }), !isActive && "hover:bg-primary/15 hover:text-primary")}>Favorites</NavLink>
            <NavLink to="/dashboard" className={({ isActive }) => cn(buttonVariants({ variant: isActive ? "default" : "ghost", size: "default" }), !isActive && "hover:bg-primary/15 hover:text-primary")}>Dashboard</NavLink>
            <NavLink to="/manage" className={({ isActive }) => cn(buttonVariants({ variant: isActive ? "default" : "ghost", size: "default" }), !isActive && "hover:bg-primary/15 hover:text-primary")}>Manage</NavLink>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="border-2 border-primary hover:bg-transparent">Rename</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Rename website</DialogTitle>
                </DialogHeader>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Website name" />
                <DialogFooter>
                  <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                  <Button onClick={onSave}>Save</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <ThemeToggle />
          </nav>
        </div>
      </header>
      <Outlet />
    </div>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Index />} />
            <Route path="poem/:id" element={<PoemDetail />} />
            <Route path="favorites" element={<Favorites />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="manage" element={<Manage />} />
            <Route path="backup" element={<Navigate to="/manage" replace />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
      <Analytics />
  </QueryClientProvider>
);

createRoot(document.getElementById("root")!).render(<App />);
