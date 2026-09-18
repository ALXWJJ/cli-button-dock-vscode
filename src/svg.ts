import { CUSTOM_ICON_MAX_BYTES, CUSTOM_ICON_MIME_EXTENSIONS } from "./constants"

type PreparedCustomIcon = {
  bytes: Buffer
  extension: string
}

export function extractSvg(value: string) {
  const trimmed = value.trim().replace(/^\uFEFF/, "")
  const start = trimmed.search(/<svg\b/i)
  if (start < 0) {
    return undefined
  }

  const rest = trimmed.slice(start)
  const close = rest.match(/<\/svg>/i)
  if (!close || close.index === undefined) {
    return undefined
  }

  return rest.slice(0, close.index + close[0].length)
}

export function containsInlineSvg(value: string) {
  return Boolean(extractSvg(value))
}

export function isCustomIcon(icon: string) {
  const value = icon.trim()
  return /^(?:https?:\/\/|data:image\/)/i.test(value) || containsInlineSvg(value)
}

function validateCustomIconSize(bytes: Buffer) {
  if (bytes.length === 0) {
    throw new Error("The custom icon is empty.")
  }
  if (bytes.length > CUSTOM_ICON_MAX_BYTES) {
    throw new Error(`The custom icon is larger than ${CUSTOM_ICON_MAX_BYTES} bytes.`)
  }
}

function stripUnsafeHrefs(svg: string) {
  return svg.replace(/\s+(?:href|xlink:href)\s*=\s*("|')([^"']*)\1/gi, (full, _quote, url: string) => {
    const value = url.trim()
    if (value.startsWith("#") || /^data:image\//i.test(value)) {
      return full
    }
    return ""
  })
}

function stripDangerousElements(svg: string) {
  return svg
    .replace(/<(?:script|foreignObject|iframe|object|embed)\b[^>]*>[\s\S]*?<\/(?:script|foreignObject|iframe|object|embed)>/gi, "")
    .replace(/<(?:script|foreignObject|iframe|object|embed)\b[^>]*\/>/gi, "")
}

function ensureSvgRoot(svg: string) {
  let next = svg.trim()
  if (!/\sxmlns\s*=/.test(next)) {
    next = next.replace(/<svg\b/i, '<svg xmlns="http://www.w3.org/2000/svg"')
  }
  if (!/\sviewBox\s*=/i.test(next) && !/\s(?:width|height)\s*=/i.test(next)) {
    next = next.replace(/<svg\b/i, '<svg viewBox="0 0 24 24"')
  }
  return next
}

export function sanitizeSvg(value: string) {
  const svg = extractSvg(value)
  if (!svg) {
    throw new Error("Custom SVG icons must contain an <svg> element.")
  }
  if (Buffer.byteLength(svg, "utf8") > CUSTOM_ICON_MAX_BYTES) {
    throw new Error(`The custom SVG is larger than ${CUSTOM_ICON_MAX_BYTES} bytes.`)
  }

  const cleaned = stripUnsafeHrefs(
    stripDangerousElements(
      svg
        .replace(/\son[a-z][\w:-]*\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "")
        .replace(/(?:javascript:|vbscript:|data:text\/html)/gi, ""),
    ),
  )

  return ensureSvgRoot(cleaned)
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
