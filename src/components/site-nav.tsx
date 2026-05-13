import { Link, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { logout } from "@/lib/auth";

export function SiteNav() {
  const user = useAuth();
  const navigate = useNavigate();

  return (
    <nav className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6">
        <div className="flex items-center gap-10">
          <Link to="/" className="flex items-center gap-2.5">
            <span className="grid size-9 place-items-center rounded-xl bg-clinical-700 shadow-soft">
              <span className="size-3.5 rounded-full border-2 border-background" />
            </span>
            <span className="text-xl font-bold tracking-tight text-clinical-900">
              Neuro<span className="font-light">Clear</span>
            </span>
            <span className="ml-2 hidden rounded-full bg-clinical-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-clinical-700 sm:inline">
              Clinical Preview
            </span>
          </Link>
          <div className="hidden gap-6 text-sm font-medium text-muted-foreground md:flex">
            <Link to="/" className="transition-colors hover:text-clinical-700" activeProps={{ className: "text-clinical-900" }} activeOptions={{ exact: true }}>
              Home
            </Link>
            <Link to="/workflow" className="transition-colors hover:text-clinical-700" activeProps={{ className: "text-clinical-900" }}>
              Workflow
            </Link>
            <Link to="/analysis" className="transition-colors hover:text-clinical-700" activeProps={{ className: "text-clinical-900" }}>
              Analysis
            </Link>
          </div>
        </div>

        {user ? (
          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-2 rounded-full border border-border bg-card px-2 py-1.5 sm:flex">
              <span className="grid size-7 place-items-center rounded-full bg-clinical-700 text-xs font-bold text-primary-foreground">
                {user.name.charAt(0).toUpperCase()}
              </span>
              <span className="pr-2 text-sm font-semibold text-clinical-900">{user.name}</span>
            </div>
            <button
              onClick={() => {
                logout();
                navigate({ to: "/" });
              }}
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-clinical-900"
            >
              Logout
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Link to="/login" className="px-5 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-clinical-900">
              Sign In
            </Link>
            <Link
              to="/register"
              className="rounded-full bg-clinical-900 px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-soft transition-all hover:bg-clinical-700"
            >
              Request Access
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-border/60 py-12">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 px-6 text-sm text-muted-foreground md:flex-row">
        <div className="flex items-center gap-2">
          <div className="size-6 rounded bg-clinical-900" />
          <span className="font-bold text-clinical-900">NeuroClear</span>
        </div>
        <div className="flex gap-8">
          <a href="#" className="hover:text-clinical-700">Privacy</a>
          <a href="#" className="hover:text-clinical-700">Clinical Guidelines</a>
          <a href="#" className="hover:text-clinical-700">Status</a>
        </div>
        <p>© 2026 NeuroClear · Research preview</p>
      </div>
    </footer>
  );
}
