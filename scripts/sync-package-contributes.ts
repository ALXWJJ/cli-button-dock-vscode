import * as fs from "node:fs"
import * as path from "node:path"
import { BUTTON_IDS, TITLE_BAR_RUNTIME_ICON_SLOTS } from "../src/constants"
import {
  createRuntimeIconPlaceholders,
  customFaceCommandId,
  faceCommandId,
  getTitleBarIconIds,
  manifestIconEntry,
  runtimeIconManifestEntry,
  titleForIcon,
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
  const iconIds = getTitleBarIconIds()

  for (const [index, buttonId] of BUTTON_IDS.entries()) {
    const group = `navigation@${index + 1}`
    for (const iconId of iconIds) {
      const command = faceCommandId(buttonId, iconId)
      const entry: Record<string, unknown> = {
        command,
        title: titleForIcon(iconId),
        icon: manifestIconEntry(rootDir, iconId),
      }
      commands.push(entry)
      titleMenus.push({
        command,
        when: `cliButtonDock.button${buttonId}Enabled && cliButtonDock.button${buttonId}Icon == '${iconId.replace(/'/g, "\\'")}'`,
        group,
      })
    }

    for (let slot = 0; slot < TITLE_BAR_RUNTIME_ICON_SLOTS; slot++) {
      const customCommand = customFaceCommandId(buttonId, slot)
      commands.push({
        command: customCommand,
        title: "Custom icon",
        icon: runtimeIconManifestEntry(buttonId, slot),
      })
      titleMenus.push({
        command: customCommand,
        when: `cliButtonDock.button${buttonId}Enabled && cliButtonDock.button${buttonId}IconCustom && cliButtonDock.button${buttonId}IconCustomSlot == ${slot}`,
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
})

manifest.contributes ??= {}
manifest.contributes.commands = [...staticCommands, ...faceCommands]
manifest.contributes.menus ??= {}
manifest.contributes.menus["editor/title"] = [...titleMenus, ...staticTitleMenus]

fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`)
console.log(`Synced ${faceCommands.length} title-bar face commands into package.json`)
