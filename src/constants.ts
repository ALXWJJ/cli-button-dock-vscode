export const CONFIGURATION_SECTION = "cliButtonDock"
export const CONFIGURATION_KEY = "buttons"
export const BUTTON_COUNT = 10
export const BUTTON_IDS = Array.from({ length: BUTTON_COUNT }, (_, index) => String(index + 1).padStart(2, "0"))
export const CUSTOM_ICON_DIR = "media/user-icons"
export const CUSTOM_ICON_MAX_BYTES = 1024 * 1024
export const CUSTOM_ICON_MIME_EXTENSIONS: Record<string, string> = {
  "image/svg+xml": "svg",
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/gif": "gif",
  "image/webp": "webp",
  "image/x-icon": "ico",
  "image/vnd.microsoft.icon": "ico",
}
export const INLINE_SVG_PATTERN = /^(?:<\?xml[\s\S]*?\?>\s*)?<svg\b/i
export const SLOT_EMOJIS: Record<string, string> = {
  "01": "1️⃣",
  "02": "2️⃣",
  "03": "3️⃣",
  "04": "4️⃣",
  "05": "5️⃣",
  "06": "6️⃣",
  "07": "7️⃣",
  "08": "8️⃣",
  "09": "9️⃣",
  "10": "🔟",
}
