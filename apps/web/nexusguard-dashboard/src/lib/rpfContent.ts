// Best-effort, purely descriptive classification of what an RPF archive likely contains -
// matched against its filename and the internal entry names the scanner read out of the
// archive's own table of contents. This is NOT a verdict: plenty of legitimate content (a
// road texture pack, a map prop set) shows up here too. Detection Engine's scored
// "illegal-rpf" list (exact known-bad names) is the only thing that actually affects risk.
const CONTENT_SIGNATURES: { pattern: RegExp; label: string }[] = [
  { pattern: /fast.?connect|vehiclelayouts/i, label: "Araca hızlı giriş/çıkış (Fast Connect)" },
  { pattern: /stamina|fall.?damage/i, label: "Düşme hasarı / stamina değişikliği" },
  { pattern: /ragdoll/i, label: "Ragdoll değişikliği" },
  { pattern: /recoil/i, label: "Geri tepme (recoil) değişikliği" },
  { pattern: /infinite.?ammo|unlimited.?ammo/i, label: "Sınırsız mühimmat" },
  { pattern: /handling\.meta|handling\.xml/i, label: "Araç sürüş/handling değişikliği" },
  { pattern: /weapon/i, label: "Silah değişikliği" },
  { pattern: /playerinfo|ped\.meta|pedmeta/i, label: "Karakter/oyuncu verisi değişikliği" },
  { pattern: /\.ymap|mlo|road|map/i, label: "Harita/dünya değişikliği" },
  { pattern: /vehicle|car\.meta|carcols/i, label: "Araç ile ilgili içerik" },
];

export function classifyRpfContent(name: string, entries: string[]): string {
  const haystack = [name, ...entries].join(" ");
  const match = CONTENT_SIGNATURES.find((s) => s.pattern.test(haystack));
  if (match) return match.label;
  if (entries.length > 0) return `Bilinmeyen içerik (${entries.length} öğe)`;
  return "İçerik okunamadı (desteklenmeyen/şifreli format)";
}
