"use client";

import { Fragment } from "react";
import { useT, type Dict } from "@/lib/i18n/useT";

type Cell = boolean | string;

interface Row {
  label: string;
  free: Cell;
  pro: Cell;
  proDuo: Cell;
  enterprise: Cell;
}

interface Group {
  title: string;
  rows: Row[];
}

// Every technical row here is a real, verified gate in the API - not aspirational copy. See
// ScansController (daily scan cap), MarketplaceController/ServersController.UpdateTheme (Tool
// Designer save + marketplace install require a paid plan), ServersController.AddMember
// (Enterprise-only team panel). AI summary generation has no plan check anywhere, so it's
// listed as included on every plan rather than repeating the site's old Pro-only claim. The
// support-level rows (Destek/Support, scan-interpretation help) are service commitments, not
// code-enforced gates - kept honest by being framed as support quality, not scan behavior.
const GROUPS: Dict<Group[]> = {
  tr: [
    {
      title: "Tarama ve Tespit",
      rows: [
        { label: "Server-side Detection Engine", free: true, pro: true, proDuo: true, enterprise: true },
        { label: "YARA imza taraması", free: true, pro: true, proDuo: true, enterprise: true },
        { label: "Discord bot entegrasyonu", free: true, pro: true, proDuo: true, enterprise: true },
        { label: "Günlük tarama sınırı", free: "1/gün", pro: "Sınırsız", proDuo: "Sınırsız", enterprise: "Sınırsız" },
        { label: "Yapay zeka destekli risk özeti", free: true, pro: true, proDuo: true, enterprise: true },
      ],
    },
    {
      title: "Özelleştirme",
      rows: [
        { label: "Tool Designer (önizleme)", free: true, pro: true, proDuo: true, enterprise: true },
        { label: "Tool Designer kaydetme", free: false, pro: true, proDuo: true, enterprise: true },
        { label: "Mağazadan tasarım yükleme", free: false, pro: true, proDuo: true, enterprise: true },
      ],
    },
    {
      title: "Ekip ve Destek",
      rows: [
        { label: "Yönetici hesabı", free: "1", pro: "1", proDuo: "2", enterprise: "5+" },
        { label: "Kurumsal ekip paneli (üye ekle/çıkar, yönetici rolü)", free: false, pro: false, proDuo: false, enterprise: true },
        { label: "Destek", free: "Standart", pro: "Öncelikli", proDuo: "7/24", enterprise: "Özel" },
        { label: "Tarama sonucu yorumlama desteği", free: false, pro: false, proDuo: true, enterprise: true },
      ],
    },
  ],
  en: [
    {
      title: "Scanning & Detection",
      rows: [
        { label: "Server-side Detection Engine", free: true, pro: true, proDuo: true, enterprise: true },
        { label: "YARA signature scanning", free: true, pro: true, proDuo: true, enterprise: true },
        { label: "Discord bot integration", free: true, pro: true, proDuo: true, enterprise: true },
        { label: "Daily scan limit", free: "1/day", pro: "Unlimited", proDuo: "Unlimited", enterprise: "Unlimited" },
        { label: "AI-powered risk summary", free: true, pro: true, proDuo: true, enterprise: true },
      ],
    },
    {
      title: "Customization",
      rows: [
        { label: "Tool Designer (preview)", free: true, pro: true, proDuo: true, enterprise: true },
        { label: "Tool Designer saving", free: false, pro: true, proDuo: true, enterprise: true },
        { label: "Install designs from the marketplace", free: false, pro: true, proDuo: true, enterprise: true },
      ],
    },
    {
      title: "Team & Support",
      rows: [
        { label: "Admin accounts", free: "1", pro: "1", proDuo: "2", enterprise: "5+" },
        { label: "Enterprise team panel (add/remove, manager role)", free: false, pro: false, proDuo: false, enterprise: true },
        { label: "Support", free: "Standard", pro: "Priority", proDuo: "24/7", enterprise: "Dedicated" },
        { label: "Scan result interpretation help", free: false, pro: false, proDuo: true, enterprise: true },
      ],
    },
  ],
};

const STRINGS: Dict<{ title: string; subtitle: string; feature: string }> = {
  tr: { title: "Tüm özellikleri karşılaştır", subtitle: "Her planda tam olarak ne aldığını gör", feature: "Özellik" },
  en: { title: "Compare all features", subtitle: "See exactly what you get on each plan", feature: "Feature" },
};

function CellValue({ value }: { value: Cell }) {
  if (typeof value === "boolean") {
    return value ? (
      <span className="text-violet-400" aria-label="included">✓</span>
    ) : (
      <span className="text-zinc-700" aria-label="not included">—</span>
    );
  }
  return <span className="text-zinc-300">{value}</span>;
}

export default function FeatureComparisonTable() {
  const groups = useT(GROUPS);
  const t = useT(STRINGS);

  return (
    <div className="mt-24">
      <h2 className="text-center text-2xl font-semibold text-white sm:text-3xl">{t.title}</h2>
      <p className="mx-auto mt-3 max-w-lg text-center text-sm text-zinc-400">{t.subtitle}</p>

      <div className="mt-10 overflow-x-auto rounded-xl border border-zinc-800">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-800 bg-zinc-900/60">
              <th className="px-4 py-3 font-medium text-zinc-400">{t.feature}</th>
              <th className="px-4 py-3 font-medium text-zinc-400">Free</th>
              <th className="px-4 py-3 font-medium text-zinc-400">Pro</th>
              <th className="px-4 py-3 font-medium text-zinc-400">Professional</th>
              <th className="px-4 py-3 font-medium text-violet-300">Enterprise</th>
            </tr>
          </thead>
          <tbody>
            {groups.map((group) => (
              <Fragment key={group.title}>
                <tr className="border-b border-zinc-800 bg-zinc-900/30">
                  <th colSpan={5} className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    {group.title}
                  </th>
                </tr>
                {group.rows.map((row) => (
                  <tr key={row.label} className="border-b border-zinc-900">
                    <td className="px-4 py-3 text-zinc-300">{row.label}</td>
                    <td className="px-4 py-3">
                      <CellValue value={row.free} />
                    </td>
                    <td className="px-4 py-3">
                      <CellValue value={row.pro} />
                    </td>
                    <td className="px-4 py-3">
                      <CellValue value={row.proDuo} />
                    </td>
                    <td className="px-4 py-3">
                      <CellValue value={row.enterprise} />
                    </td>
                  </tr>
                ))}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
