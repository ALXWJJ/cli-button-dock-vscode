import * as fs from "node:fs"
import * as path from "node:path"
import { BUTTON_IDS, TITLE_BAR_CONFIGURE_ORDER, TITLE_BAR_MENU_ORDER_BASE, TITLE_BAR_RUNTIME_ICON_SLOTS } from "../src/constants"
import { DEFAULT_BUTTONS } from "../src/presets"
import {
  createRuntimeIconPlaceholders,
  faceCommandId,
  runtimeIconManifestEntry,
} from "../src/title-bar"

const rootDir = path.join(import.meta.dir, "..")
const manifestPath = path.join(rootDir, "package.json")
createRuntimeIconPlaceholders(rootDir)

type PackageJson = {
  contributes?: {
    commands?: Array<Record<string, unknown>>
    menus?: Record<string, Array<Record<string, unknown>>>
  }
}

function buildFaceCommands() {
  const commands: Array<Record<string, unknown>> = []
  const titleMenus: Array<Record<string, unknown>> = []

  for (const [index, buttonId] of BUTTON_IDS.entries()) {
    const group = `navigation@${TITLE_BAR_MENU_ORDER_BASE + index}`
    const title = DEFAULT_BUTTONS[index]?.label || `Button ${buttonId}`
    for (let slot = 0; slot < TITLE_BAR_RUNTIME_ICON_SLOTS; slot++) {
      const command = faceCommandId(buttonId, slot)
      commands.push({
        command,
        title,
        icon: runtimeIconManifestEntry(buttonId, slot),
      })
      titleMenus.push({
        command,
        when: `cliButtonDock.button${buttonId}Enabled && cliButtonDock.button${buttonId}IconSlot == ${slot}`,
        group,
      })
    }
  }

  return { commands, titleMenus }
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8")) as PackageJson
const staticCommands = (manifest.contributes?.commands ?? []).filter((command) => {
  const id = typeof command.command === "string" ? command.command : ""
  return !id.match(/^cliButtonDock\.button\d{2}(\.face\.|$)/)
})

const { commands: faceCommands, titleMenus } = buildFaceCommands()
const staticTitleMenus = (manifest.contributes?.menus?.["editor/title"] ?? []).filter((entry) => {
  const command = typeof entry.command === "string" ? entry.command : ""
  return !command.match(/^cliButtonDock\.button\d{2}(\.face\.|$)/)
}).map((entry) => {
  if (entry.command === "cliButtonDock.configure") {
    return { ...entry, group: `navigation@${TITLE_BAR_CONFIGURE_ORDER}` }
  }
  return entry
})

const staticTitleContextMenus = (manifest.contributes?.menus?.["editor/title/context"] ?? []).map((entry) => {
  if (entry.command === "cliButtonDock.configure") {
    return { ...entry, group: `navigation@${TITLE_BAR_CONFIGURE_ORDER}` }
  }
  return entry
})

manifest.contributes ??= {}
manifest.contributes.commands = [...staticCommands, ...faceCommands]
manifest.contributes.menus ??= {}
manifest.contributes.menus["editor/title"] = [...titleMenus, ...staticTitleMenus]
manifest.contributes.menus["editor/title/context"] = staticTitleContextMenus

fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`)
console.log(`Synced ${faceCommands.length} title-bar face commands into package.json`)
