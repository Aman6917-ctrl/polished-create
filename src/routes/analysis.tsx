import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteFooter, SiteNav } from "@/components/site-nav";

export const Route = createFileRoute("/analysis")({
  component: Analysis,
  head: () => ({ meta: [{ title: "Analysis — NeuroClear" }] }),
});

function Analysis() {

  return (
    <div className="min-h-screen">
      <SiteNav />
      <main className="mx-auto max-w-5xl px-6 py-20 text-center">
        <div className="mb-4 font-mono text-xs font-bold uppercase tracking-widest text-clinical-700">Analysis</div>
        <h1 className="mb-6 text-5xl font-bold tracking-tight text-clinical-900">Run an MRI analysis</h1>
        <p className="mx-auto mb-10 max-w-xl text-lg text-muted-foreground">
          Upload a scan, fill in the patient metadata, and choose an explanation method. Results stream back in seconds.
        </p>
        <Link to="/upload" className="inline-block rounded-2xl bg-clinical-900 px-10 py-4 font-semibold text-primary-foreground shadow-soft transition-all hover:-translate-y-0.5 hover:bg-clinical-700">
          Open Upload
        </Link>
      </main>
      <SiteFooter />
    </div>
  );
}
