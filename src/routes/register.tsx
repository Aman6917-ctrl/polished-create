import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { SiteNav } from "@/components/site-nav";
import { register } from "@/lib/auth";

export const Route = createFileRoute("/register")({
  component: RegisterPage,
  head: () => ({ meta: [{ title: "Register — NeuroClear" }] }),
});

function RegisterPage() {
  const navigate = useNavigate();
  const [username, setU] = useState("");
  const [name, setName] = useState("");
  const [password, setP] = useState("");
  const [err, setErr] = useState<string | null>(null);

  return (
    <div className="min-h-screen">
      <SiteNav />
      <main className="mx-auto grid max-w-6xl gap-8 px-6 py-16 lg:grid-cols-2">
        <section className="rounded-[32px] bg-clinical-900 p-10 text-primary-foreground">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-widest text-clinical-100">
            Request Access
          </div>
          <h1 className="mb-6 text-4xl font-bold leading-tight">Create a NeuroClear research account.</h1>
          <p className="mb-10 text-clinical-100/80">
            Accounts are stored in your browser for this preview. Use them to access the protected MRI analysis workspace.
          </p>
        </section>

        <section className="rounded-[32px] border border-border/60 bg-card p-10 shadow-soft">
          <div className="mb-6 inline-flex rounded-full bg-clinical-100 p-1 text-sm font-semibold">
            <Link to="/login" className="px-4 py-1.5 text-clinical-700">Login</Link>
            <span className="rounded-full bg-card px-4 py-1.5 text-clinical-900 shadow-soft">Register</span>
          </div>
          <h2 className="mb-2 text-3xl font-bold text-clinical-900">Create your account</h2>
          <p className="mb-8 text-sm text-muted-foreground">All fields required. You'll be signed in automatically.</p>

          <form
            className="space-y-5"
            onSubmit={(e) => {
              e.preventDefault();
              setErr(null);
              if (!username || !password || !name) return setErr("Please fill all fields.");
              const u = register(username, password, name);
              if (!u) return setErr("Username already exists.");
              navigate({ to: "/" });
            }}
          >
            <Field label="Full Name">
              <input value={name} onChange={(e) => setName(e.target.value)} className="input" placeholder="Dr. Aanya Rao" />
            </Field>
            <Field label="Username">
              <input value={username} onChange={(e) => setU(e.target.value)} className="input" placeholder="aanyar" />
            </Field>
            <Field label="Password">
              <input type="password" value={password} onChange={(e) => setP(e.target.value)} className="input" placeholder="At least 6 characters" />
            </Field>
            {err && <p className="rounded-xl bg-destructive/10 px-4 py-2 text-sm text-destructive">{err}</p>}
            <button className="h-12 w-full rounded-xl bg-clinical-900 font-semibold text-primary-foreground shadow-soft transition-colors hover:bg-clinical-700">
              Create Account
            </button>
          </form>
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
