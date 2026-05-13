import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SiteFooter, SiteNav } from "@/components/site-nav";
import gradcamSample from "@/assets/gradcam-sample.jpg";
import mriSample from "@/assets/mri-sample.jpg";

export const Route = createFileRoute("/result")({
  component: ResultPage,
  head: () => ({ meta: [{ title: "Analysis Result — NeuroClear" }] }),
});

type Result = {
  fileName: string;
  fileSize: number;
  age: number;
  gender: string;
  xai: "gradcam" | "shap" | "lime";
  completedAt: string;
  inferenceSec: number;
  prediction: "CN" | "MCI" | "AD";
  predictionLabel: string;
  confidence: number;
  probs: { cn: number; mci: number; ad: number };
};

const xaiName = { gradcam: "Grad-CAM", shap: "SHAP", lime: "LIME" };

function ResultPage() {
  const navigate = useNavigate();
  const [r, setR] = useState<Result | null>(null);

  useEffect(() => {
    const raw = sessionStorage.getItem("neuroclear_result");
    if (!raw) {
      navigate({ to: "/upload" });
      return;
    }
    setR(JSON.parse(raw));
  }, [navigate]);

  if (!r) return null;

  const tone =
    r.prediction === "CN" ? "bg-clinical-100 text-clinical-700"
    : r.prediction === "MCI" ? "bg-amber-100 text-amber-700"
    : "bg-rose-100 text-rose-700";

  const date = new Date(r.completedAt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });

  return (
    <div className="min-h-screen">
      <SiteNav />
      <main className="mx-auto max-w-7xl px-6 py-12">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="mb-2 font-mono text-xs font-bold uppercase tracking-widest text-clinical-700">Analysis Result</div>
            <h1 className="text-3xl font-bold text-clinical-900">Completed · {date}</h1>
          </div>
          <Link to="/upload" className="rounded-xl border border-border bg-card px-5 py-2.5 font-semibold text-clinical-900 shadow-soft hover:bg-accent">
            Analyze Another Scan
          </Link>
        </div>

        <div className="grid gap-6 lg:grid-cols-12">
          {/* Left column - scan & metadata */}
          <aside className="space-y-4 lg:col-span-4">
            <div className="overflow-hidden rounded-3xl border border-border/60 bg-card shadow-soft">
              <img src={mriSample} alt="Uploaded MRI scan" width={768} height={768} loading="lazy" className="aspect-square w-full object-cover" />
              <div className="p-5">
                <p className="truncate text-sm font-semibold text-clinical-900">{r.fileName}</p>
                <p className="text-xs text-muted-foreground">{(r.fileSize / 1024 / 1024).toFixed(2)} MB</p>
              </div>
            </div>

            <InfoCard label="Model">
              <p className="text-sm leading-relaxed text-clinical-900">FeatureConcatEnsemble<br /><span className="text-muted-foreground">(ResNet50 + EfficientNetB0 + DenseNet121)</span></p>
            </InfoCard>
            <InfoCard label="Inference Time">
              <p className="font-mono text-lg text-clinical-900">{r.inferenceSec.toFixed(2)}s</p>
            </InfoCard>
            <InfoCard label={`XAI Output: ${xaiName[r.xai]}`}>
              <div className="overflow-hidden rounded-xl bg-black">
                <div className="flex items-center justify-between bg-black/80 px-3 py-2 font-mono text-[10px] text-white/70">
                  <span>Predicted: {r.prediction}</span>
                  <span>CN {r.probs.cn.toFixed(2)} · MCI {r.probs.mci.toFixed(2)} · AD {r.probs.ad.toFixed(2)}</span>
                </div>
                <img src={gradcamSample} alt={`${xaiName[r.xai]} heatmap`} width={768} height={768} loading="lazy" className="aspect-square w-full object-cover" />
              </div>
              <p className="mt-3 text-xs font-semibold text-clinical-900">Highlighted MRI regions</p>
            </InfoCard>
          </aside>

          {/* Right column - results */}
          <section className="space-y-6 lg:col-span-8">
            <div className="rounded-3xl border border-border/60 bg-card p-8 shadow-soft">
              <div className="mb-5 flex items-center justify-between">
                <span className="font-mono text-xs font-bold uppercase tracking-widest text-muted-foreground">Predicted Diagnosis</span>
                <span className={`rounded-full px-4 py-1 text-xs font-bold ${tone}`}>{r.predictionLabel}</span>
              </div>
              <div className="mb-2 flex items-baseline gap-4">
                <h2 className="text-6xl font-bold tracking-tight text-clinical-900">{r.prediction}</h2>
                <p className="text-lg text-muted-foreground">{r.predictionLabel} with {(r.confidence * 100).toFixed(1)}% model confidence.</p>
              </div>
              <div className="mt-8">
                <div className="mb-2 flex justify-between text-sm font-semibold">
                  <span className="text-clinical-900">Prediction Score</span>
                  <span className="text-clinical-700">{(r.confidence * 100).toFixed(1)}%</span>
                </div>
                <Bar value={r.confidence} tone="primary" />
              </div>
            </div>

            <div className="rounded-3xl border border-border/60 bg-card p-8 shadow-soft">
              <h3 className="mb-6 text-xl font-bold text-clinical-900">Probability Breakdown</h3>
              <div className="space-y-5">
                {(["cn", "mci", "ad"] as const).map((k) => (
                  <div key={k}>
                    <div className="mb-1.5 flex justify-between text-sm font-semibold">
                      <span className="uppercase text-clinical-900">{k}</span>
                      <span className="text-muted-foreground">{(r.probs[k] * 100).toFixed(1)}%</span>
                    </div>
                    <Bar value={r.probs[k]} tone={k === "cn" ? "primary" : k === "mci" ? "amber" : "rose"} />
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-border/60 bg-card p-8 shadow-soft">
              <h3 className="mb-5 text-xl font-bold text-clinical-900">Patient Metadata</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <Meta k="Age" v={String(r.age)} />
                <Meta k="Gender" v={r.gender} />
              </div>
            </div>

            <div className="rounded-3xl border border-border/60 bg-card p-8 shadow-soft">
              <h3 className="mb-3 text-xl font-bold text-clinical-900">XAI Reasoning</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {xaiName[r.xai]} highlights regions that drove the {r.predictionLabel} prediction. Attention concentrates on the
                hippocampal formation and surrounding temporal cortex; volumetric and intensity patterns there carry the most
                weight in the ensemble's decision.
              </p>
            </div>

            <div className="rounded-3xl border border-amber-200 bg-amber-50 p-6 text-sm leading-relaxed text-amber-900">
              <strong>Disclaimer:</strong> This result is generated by an AI model for research purposes only. It is not a clinical
              diagnosis and should be reviewed by a qualified clinician.
            </div>

            <Link to="/upload" className="inline-block rounded-xl bg-clinical-900 px-7 py-3 font-semibold text-primary-foreground shadow-soft hover:bg-clinical-700">
              Upload New Scan
            </Link>
          </section>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

function InfoCard({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-soft">
      <div className="mb-2 font-mono text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label}</div>
      {children}
    </div>
  );
}

function Meta({ k, v }: { k: string; v: string }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-clinical-50 p-5">
      <div className="mb-1 font-mono text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{k}</div>
      <div className="text-lg font-semibold text-clinical-900">{v}</div>
    </div>
  );
}

function Bar({ value, tone }: { value: number; tone: "primary" | "amber" | "rose" }) {
  const cls = tone === "primary" ? "bg-clinical-700" : tone === "amber" ? "bg-amber-500" : "bg-rose-500";
  return (
    <div className="h-2.5 w-full overflow-hidden rounded-full bg-clinical-100">
      <div className={`h-full ${cls} transition-all duration-700`} style={{ width: `${Math.max(2, value * 100)}%` }} />
    </div>
  );
}
