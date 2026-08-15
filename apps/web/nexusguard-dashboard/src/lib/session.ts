export interface ServerSession {
  userId: string;
  serverId: string;
  serverName: string;
  apiKey: string;
}

const STORAGE_KEY = "nexusguard.session";

export function loadSession(): ServerSession | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as ServerSession;
  } catch {
    return null;
  }
}

export function saveSession(session: ServerSession) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

export function updateApiKey(apiKey: string) {
  const current = loadSession();
  if (!current) return;
  saveSession({ ...current, apiKey });
}

export function updateServerName(serverName: string) {
  const current = loadSession();
  if (!current) return;
  saveSession({ ...current, serverName });
}

export function clearSession() {
  window.localStorage.removeItem(STORAGE_KEY);
}
