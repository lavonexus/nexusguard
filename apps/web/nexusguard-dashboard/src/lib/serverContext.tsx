"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { getCurrentUser, getServer, type ServerResponse, type UserResponse } from "@/lib/api";
import { loadSession, type ServerSession } from "@/lib/session";

interface ServerContextValue {
  session: ServerSession | null;
  server: ServerResponse | null;
  user: UserResponse | null;
  loading: boolean;
  refresh: () => void;
}

const ServerContext = createContext<ServerContextValue>({
  session: null,
  server: null,
  user: null,
  loading: true,
  refresh: () => {},
});

// Shared across the sidebar (plan badge, admin panel link), plan-gated pages, and the pricing
// page - one fetch instead of one per page, and everyone re-renders together when refresh() is
// called after a plan change. `user` is the logged-in dashboard session's own account (not the
// server) - null until/unless they've signed in with Discord or Google, which is also how the
// sidebar knows whether to show the site-admin-only "Yönetici Paneli" link.
export function ServerProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<ServerSession | null>(null);
  const [server, setServer] = useState<ServerResponse | null>(null);
  const [user, setUser] = useState<UserResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    const s = loadSession();
    setSession(s);

    getCurrentUser()
      .then(setUser)
      .catch(() => setUser(null));

    if (!s) {
      setServer(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    getServer(s.apiKey, s.serverId)
      .then(setServer)
      .catch(() => setServer(null))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <ServerContext.Provider value={{ session, server, user, loading, refresh: load }}>
      {children}
    </ServerContext.Provider>
  );
}

export function useServerContext() {
  return useContext(ServerContext);
}
