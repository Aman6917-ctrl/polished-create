// Mock auth (in-memory + localStorage) — same behavior as the reference Flask demo.
const KEY = "neuroclear_auth";
const USERS_KEY = "neuroclear_users";

export type AuthUser = { username: string; name: string };

type Stored = { username: string; password: string; name: string };

function readUsers(): Stored[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(USERS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  const seed: Stored[] = [{ username: "admin", password: "admin123", name: "Admin User" }];
  localStorage.setItem(USERS_KEY, JSON.stringify(seed));
  return seed;
}

function writeUsers(u: Stored[]) {
  localStorage.setItem(USERS_KEY, JSON.stringify(u));
}

export function getUser(): AuthUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function login(username: string, password: string): AuthUser | null {
  const users = readUsers();
  const found = users.find((u) => u.username === username && u.password === password);
  if (!found) return null;
  const user = { username: found.username, name: found.name };
  localStorage.setItem(KEY, JSON.stringify(user));
  window.dispatchEvent(new Event("neuroclear-auth"));
  return user;
}

export function register(username: string, password: string, name: string): AuthUser | null {
  const users = readUsers();
  if (users.some((u) => u.username === username)) return null;
  users.push({ username, password, name });
  writeUsers(users);
  const user = { username, name };
  localStorage.setItem(KEY, JSON.stringify(user));
  window.dispatchEvent(new Event("neuroclear-auth"));
  return user;
}

export function logout() {
  localStorage.removeItem(KEY);
  window.dispatchEvent(new Event("neuroclear-auth"));
}
