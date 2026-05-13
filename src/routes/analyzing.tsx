import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SiteNav } from "@/components/site-nav";

export const Route = createFileRoute("/analyzing")({
  component: AnalyzingPage,
  head: () => ({ meta: [{ title: "Analyzing MRI Scan — NeuroClear" }] }),
});

const STAGES = [
  "Validating MRI file, metadata, and XAI method",
  "Loading PyTorch weights and optional SHAP background",
  "Computing CN, MCI, AD probabilities and explanation output",
];

function AnalyzingPage() {
  const navigate = useNavigate();
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const pending = sessionStorage.getItem("neuroclear_pending");
    if (!pending) {
      navigate({ to: "/upload" });
      return;
    }
    let p = 0;
    const id = setInterval(() => {
      p += 4;
      setProgress(Math.min(p, 100));
      if (p >= 100) {
        clearInterval(id);
        // Generate mock result
        const meta = JSON.parse(pending);
        const r = mockResult(meta);
        sessionStorage.setItem("neuroclear_result", JSON.stringify(r));
        sessionStorage.removeItem("neuroclear_pending");
        setTimeout(() => navigate({ to: "/result" }), 400);
      }
    }, 110);
    return () => clearInterval(id);
  }, [navigate]);

  const stageIdx = Math.min(STAGES.length - 1, Math.floor((progress / 100) * STAGES.length));

  return (
    <div className="min-h-screen">
      <SiteNav />
      <main className="grid place-items-center px-6 py-24">
        <div className="w-full max-w-xl rounded-3xl border border-border/60 bg-card p-10 text-center shadow-soft">
          <div className="relative mx-auto mb-8 size-32">
            <div className="absolute inset-0 rounded-full border-2 border-clinical-100" />
            <div className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-clinical-700" />
            <div className="absolute inset-3 grid place-items-center rounded-full bg-clinical-100">
              <div className="size-6 animate-pulse rounded-sm bg-clinical-700" />
            </div>
          </div>
          <h1 className="mb-2 text-3xl font-bold text-clinical-900">Analyzing MRI Scan</h1>
          <p className="mb-8 text-muted-foreground">
            The backend is validating the upload, preparing the MRI tensor, and running the model plus the selected XAI module.
          </p>
          <div className="mb-2 h-2 w-full overflow-hidden rounded-full bg-clinical-100">
            <div className="h-full bg-clinical-700 transition-all duration-100" style={{ width: `${progress}%` }} />
          </div>
          <p className="mb-8 font-mono text-xs text-muted-foreground">{progress}% — Stage {stageIdx + 1}/3</p>
          <ul className="space-y-2 text-left text-sm">
            {STAGES.map((s, i) => (
              <li key={s} className={`flex items-start gap-3 ${i <= stageIdx ? "text-clinical-900" : "text-muted-foreground"}`}>
                <span className={`mt-1.5 size-2 shrink-0 rounded-full ${i <= stageIdx ? "bg-clinical-700" : "bg-border"}`} />
                {s}
              </li>
            ))}
          </ul>
        </div>
      </main>
    </div>
  );
}

function mockResult(meta: { fileName: string; fileSize: number; age: number; gender: string; xai: string }) {
  // Deterministic-ish from age
  const seed = (meta.age * 97 + meta.fileName.length * 13) % 100;
  let cn: number, mci: number, ad: number;
  if (seed < 50) {
    cn = 0.85 + (seed / 100) * 0.14;
    mci = (1 - cn) * 0.4;
    ad = 1 - cn - mci;
  } else if (seed < 80) {
    mci = 0.7 + ((seed - 50) / 100) * 0.2;
    cn = (1 - mci) * 0.5;
    ad = 1 - cn - mci;
  } else {
    ad = 0.7 + ((seed - 80) / 100) * 0.25;
    mci = (1 - ad) * 0.6;
    cn = 1 - ad - mci;
  }
  const probs = { cn, mci, ad };
  const top = (Object.entries(probs) as [keyof typeof probs, number][]).sort((a, b) => b[1] - a[1])[0];
  const labelMap = { cn: "Cognitively Normal", mci: "Mild Cognitive Impairment", ad: "Alzheimer's Disease" };
  return {
    ...meta,
    completedAt: new Date().toISOString(),
    inferenceSec: 4.8 + (seed % 30) / 10,
    prediction: top[0].toUpperCase(),
    predictionLabel: labelMap[top[0]],
    confidence: top[1],
    probs,
  };
}
