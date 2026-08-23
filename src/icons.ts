import * as crypto from "node:crypto"
import * as fs from "node:fs"
import * as path from "node:path"
import * as vscode from "vscode"
import { CUSTOM_ICON_DIR, CUSTOM_ICON_MAX_BYTES, CUSTOM_ICON_MIME_EXTENSIONS, INLINE_SVG_PATTERN, TITLE_BAR_RUNTIME_ICON_SLOTS } from "./constants"
import { BRAND_ICON_OPTIONS, EMOJI_ICON_OPTIONS, normalizeIcon } from "./presets"
import { decodeDataImage, isCustomIcon, sanitizeSvg } from "./svg"
import { isTitleBarCustomIcon, runtimeIconRelativePath } from "./title-bar"
import type { BrandIconDefinition, EmojiIconDefinition } from "./types"

export { isCustomIcon, sanitizeSvg, decodeDataImage }

type PreparedCustomIcon = {
  bytes: Buffer
  extension: string
}

function getCustomIconCacheKey(icon: string) {
  return crypto.createHash("sha256").update(icon.trim()).digest("hex").slice(0, 24)
}

function getCachedCustomIconPath(directory: string, cacheKey: string) {
  if (!fs.existsSync(directory)) {
    return undefined
  }

  try {
    const fileName = fs.readdirSync(directory).find((entry) => {
      if (!entry.startsWith(`${cacheKey}.`)) {
        return false
      }
      return fs.statSync(path.join(directory, entry)).isFile()
    })
    return fileName ? `${CUSTOM_ICON_DIR}/${fileName}` : undefined
  } catch (error) {
    console.warn("[Cli Button Dock] Unable to inspect custom icon cache", error)
    return undefined
  }
}

function getImageExtensionFromPath(value: string) {
  try {
    const extension = path.extname(new URL(value).pathname).slice(1).toLowerCase()
    if (extension === "jpeg") {
      return "jpg"
    }
    return ["gif", "ico", "jpg", "png", "svg", "webp"].includes(extension) ? extension : undefined
  } catch {
    return undefined
  }
}

function validateCustomIconSize(bytes: Buffer) {
  if (bytes.length === 0) {
    throw new Error("The custom icon is empty.")
  }
  if (bytes.length > CUSTOM_ICON_MAX_BYTES) {
    throw new Error(`The custom icon is larger than ${CUSTOM_ICON_MAX_BYTES} bytes.`)
  }
}

async function downloadCustomIcon(value: string): Promise<PreparedCustomIcon> {
  const url = new URL(value)
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error("Custom image links must use HTTP or HTTPS.")
  }

  const response = await fetch(url, { signal: AbortSignal.timeout(10_000) })
  if (!response.ok) {
    throw new Error(`The custom image link returned HTTP ${response.status}.`)
  }
  if (url.protocol === "https:" && new URL(response.url).protocol !== "https:") {
    throw new Error("HTTPS image links cannot redirect to HTTP.")
  }

  const contentLength = Number(response.headers.get("content-length"))
  if (Number.isFinite(contentLength) && contentLength > CUSTOM_ICON_MAX_BYTES) {
    throw new Error(`The custom image is larger than ${CUSTOM_ICON_MAX_BYTES} bytes.`)
  }

  const bytes = Buffer.from(await response.arrayBuffer())
  validateCustomIconSize(bytes)
  const mimeType = response.headers.get("content-type")?.split(";", 1)[0].trim().toLowerCase()
  const extension = (mimeType && CUSTOM_ICON_MIME_EXTENSIONS[mimeType]) ?? getImageExtensionFromPath(value)
  if (!extension) {
    throw new Error("The custom image link must point to SVG, PNG, JPEG, GIF, WEBP, or ICO content.")
  }

  if (extension === "svg") {
    return { bytes: Buffer.from(sanitizeSvg(bytes.toString("utf8")), "utf8"), extension }
  }
  return { bytes, extension }
}

async function prepareCustomIconBytes(icon: string): Promise<PreparedCustomIcon> {
  const source = icon.trim()
  if (INLINE_SVG_PATTERN.test(source)) {
    return { bytes: Buffer.from(sanitizeSvg(source), "utf8"), extension: "svg" }
  }
  if (/^data:image\//i.test(source)) {
    return decodeDataImage(source)
  }
  return downloadCustomIcon(source)
}

