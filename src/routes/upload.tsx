import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { SiteFooter, SiteNav } from "@/components/site-nav";
import { useAuth } from "@/hooks/use-auth";
import { Upload } from "lucide-react";

export const Route = createFileRoute("/upload")({
  component: UploadPage,
  head: () => ({ meta: [{ title: "Upload MRI Scan — NeuroClear" }] }),
});

function UploadPage() {
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  const [xai, setXai] = useState<"gradcam" | "shap" | "lime">("gradcam");
  const [err, setErr] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!file) return setErr("Please upload an MRI scan.");
    const a = Number(age);
    if (!a || a < 40 || a > 100) return setErr("Age must be between 40 and 100.");
    if (!gender) return setErr("Please select gender.");

    sessionStorage.setItem(
      "neuroclear_pending",
      JSON.stringify({
        fileName: file.name,
        fileSize: file.size,
        age: a,
        gender,
        xai,
      }),
    );
    navigate({ to: "/analyzing" });
  }

  if (!user) return null;

  return (
    <div className="min-h-screen">
      <SiteNav />
      <main className="mx-auto max-w-5xl px-6 py-12">
        <div className="mb-10">
          <div className="mb-3 font-mono text-xs font-bold uppercase tracking-widest text-clinical-700">Scan Analysis</div>
          <h1 className="mb-3 text-4xl font-bold tracking-tight text-clinical-900">Upload MRI Scan</h1>
          <p className="max-w-2xl text-muted-foreground">
            Upload an MRI file, enter patient metadata, choose an explanation method, and send the request to the backend model.
          </p>
        </div>

        <form onSubmit={submit} className="rounded-3xl border border-border/60 bg-card p-8 shadow-soft">
          {/* Dropzone */}
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="group block w-full rounded-2xl border-2 border-dashed border-border bg-clinical-50 p-12 text-center transition-all hover:border-clinical-500/50 hover:bg-clinical-100/40"
          >
            <div className="mx-auto mb-4 grid size-16 place-items-center rounded-full bg-card shadow-soft transition-transform group-hover:scale-110">
              <Upload className="size-6 text-clinical-700" />
            </div>
            <h3 className="mb-1 text-lg font-semibold text-clinical-900">
              {file ? "Change MRI Scan" : "Drop your MRI scan here"}
            </h3>
            <p className="text-sm text-muted-foreground">
              or <span className="font-semibold text-clinical-700">browse files</span> from your computer
            </p>
          </button>
          <input
            ref={inputRef}
            type="file"
            accept="image/*,.dcm,.nii,.nii.gz"
            className="hidden"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />

          {file && (
            <div className="mt-4 flex items-center justify-between rounded-2xl border border-border/60 bg-clinical-50 px-5 py-3">
              <div>
                <p className="font-semibold text-clinical-900">{file.name}</p>
                <p className="text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
              </div>
              <span className="rounded-full bg-clinical-100 px-3 py-1 text-xs font-bold text-clinical-700">Ready</span>
            </div>
          )}

          {/* Form fields */}
          <div className="mt-8 grid gap-6 md:grid-cols-2">
            <div>
              <Label>Age</Label>
              <input type="number" min={40} max={100} value={age} onChange={(e) => setAge(e.target.value)} placeholder="Enter age" className="field" />
              <p className="mt-1.5 text-xs text-muted-foreground">Allowed range: 40 to 100 years.</p>
            </div>
            <div>
              <Label>Gender</Label>
              <select value={gender} onChange={(e) => setGender(e.target.value)} className="field">
                <option value="">Select gender</option>
                <option value="Female">Female</option>
                <option value="Male">Male</option>
                <option value="Other">Other</option>
              </select>
              <p className="mt-1.5 text-xs text-muted-foreground">Included in the model metadata payload.</p>
            </div>
          </div>

          <div className="mt-6">
            <Label>XAI Method</Label>
            <div className="grid grid-cols-3 gap-3">
              {([
                ["gradcam", "Grad-CAM"],
                ["shap", "SHAP"],
                ["lime", "LIME"],
              ] as const).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setXai(key)}
                  className={`h-12 rounded-xl border-2 text-sm font-semibold transition-all ${
                    xai === key
                      ? "border-clinical-500 bg-clinical-100/60 text-clinical-900"
                      : "border-border bg-background text-muted-foreground hover:border-clinical-300"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">SHAP needs a background tensor file and is usually the slowest option.</p>
          </div>

          {err && <p className="mt-6 rounded-xl bg-destructive/10 px-4 py-2 text-sm text-destructive">{err}</p>}

          <div className="mt-8 flex flex-wrap gap-3">
            <button className="rounded-xl bg-clinical-900 px-7 py-3 font-semibold text-primary-foreground shadow-soft transition-colors hover:bg-clinical-700">
              Analyze MRI
            </button>
            <button
              type="button"
              onClick={() => {
                setFile(null);
                setAge("");
                setGender("");
                setXai("gradcam");
                setErr(null);
              }}
              className="rounded-xl border border-border bg-background px-7 py-3 font-semibold text-clinical-900 hover:bg-accent"
            >
              Reset
            </button>
            <Link to="/" className="rounded-xl border border-border bg-background px-7 py-3 font-semibold text-clinical-700 hover:bg-accent">
              Back Home
            </Link>
          </div>
        </form>

        <aside className="mt-8 rounded-3xl border border-border/60 bg-card p-7 shadow-soft">
          <h3 className="mb-3 text-lg font-bold text-clinical-900">Before you upload</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>• Use anonymized scans without patient identifiers.</li>
            <li>• Only supported MRI files are accepted for backend processing.</li>
            <li>• Results are research-grade and must be reviewed by a qualified clinician.</li>
          </ul>
        </aside>
      </main>
      <SiteFooter />

      <style>{`.field{width:100%;height:3rem;padding:0 1rem;border-radius:0.75rem;border:1px solid var(--border);background:var(--background);outline:none;transition:all .15s}.field:focus{border-color:var(--clinical-500);box-shadow:0 0 0 3px color-mix(in oklab, var(--clinical-500) 20%, transparent)}`}</style>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <span className="mb-2 block text-xs font-bold uppercase tracking-widest text-muted-foreground">{children}</span>;
}
