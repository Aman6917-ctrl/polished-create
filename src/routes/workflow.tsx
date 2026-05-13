import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteFooter, SiteNav } from "@/components/site-nav";

export const Route = createFileRoute("/workflow")({
  component: Workflow,
  head: () => ({ meta: [{ title: "Workflow — NeuroClear" }] }),
});

const steps = [
  { n: "01", t: "Upload MRI", d: "Securely upload high-resolution MRI data through the encrypted gateway. PNG, JPG, DICOM and NIfTI accepted." },
  { n: "02", t: "Add Patient Metadata", d: "Provide age (40–100) and gender so the model can apply demographic context to its inference." },
  { n: "03", t: "Choose XAI Method", d: "Pick Grad-CAM (default), SHAP feature attribution, or LIME local explanations." },
  { n: "04", t: "Run Inference", d: "Synapse-V4 transformer ensemble produces CN, MCI, AD probabilities in around a second." },
  { n: "05", t: "Review Heatmaps", d: "Inspect explainable overlays that highlight the brain regions driving the prediction." },
  { n: "06", t: "Clinical Sign-off", d: "Export the report and combine it with your radiological judgement before any clinical decision." },
];

function Workflow() {
  return (
    <div className="min-h-screen">
      <SiteNav />
      <main className="mx-auto max-w-5xl px-6 py-16">
        <div className="mb-12 max-w-2xl">
          <div className="mb-4 font-mono text-xs font-bold uppercase tracking-widest text-clinical-700">How it works</div>
          <h1 className="mb-4 text-5xl font-bold tracking-tight text-clinical-900">Six steps from scan to explanation.</h1>
          <p className="text-lg text-muted-foreground">A hospital-style workflow that keeps the clinician in control of every diagnostic decision.</p>
        </div>
        <ol className="grid gap-4 md:grid-cols-2">
          {steps.map((s) => (
            <li key={s.n} className="rounded-3xl border border-border/60 bg-card p-7 shadow-soft">
              <div className="mb-3 font-mono text-xs font-bold tracking-widest text-clinical-500">STEP {s.n}</div>
              <h3 className="mb-2 text-xl font-bold text-clinical-900">{s.t}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">{s.d}</p>
            </li>
          ))}
        </ol>
        <div className="mt-12">
          <Link to="/upload" className="rounded-2xl bg-clinical-900 px-8 py-4 font-semibold text-primary-foreground shadow-soft transition-all hover:-translate-y-0.5 hover:bg-clinical-700">
            Start an Analysis
          </Link>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
