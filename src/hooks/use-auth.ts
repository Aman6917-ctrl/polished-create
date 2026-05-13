import { useEffect, useState } from "react";
import { getUser, type AuthUser } from "@/lib/auth";

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  useEffect(() => {
    setUser(getUser());
    const h = () => setUser(getUser());
    window.addEventListener("neuroclear-auth", h);
    window.addEventListener("storage", h);
    return () => {
      window.removeEventListener("neuroclear-auth", h);
      window.removeEventListener("storage", h);
    };
  }, []);
  return user;
}
