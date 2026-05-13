import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { SiteNav } from "@/components/site-nav";
import { login } from "@/lib/auth";

export const Route = createFileRoute("/login")({
  component: LoginPage,
  head: () => ({ meta: [{ title: "Sign in — NeuroClear" }] }),
});

function LoginPage() {
  const navigate = useNavigate();
  const [username, setU] = useState("admin");
  const [password, setP] = useState("admin123");
  const [err, setErr] = useState<string | null>(null);

  return (
    <div className="min-h-screen">
      <SiteNav />
      <main className="mx-auto grid max-w-6xl gap-8 px-6 py-16 lg:grid-cols-2">
        <section className="rounded-[32px] bg-clinical-900 p-10 text-primary-foreground">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-widest text-clinical-100">
            NeuroClear Access
          </div>
          <h1 className="mb-6 text-4xl font-bold leading-tight">Secure entry for a calm, hospital-style MRI workflow.</h1>
          <p className="mb-10 text-clinical-100/80">
            Browse the home page first, then sign in to unlock MRI upload, backend inference and protected result views.
          </p>
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { t: "Public Home", d: "Landing stays visible before login." },
              { t: "Protected Analysis", d: "Inference requires auth." },
              { t: "Session Return", d: "Login sends users back home." },
            ].map((b) => (
              <div key={b.t} className="rounded-2xl bg-white/5 p-4 ring-1 ring-white/10">
                <div className="mb-1 text-[10px] font-bold uppercase tracking-widest text-clinical-300">{b.t}</div>
                <p className="text-sm leading-snug text-clinical-100/85">{b.d}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-[32px] border border-border/60 bg-card p-10 shadow-soft">
          <div className="mb-6 inline-flex rounded-full bg-clinical-100 p-1 text-sm font-semibold">
            <span className="rounded-full bg-card px-4 py-1.5 text-clinical-900 shadow-soft">Login</span>
            <Link to="/register" className="px-4 py-1.5 text-clinical-700">Register</Link>
          </div>
          <h2 className="mb-2 text-3xl font-bold text-clinical-900">Welcome back</h2>
          <p className="mb-8 text-sm text-muted-foreground">Sign in and you'll be redirected back to the home page.</p>

          <form
            className="space-y-5"
            onSubmit={(e) => {
              e.preventDefault();
              setErr(null);
              const u = login(username, password);
              if (!u) return setErr("Invalid username or password.");
              navigate({ to: "/" });
            }}
          >
            <Field label="Username">
              <input value={username} onChange={(e) => setU(e.target.value)} className="input" />
            </Field>
            <Field label="Password">
              <input type="password" value={password} onChange={(e) => setP(e.target.value)} className="input" />
            </Field>
            {err && <p className="rounded-xl bg-destructive/10 px-4 py-2 text-sm text-destructive">{err}</p>}
            <button className="h-12 w-full rounded-xl bg-clinical-900 font-semibold text-primary-foreground shadow-soft transition-colors hover:bg-clinical-700">
              Login to NeuroClear
            </button>
          </form>

          <div className="mt-6 rounded-2xl border border-border/60 bg-clinical-50 p-4 text-sm text-muted-foreground">
            Default seeded account is <strong className="text-clinical-900">admin</strong> / <strong className="text-clinical-900">admin123</strong>. Registered users are stored in this browser session.
          </div>
        </section>
      </main>

      <style>{`.input{width:100%;height:3rem;padding:0 1rem;border-radius:0.75rem;border:1px solid var(--border);background:var(--background);outline:none;transition:all .15s}.input:focus{border-color:var(--clinical-500);box-shadow:0 0 0 3px color-mix(in oklab, var(--clinical-500) 20%, transparent)}`}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-bold uppercase tracking-widest text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
