"use client";

import { useCallback, useEffect, useState } from "react";
import { listMembers, type ServerMemberResponse } from "@/lib/api";
import { useServerContext } from "@/lib/serverContext";

// Shared by every Kurumsal sub-page that needs to know the caller's own role. The API key is
// shared across every joined member (see PendingMembershipBanner), so it can't stand in for
// "who is this" - the caller's role has to be read off their own row in the member roster,
// same pattern team/page.tsx established.
export function useEnterpriseRole() {
  const { session, server, loading: contextLoading } = useServerContext();
  const [members, setMembers] = useState<ServerMemberResponse[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(() => {
    if (!session || server?.plan !== "Enterprise") return;
    listMembers(session.apiKey, session.serverId)
      .then(setMembers)
      .catch(() => setError("apiUnreachable"));
  }, [session, server]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const myRole = members?.find((m) => m.userId === session?.userId)?.role;
  const isOwner = myRole === "Owner";
  const canManage = isOwner || myRole === "Manager";

  return {
    loading: contextLoading || (server?.plan === "Enterprise" && members === null),
    members,
    error,
    isOwner,
    canManage,
    refresh,
  };
}
