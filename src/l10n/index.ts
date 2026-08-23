import * as vscode from "vscode"
import { formatMessage } from "./resolve"
import { getLocaleBundle } from "./registry"
import type { ConfiguratorStrings } from "./types"

export type { ConfiguratorStrings }

export function getLanguage() {
  return vscode.env.language
}

export function getConfiguratorStrings(language = getLanguage()): ConfiguratorStrings {
  return getLocaleBundle(language).configurator
}

export function getEmojiDisplayName(emojiId: string, language = getLanguage()) {
  const bundle = getLocaleBundle(language)
  return bundle.emojiNames[emojiId] ?? getLocaleBundle("en").emojiNames[emojiId] ?? emojiId.replace(/^emoji:/, "")
}

export function tConfigureCommandFirst(label: string, language = getLanguage()) {
  return formatMessage(getLocaleBundle(language).messages.configureCommandFirst, { label })
}

export { SUPPORTED_LOCALES } from "./types"
export { normalizeLocale } from "./resolve"
export { getLocaleBundle } from "./registry"
