import { deBundle } from "./bundles/de"
import { enBundle } from "./bundles/en"
import { esBundle } from "./bundles/es"
import { frBundle } from "./bundles/fr"
import { itBundle } from "./bundles/it"
import { jaBundle } from "./bundles/ja"
import { koBundle } from "./bundles/ko"
import { ptBrBundle } from "./bundles/pt-br"
import { ruBundle } from "./bundles/ru"
import { zhCnBundle } from "./bundles/zh-cn"
import { zhTwBundle } from "./bundles/zh-tw"
import { normalizeLocale } from "./resolve"
import type { LocaleBundle, SupportedLocale } from "./types"

const bundles: Record<SupportedLocale, LocaleBundle> = {
  en: enBundle,
  "zh-cn": zhCnBundle,
  "zh-tw": zhTwBundle,
  ja: jaBundle,
  ko: koBundle,
  de: deBundle,
  fr: frBundle,
  es: esBundle,
  "pt-br": ptBrBundle,
  ru: ruBundle,
  it: itBundle,
}

export function getLocaleBundle(language: string): LocaleBundle {
  return bundles[normalizeLocale(language)]
}