export function customIconToTitleBarSvg(prepared: PreparedCustomIcon) {
  if (prepared.extension === "svg") {
    return sanitizeSvg(prepared.bytes.toString("utf8"))
  }
  const mime = prepared.extension === "jpg" ? "image/jpeg" : `image/${prepared.extension}`
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><image width="24" height="24" href="data:${mime};base64,${prepared.bytes.toString("base64")}"/></svg>`
}

const TITLE_BAR_ICON_SLOTS_KEY = "titleBarCustomIconSlots"

function loadTitleBarIconSlots(context: vscode.ExtensionContext) {
  const stored = context.globalState.get<Record<string, number>>(TITLE_BAR_ICON_SLOTS_KEY) ?? {}
  return new Map(Object.entries(stored))
}

async function saveTitleBarIconSlots(context: vscode.ExtensionContext, slots: Map<string, number>) {
  await context.globalState.update(TITLE_BAR_ICON_SLOTS_KEY, Object.fromEntries(slots))
}

function readRuntimeIconSvg(extensionPath: string, buttonId: string, slot: number) {
  try {
    return fs.readFileSync(path.join(extensionPath, runtimeIconRelativePath(buttonId, slot)), "utf8")
  } catch {
    return ""
  }
}

export async function syncTitleBarRuntimeIcon(
  context: vscode.ExtensionContext,
  buttonId: string,
  icon: string,
  slots: Map<string, number>,
): Promise<number | undefined> {
  const prepared = await prepareCustomIconBytes(icon)
  validateCustomIconSize(prepared.bytes)
  const svg = `${customIconToTitleBarSvg(prepared)}\n`
  const currentSlot = slots.get(buttonId) ?? 0
  const currentSvg = readRuntimeIconSvg(context.extensionPath, buttonId, currentSlot)
  if (currentSvg === svg) {
    return currentSlot
  }

  const nextSlot = (currentSlot + 1) % TITLE_BAR_RUNTIME_ICON_SLOTS
  const absolutePath = path.join(context.extensionPath, runtimeIconRelativePath(buttonId, nextSlot))
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true })
  fs.writeFileSync(absolutePath, svg)
  slots.set(buttonId, nextSlot)
  return nextSlot
}

export type TitleBarIconSyncResult = {
  syncedCustomIds: Set<string>
  customIconSlots: Map<string, number>
  errors: Array<{ buttonId: string; message: string }>
}

export async function syncTitleBarRuntimeIcons(
  context: vscode.ExtensionContext,
  buttons: import("./types").ButtonConfig[],
): Promise<TitleBarIconSyncResult> {
  const syncedCustomIds = new Set<string>()
  const customIconSlots = loadTitleBarIconSlots(context)
  const errors: Array<{ buttonId: string; message: string }> = []

  for (const button of buttons) {
    const icon = normalizeIcon(button.icon)
    if (!isTitleBarCustomIcon(icon)) {
      continue
    }
    try {
      const slot = await syncTitleBarRuntimeIcon(context, button.id, icon, customIconSlots)
      if (slot !== undefined) {
        syncedCustomIds.add(button.id)
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      errors.push({ buttonId: button.id, message })
      console.warn(`[Cli Button Dock] Unable to sync title-bar icon for button ${button.id}`, error)
    }
  }

  await saveTitleBarIconSlots(context, customIconSlots)
  return { syncedCustomIds, customIconSlots, errors }
}

async function ensureCustomIconAsset(context: vscode.ExtensionContext, icon: string) {
  const source = icon.trim()
  const cacheKey = getCustomIconCacheKey(source)
  const directory = path.join(context.extensionPath, CUSTOM_ICON_DIR)
  const cachedPath = getCachedCustomIconPath(directory, cacheKey)
  if (cachedPath) {
    return cachedPath
  }

  const prepared = await prepareCustomIconBytes(source)
  validateCustomIconSize(prepared.bytes)
  fs.mkdirSync(directory, { recursive: true })
  const fileName = `${cacheKey}.${prepared.extension}`
  fs.writeFileSync(path.join(directory, fileName), prepared.bytes)
  return `${CUSTOM_ICON_DIR}/${fileName}`
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
}

function ensureEmojiIconAsset(context: vscode.ExtensionContext, emoji: EmojiIconDefinition) {
  const cacheKey = getCustomIconCacheKey(emoji.id)
  const directory = path.join(context.extensionPath, CUSTOM_ICON_DIR)
  const cachedPath = getCachedCustomIconPath(directory, cacheKey)
  if (cachedPath) {
    return cachedPath
  }

  fs.mkdirSync(directory, { recursive: true })
  const safeGlyph = escapeXml(emoji.glyph)
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><text x="12" y="19" text-anchor="middle" font-size="18" font-family="Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif">${safeGlyph}</text></svg>`
  const fileName = `${cacheKey}.svg`
  fs.writeFileSync(path.join(directory, fileName), svg)
  return `${CUSTOM_ICON_DIR}/${fileName}`
}

