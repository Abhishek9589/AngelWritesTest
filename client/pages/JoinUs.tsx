import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Mail } from "lucide-react";

export default function JoinUs() {
  return (
    <main className="container py-10 animate-in fade-in-0 slide-in-from-bottom-2 duration-700">
      <section className="relative overflow-hidden rounded-3xl p-8 md:p-12 glass mb-6">
        <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight gradient-text">Join Us</h1>
        <p className="mt-2 max-w-2xl text-sm md:text-base text-muted-foreground">Become part of our community. Get early features, share feedback, and help shape the future of AngelWrites.</p>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardContent className="p-6">
            <h2 className="text-xl font-semibold">What you get</h2>
            <ul className="mt-3 list-disc pl-5 text-sm text-muted-foreground space-y-1">
              <li>Early access to new features</li>
              <li>Community discussions and tips</li>
              <li>Direct influence on roadmap</li>
            </ul>
            <Separator className="my-6" />
            <div className="flex flex-wrap items-center gap-2">
              <a href="mailto:join@angelwrites.app" className="inline-flex">
                <Button className="gap-2"><Mail className="h-4 w-4" /> Email Us</Button>
              </a>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <h2 className="text-xl font-semibold">Stay updated</h2>
            <p className="mt-2 text-sm text-muted-foreground">Follow along for release notes and opportunities to contribute.</p>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
