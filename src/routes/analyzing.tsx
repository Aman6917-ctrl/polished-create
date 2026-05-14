import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SiteNav } from "@/components/site-nav";
import { getMlPredictUrl } from "@/lib/ml-api";

export const Route = createFileRoute("/analyzing")({
  component: AnalyzingPage,
  head: () => ({ meta: [{ title: "Analyzing MRI Scan — NeuroClear" }] }),
});

const STAGES = [
  "Sending MRI to the Python inference API",
  "Running FeatureConcatEnsemble forward pass",
  "Building probabilities and optional Grad-CAM heatmap",
];

type ApiPredict = {
  prediction: string;
  prediction_label: string;
  confidence: number;
  probs: { cn: number; mci: number; ad: number };
  inference_sec: number;
  heatmap_png_base64: string | null;
  xai_note: string | null;
};

function AnalyzingPage() {
  const navigate = useNavigate();
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const pending = sessionStorage.getItem("neuroclear_pending");
    const imageDataUrl = sessionStorage.getItem("neuroclear_pending_image");
    if (!pending || !imageDataUrl) {
      navigate({ to: "/upload" });
      return;
    }

    const pendingJson = pending;
    const imageUrl = imageDataUrl;

    let interval: ReturnType<typeof setInterval> | undefined;
    let cancelled = false;

    async function run() {
      setError(null);
      const meta = JSON.parse(pendingJson) as {
        fileName: string;
        fileSize: number;
        age: number;
        gender: string;
        xai: "gradcam" | "shap" | "lime";
      };

      interval = setInterval(() => {
        setProgress((p) => Math.min(p + 6, 92));
      }, 120);

      try {
        const blob = await fetch(imageUrl).then((r) => r.blob());
        const fd = new FormData();
        fd.append("file", blob, meta.fileName || "scan.png");
        fd.append("xai", meta.xai);

        const res = await fetch(getMlPredictUrl(), {
          method: "POST",
          body: fd,
        });

        if (!res.ok) {
          const t = await res.text();
          throw new Error(t || `HTTP ${res.status}`);
        }

        const data = (await res.json()) as ApiPredict;
        if (cancelled) return;

        const pred = data.prediction.toUpperCase() as "CN" | "MCI" | "AD";
        const heatmapDataUrl = data.heatmap_png_base64
          ? `data:image/png;base64,${data.heatmap_png_base64}`
          : null;

        const result = {
          ...meta,
          completedAt: new Date().toISOString(),
          inferenceSec: data.inference_sec,
          prediction: pred,
          predictionLabel: data.prediction_label,
          confidence: data.confidence,
          probs: data.probs,
          previewImageDataUrl: imageUrl,
          heatmapDataUrl,
          xaiNote: data.xai_note,
        };

        sessionStorage.setItem("neuroclear_result", JSON.stringify(result));
        sessionStorage.removeItem("neuroclear_pending");
        sessionStorage.removeItem("neuroclear_pending_image");
        setProgress(100);
        setTimeout(() => navigate({ to: "/result" }), 350);
      } catch (e) {
        if (cancelled) return;
        const msg = e instanceof Error ? e.message : String(e);
        setError(msg);
        clearInterval(interval);
        setProgress(0);
      } finally {
        if (interval) clearInterval(interval);
      }
    }

    void run();
    return () => {
      cancelled = true;
      if (interval) clearInterval(interval);
    };
  }, [navigate]);

  const stageIdx = Math.min(STAGES.length - 1, Math.floor((progress / 100) * STAGES.length));

  return (
    <div className="min-h-screen">
      <SiteNav />
      <main className="grid place-items-center px-6 py-24">
        <div className="w-full max-w-xl rounded-3xl border border-border/60 bg-card p-10 text-center shadow-soft">
          <div className="relative mx-auto mb-8 size-32">
            <div className="absolute inset-0 rounded-full border-2 border-clinical-100" />
            <div
              className={`absolute inset-0 rounded-full border-2 border-transparent border-t-clinical-700 ${error ? "" : "animate-spin"}`}
            />
            <div className="absolute inset-3 grid place-items-center rounded-full bg-clinical-100">
              <div className={`size-6 rounded-sm bg-clinical-700 ${error ? "" : "animate-pulse"}`} />
            </div>
          </div>
          <h1 className="mb-2 text-3xl font-bold text-clinical-900">{error ? "Inference failed" : "Analyzing MRI Scan"}</h1>
          <p className="mb-8 text-muted-foreground">
            {error
              ? "Start the ML API (see terminal) or check the error below."
              : "Calling the local PyTorch model. Keep this tab open."}
          </p>
          {error ? (
            <pre className="mb-6 max-h-48 overflow-auto rounded-xl bg-destructive/10 p-4 text-left text-xs text-destructive">{error}</pre>
          ) : null}
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
          {error ? (
            <button
              type="button"
              onClick={() => navigate({ to: "/upload" })}
              className="mt-6 rounded-xl bg-clinical-900 px-6 py-2.5 font-semibold text-primary-foreground"
            >
              Back to upload
            </button>
          ) : null}
        </div>
      </main>
    </div>
  );
}
