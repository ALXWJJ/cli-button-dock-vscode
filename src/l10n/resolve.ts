import type { SupportedLocale } from "./types"

const LOCALE_ALIASES: Record<string, SupportedLocale> = {
  en: "en",
  "en-us": "en",
  "en-gb": "en",
  "zh-cn": "zh-cn",
  "zh-hans": "zh-cn",
  "zh-sg": "zh-cn",
  "zh-tw": "zh-tw",
  "zh-hk": "zh-tw",
  "zh-mo": "zh-tw",
  "zh-hant": "zh-tw",
  ja: "ja",
  ko: "ko",
  de: "de",
  fr: "fr",
  es: "es",
  "pt-br": "pt-br",
  pt: "pt-br",
  ru: "ru",
  it: "it",
}

export function normalizeLocale(language: string): SupportedLocale {
  const normalized = language.trim().toLowerCase().replaceAll("_", "-")
  if (normalized in LOCALE_ALIASES) {
    return LOCALE_ALIASES[normalized]
  }

  const base = normalized.split("-", 1)[0]
  if (base === "zh") {
    return normalized.includes("tw") || normalized.includes("hk") || normalized.includes("hant")
      ? "zh-tw"
      : "zh-cn"
  }
  if (base in LOCALE_ALIASES) {
    return LOCALE_ALIASES[base]
  }
  return "en"
}

export function formatMessage(template: string, params: Record<string, string>) {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => params[key] ?? `{${key}}`)
}
