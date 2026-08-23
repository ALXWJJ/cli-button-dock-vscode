import { CUSTOM_ICON_MAX_BYTES, CUSTOM_ICON_MIME_EXTENSIONS, INLINE_SVG_PATTERN } from "./constants"

type PreparedCustomIcon = {
  bytes: Buffer
  extension: string
}

export function isCustomIcon(icon: string) {
  const value = icon.trim()
  return /^(?:https?:\/\/|data:image\/)/i.test(value) || INLINE_SVG_PATTERN.test(value)
}

function validateCustomIconSize(bytes: Buffer) {
  if (bytes.length === 0) {
    throw new Error("The custom icon is empty.")
  }
  if (bytes.length > CUSTOM_ICON_MAX_BYTES) {
    throw new Error(`The custom icon is larger than ${CUSTOM_ICON_MAX_BYTES} bytes.`)
  }
}

export function sanitizeSvg(value: string) {
  const svg = value.trim()
  if (!INLINE_SVG_PATTERN.test(svg)) {
    throw new Error("Custom SVG icons must contain an <svg> element.")
  }
  if (Buffer.byteLength(svg, "utf8") > CUSTOM_ICON_MAX_BYTES) {
    throw new Error(`The custom SVG is larger than ${CUSTOM_ICON_MAX_BYTES} bytes.`)
  }
  if (/<\/?(?:script|foreignObject|iframe|object|embed)\b/i.test(svg)) {
    throw new Error("Custom SVG icons cannot contain script or embedded document elements.")
  }
  if (/(?:javascript:|vbscript:|data:text\/html)/i.test(svg)) {
    throw new Error("Custom SVG icons cannot contain executable or HTML data URLs.")
  }

  return svg
    .replace(/\son[a-z][\w:-]*\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/\s+(?:href|xlink:href)\s*=\s*("|')(?!data:image\/)[^"']*\1/gi, "")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "")
}

export function decodeDataImage(value: string): PreparedCustomIcon {
  const match = value.match(/^data:(image\/[^;,]+)(;[^,]*)?,([\s\S]*)$/i)
  if (!match) {
    throw new Error("Custom data images must use an image MIME type.")
  }

  const mimeType = match[1].toLowerCase()
  const extension = CUSTOM_ICON_MIME_EXTENSIONS[mimeType]
  if (!extension) {
    throw new Error(`Unsupported custom image type: ${mimeType}`)
  }

  const metadata = match[2] ?? ""
  let bytes: Buffer
  try {
    bytes = metadata.toLowerCase().includes(";base64")
      ? Buffer.from(match[3].replace(/\s/g, ""), "base64")
      : Buffer.from(decodeURIComponent(match[3]), "utf8")
  } catch {
    throw new Error("The custom data image could not be decoded.")
  }

  if (extension === "svg") {
    bytes = Buffer.from(sanitizeSvg(bytes.toString("utf8")), "utf8")
  }
  validateCustomIconSize(bytes)
  return { bytes, extension }
}
