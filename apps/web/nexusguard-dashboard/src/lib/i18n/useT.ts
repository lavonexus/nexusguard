import { useLocale, type Locale } from "@/lib/i18n/LocaleContext";

export type Dict<T> = Record<Locale, T>;

// Each page/component defines its own `{ tr: {...}, en: {...} }` dictionary next to the
// JSX that uses it (see plan: not a single global translation-key file - co-locating
// keeps ~20 largely-unrelated pages easy to keep in sync).
export function useT<T>(dict: Dict<T>): T {
  const { locale } = useLocale();
  return dict[locale];
}
