"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useServerContext } from "@/lib/serverContext";
import { useT, type Dict } from "@/lib/i18n/useT";

const STRINGS: Dict<{ gateTitle: string; gateBody: string; upgrade: string }> = {
  tr: {
    gateTitle: "Kurumsal - ekip yönetimi",
    gateBody:
      "Sunucuna birden fazla yönetici eklemek, taramaları ve tespitleri birlikte yönetmek için Enterprise planına geçmen gerekiyor.",
    upgrade: "Enterprise'a yükselt",
  },
  en: {
    gateTitle: "Enterprise - team management",
    gateBody:
      "You need to be on the Enterprise plan to add multiple admins to your server and manage scans and detections together.",
    upgrade: "Upgrade to Enterprise",
  },
};

// Shared by every /team/* sub-page - redirects signed-out visitors to /setup (same as every
// other dashboard page) and shows the upsell screen for anyone not on Enterprise, instead of
// repeating this gate four times.
export default function EnterpriseGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { session, server, loading } = useServerContext();
  const t = useT(STRINGS);

  useEffect(() => {
    if (loading) return;
    if (!session) router.replace("/setup");
  }, [loading, session, router]);

  if (loading || !session) return null;

  if (server?.plan !== "Enterprise") {
    return (
      <div className="mx-auto max-w-lg py-16 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl border border-violet-800/60 bg-violet-950/30 text-violet-300">
          👥
        </div>
        <h1 className="mt-4 text-xl font-semibold text-white">{t.gateTitle}</h1>
        <p className="mt-2 text-sm text-zinc-400">{t.gateBody}</p>
        <Link
          href="/pricing"
          className="mt-6 inline-block rounded-md bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500"
        >
          {t.upgrade}
        </Link>
      </div>
    );
  }

  return <>{children}</>;
}
