import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url))
const extensionDirectory = path.resolve(scriptDirectory, "..")
const manifestPath = path.join(extensionDirectory, "package.json")
const buttonsPath = path.join(extensionDirectory, "buttons.json")

const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"))
const buttonFile = JSON.parse(fs.readFileSync(buttonsPath, "utf8"))
const buttons = buttonFile.buttons

if (!Array.isArray(buttons) || buttons.length === 0) {
  throw new Error("buttons.json must contain at least one button")
}

const ids = new Set()
for (const button of buttons) {
  if (!button || typeof button !== "object") {
    throw new Error("Each button must be an object")
  }
  if (!/^[a-z0-9][a-z0-9-]*$/.test(button.id)) {
    throw new Error(`Invalid button id: ${button.id}`)
  }
  if (ids.has(button.id)) {
    throw new Error(`Duplicate button id: ${button.id}`)
  }
  ids.add(button.id)
  if (!button.title || !button.command) {
    throw new Error(`Button ${button.id} requires title and command`)
  }
}

const generatedCommands = buttons.map((button) => ({
  command: `opencode.button.${button.id}`,
  title: button.title,
  ...(button.icon ? { icon: button.icon } : {}),
}))

manifest.contributes = manifest.contributes ?? {}
manifest.contributes.commands = [
  ...generatedCommands,
  {
    command: "opencode.addFilepathToTerminal",
    title: "Add Filepath to Terminal",
  },
]
manifest.contributes.menus = manifest.contributes.menus ?? {}
manifest.contributes.menus["editor/title"] = buttons.map((button, index) => ({
  command: `opencode.button.${button.id}`,
  group: `navigation@${index + 1}`,
}))
manifest.contributes.keybindings = [
  ...buttons
    .filter((button) => button.keybinding)
    .map((button) => ({
      command: `opencode.button.${button.id}`,
      title: button.title,
      key: button.keybinding,
    })),
  {
    command: "opencode.addFilepathToTerminal",
    title: "opencode: Insert At-Mentioned",
    key: "ctrl+alt+k",
    mac: "cmd+alt+k",
    win: "ctrl+alt+k",
    linux: "ctrl+alt+k",
  },
]

fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`)
console.log(`Generated ${buttons.length} editor-title buttons`)
