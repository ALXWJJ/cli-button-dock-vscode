import * as fs from "node:fs"
import * as path from "node:path"
import { BUTTON_IDS, RUNTIME_ICON_DIR, TITLE_BAR_RUNTIME_ICON_SLOTS } from "./constants"
import { AGENT_PRESETS, BRAND_ICON_OPTIONS, EMOJI_ICON_OPTIONS } from "./presets"

export const TITLE_BAR_CODICON_IDS = ["terminal", "settings", "debug-alt", "play", "add", "refresh"]

const PLACEHOLDER_RUNTIME_ICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>`

export function runtimeIconRelativePath(buttonId: string, slot = 0, theme: "light" | "dark" = "dark") {
  return `${RUNTIME_ICON_DIR}/button${buttonId}.${slot}.${theme}.svg`
}

export function faceCommandId(buttonId: string, slot: number) {
  return `cliButtonDock.button${buttonId}.face.${slot}`
}

/** @deprecated use faceCommandId */
export function customFaceCommandId(buttonId: string, slot: number) {
  return faceCommandId(buttonId, slot)
}

export function createRuntimeIconPlaceholders(rootDir: string) {
  const directory = path.join(rootDir, RUNTIME_ICON_DIR)
  fs.mkdirSync(directory, { recursive: true })
  for (const buttonId of BUTTON_IDS) {
    for (let slot = 0; slot < TITLE_BAR_RUNTIME_ICON_SLOTS; slot++) {
      for (const theme of ["light", "dark"] as const) {
        const filePath = path.join(directory, `button${buttonId}.${slot}.${theme}.svg`)
        if (!fs.existsSync(filePath)) {
          fs.writeFileSync(filePath, PLACEHOLDER_RUNTIME_ICON)
        }
      }
    }
  }
}

export function runtimeIconManifestEntry(buttonId: string, slot: number) {
  return {
    light: runtimeIconRelativePath(buttonId, slot, "light"),
    dark: runtimeIconRelativePath(buttonId, slot, "dark"),
  }
}

export function isTitleBarCustomIcon(icon: string) {
  const raw = icon.trim()
  const lower = raw.toLowerCase()
  return lower.startsWith("http://")
    || lower.startsWith("https://")
    || lower.startsWith("data:image/")
    || /^(?:<\?xml[\s\S]*?\?>\s*)?<svg\b/i.test(raw)
}

export function iconFaceSuffix(iconId: string) {
  if (iconId.startsWith("emoji:")) {
    const glyph = iconId.slice(6)
    const hex = [...glyph].map((ch) => ch.codePointAt(0)!.toString(16)).join("_")
    return `emoji_${hex}`
  }
  return iconId.replace(/:/g, "_").replace(/[^\w.]/g, "_")
}

export function getTitleBarIconIds() {
  const ids = new Set<string>()
  for (const brand of BRAND_ICON_OPTIONS) {
    ids.add(brand.id)
  }
  for (const emoji of EMOJI_ICON_OPTIONS) {
    ids.add(emoji.id)
  }
  for (const codicon of TITLE_BAR_CODICON_IDS) {
    ids.add(codicon)
  }
  return [...ids]
}

export function titleForIcon(iconId: string) {
  const preset = AGENT_PRESETS.find((item) => item.icon === iconId)
  if (preset) {
    return preset.label
  }
  const brand = BRAND_ICON_OPTIONS.find((item) => item.id === iconId)
  if (brand) {
    return brand.name
  }
  const emoji = EMOJI_ICON_OPTIONS.find((item) => item.id === iconId)
  if (emoji) {
    return emoji.name
  }
  return iconId
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
}

export function writeEmojiIconAsset(rootDir: string, emoji: { id: string; glyph: string }) {
  const suffix = iconFaceSuffix(emoji.id)
  const directory = path.join(rootDir, "media/generated")
  fs.mkdirSync(directory, { recursive: true })
  const fileName = `${suffix}.svg`
  const safeGlyph = escapeXml(emoji.glyph)
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><text x="12" y="19" text-anchor="middle" font-size="18" font-family="Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif">${safeGlyph}</text></svg>`
  fs.writeFileSync(path.join(directory, fileName), svg)
  return `media/generated/${fileName}`
}

export function emojiIconSvg(glyph: string) {
  const safeGlyph = escapeXml(glyph)
  return `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><text x="12" y="19" text-anchor="middle" font-size="18" font-family="Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif">${safeGlyph}</text></svg>`
}

export function codiconFallbackSvg() {
  return PLACEHOLDER_RUNTIME_ICON
}

export { PLACEHOLDER_RUNTIME_ICON }