function toCodicon(icon: string) {
  return icon.startsWith("$(") ? icon : `$(${icon})`
}

export function getBrandIcon(icon: string) {
  return BRAND_ICON_OPTIONS.find((item) => item.id === normalizeIcon(icon))
}

export function getEmojiIcon(icon: string) {
  return EMOJI_ICON_OPTIONS.find((item) => item.id === normalizeIcon(icon))
}

export function getBrandAssetPath(brand: BrandIconDefinition, theme: "light" | "dark") {
  const fileName = theme === "light" ? brand.light : brand.dark
  return `${brand.root ?? "media/brands"}/${fileName}`
}

function getExtensionAssetUri(extensionUri: vscode.Uri, relativePath: string) {
  return vscode.Uri.joinPath(extensionUri, ...relativePath.split("/"))
}

export async function toManifestIcon(context: vscode.ExtensionContext, icon: string) {
  const brand = getBrandIcon(icon)
  if (brand) {
    return {
      light: getBrandAssetPath(brand, "light"),
      dark: getBrandAssetPath(brand, "dark"),
    }
  }

  const emoji = getEmojiIcon(icon)
  if (emoji) {
    try {
      const emojiPath = ensureEmojiIconAsset(context, emoji)
      return { light: emojiPath, dark: emojiPath }
    } catch (error) {
      console.warn("[Cli Button Dock] Unable to prepare emoji command icon", error)
      return toCodicon("terminal")
    }
  }

  if (!isCustomIcon(icon)) {
    return toCodicon(icon)
  }

  try {
    const customPath = await ensureCustomIconAsset(context, icon)
    return { light: customPath, dark: customPath }
  } catch (error) {
    console.warn("[Cli Button Dock] Unable to prepare custom command icon", error)
    return toCodicon("terminal")
  }
}

export async function getTerminalIconPath(extensionContext: vscode.ExtensionContext, icon: string) {
  const brand = getBrandIcon(icon)
  if (brand) {
    return {
      light: getExtensionAssetUri(extensionContext.extensionUri, getBrandAssetPath(brand, "light")),
      dark: getExtensionAssetUri(extensionContext.extensionUri, getBrandAssetPath(brand, "dark")),
    }
  }

  const emoji = getEmojiIcon(icon)
  if (emoji) {
    try {
      const emojiPath = ensureEmojiIconAsset(extensionContext, emoji)
      const emojiUri = getExtensionAssetUri(extensionContext.extensionUri, emojiPath)
      return { light: emojiUri, dark: emojiUri }
    } catch (error) {
      console.warn("[Cli Button Dock] Unable to prepare emoji terminal icon", error)
      return new vscode.ThemeIcon("terminal")
    }
  }

  if (!isCustomIcon(icon)) {
    return new vscode.ThemeIcon(normalizeIcon(icon))
  }

  try {
    const customPath = await ensureCustomIconAsset(extensionContext, icon)
    const customUri = getExtensionAssetUri(extensionContext.extensionUri, customPath)
    return { light: customUri, dark: customUri }
  } catch (error) {
    console.warn("[Cli Button Dock] Unable to prepare custom terminal icon", error)
    return new vscode.ThemeIcon("terminal")
  }
}

export function getExtensionAssetUriForWebview(extensionUri: vscode.Uri, relativePath: string) {
  return getExtensionAssetUri(extensionUri, relativePath)
}
