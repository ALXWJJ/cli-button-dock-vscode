import * as crypto from "node:crypto"
import * as fs from "node:fs"
import * as path from "node:path"
import * as vscode from "vscode"
import { CUSTOM_ICON_DIR, CUSTOM_ICON_MAX_BYTES, CUSTOM_ICON_MIME_EXTENSIONS, INLINE_SVG_PATTERN } from "./constants"
import { BRAND_ICON_OPTIONS, EMOJI_ICON_OPTIONS, normalizeIcon } from "./presets"
import { decodeDataImage, isCustomIcon, sanitizeSvg } from "./svg"
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
    console.warn("[Agent Action Dock] Unable to inspect custom icon cache", error)
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
  if (url.protocol !== "https:") {
    throw new Error("Custom image links must use HTTPS.")
  }

  const response = await fetch(url, { signal: AbortSignal.timeout(10_000) })
  if (!response.ok) {
    throw new Error(`The custom image link returned HTTP ${response.status}.`)
  }
  if (new URL(response.url).protocol !== "https:") {
    throw new Error("Custom image links cannot redirect to HTTP.")
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

async function ensureCustomIconAsset(context: vscode.ExtensionContext, icon: string) {
  const source = icon.trim()
  const cacheKey = getCustomIconCacheKey(source)
  const directory = path.join(context.extensionPath, CUSTOM_ICON_DIR)
  const cachedPath = getCachedCustomIconPath(directory, cacheKey)
  if (cachedPath) {
    return cachedPath
  }

  let prepared: PreparedCustomIcon
  if (INLINE_SVG_PATTERN.test(source)) {
    prepared = { bytes: Buffer.from(sanitizeSvg(source), "utf8"), extension: "svg" }
  } else if (/^data:image\//i.test(source)) {
    prepared = decodeDataImage(source)
  } else {
    prepared = await downloadCustomIcon(source)
  }

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
      console.warn("[Agent Action Dock] Unable to prepare emoji command icon", error)
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
    console.warn("[Agent Action Dock] Unable to prepare custom command icon", error)
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
      console.warn("[Agent Action Dock] Unable to prepare emoji terminal icon", error)
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
    console.warn("[Agent Action Dock] Unable to prepare custom terminal icon", error)
    return new vscode.ThemeIcon("terminal")
  }
}

export function getExtensionAssetUriForWebview(extensionUri: vscode.Uri, relativePath: string) {
  return getExtensionAssetUri(extensionUri, relativePath)
}
