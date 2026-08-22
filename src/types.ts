export type ButtonContext = "none" | "opencode"
export type ButtonCwd = "current" | "workspace" | "file"
export type ButtonIcon = string

export type ButtonConfig = {
  id: string
  enabled: boolean
  preset: string
  label: string
  icon: ButtonIcon
  command: string
  cwd: ButtonCwd
  context: ButtonContext
}

export type AgentPreset = Omit<ButtonConfig, "id" | "enabled" | "preset">
export type AgentPresetDefinition = AgentPreset & { id: string; name: string }

export type BrandIconDefinition = {
  id: string
  name: string
  light: string
  dark: string
  root?: string
}

export type EmojiIconDefinition = {
  id: string
  name: string
  glyph: string
}

export type ActiveContext = {
  workspaceFolder?: string
  file?: string
  relativeFile?: string
  fileRef?: string
  selection?: string
  lineStart?: string
  lineEnd?: string
}

export type SaveButtons = (buttons: ButtonConfig[]) => Promise<void>
