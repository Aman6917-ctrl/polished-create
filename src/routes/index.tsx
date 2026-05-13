import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteFooter, SiteNav } from "@/components/site-nav";
import heroBrain from "@/assets/hero-brain.jpg";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  return (
    <div className="min-h-screen">
      <SiteNav />
      <main className="mx-auto max-w-7xl px-6 py-12 lg:py-20">
        {/* Hero */}
        <section className="grid items-center gap-16 lg:grid-cols-2">
          <div className="max-w-xl">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-clinical-500/20 bg-clinical-100 px-3 py-1 text-xs font-bold uppercase tracking-widest text-clinical-700">
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-clinical-500 opacity-75" />
                <span className="relative inline-flex size-2 rounded-full bg-clinical-500" />
              </span>
              Clinical Preview v2.4
            </div>
            <h1 className="mb-6 text-5xl font-bold leading-[1.05] tracking-tight text-clinical-900 md:text-6xl">
              Precision <span className="text-clinical-700">Neurological</span> Diagnostics.
            </h1>
            <p className="mb-8 text-lg leading-relaxed text-muted-foreground">
              Deploying state-of-the-art Explainable AI to assist clinicians in the early
              detection of neurodegenerative biomarkers through automated MRI synthesis.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                to="/upload"
                className="rounded-2xl bg-clinical-900 px-8 py-4 font-semibold text-primary-foreground shadow-soft transition-all hover:-translate-y-0.5 hover:bg-clinical-700"
              >
                Begin Analysis
              </Link>
              <Link
                to="/workflow"
                className="rounded-2xl border border-border bg-card px-8 py-4 font-semibold text-clinical-900 transition-all hover:bg-accent"
              >
                View Workflow
              </Link>
            </div>
          </div>

          <div className="relative">
            <div className="absolute -inset-6 bg-gradient-to-tr from-clinical-500/20 via-clinical-300/10 to-transparent blur-3xl" />
            <div className="relative rounded-[32px] border border-border/60 bg-card p-4 shadow-glow">
              <img
                src={heroBrain}
                alt="3D MRI brain visualization with diagnostic markers"
                width={1200}
                height={896}
                className="aspect-[4/3] w-full rounded-[24px] object-cover"
              />
              <div className="mt-6 grid grid-cols-2 gap-4">
                <Stat label="Confidence Score" value="98.4%" />
                <Stat label="Processing Time" value="1.2s" />
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="mt-28 grid gap-6 md:grid-cols-3">
          {[
            { kicker: "01", title: "Public Home", body: "Landing page stays browsable before login. Clinicians review the workflow first." },
            { kicker: "02", title: "Protected Analysis", body: "Inference and result views require authentication. Sessions return users home cleanly." },
            { kicker: "03", title: "Explainable Outputs", body: "Grad-CAM, SHAP and LIME explain every CN, MCI, AD probability the model produces." },
          ].map((f) => (
            <article key={f.kicker} className="rounded-3xl border border-border/60 bg-card p-8 shadow-soft">
              <div className="mb-3 font-mono text-xs font-bold tracking-widest text-clinical-500">{f.kicker}</div>
              <h3 className="mb-2 text-xl font-bold text-clinical-900">{f.title}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">{f.body}</p>
            </article>
          ))}
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border/60 bg-background p-4">
      <div className="mb-1 font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="text-2xl font-bold text-clinical-900">{value}</div>
    </div>
  );
}
