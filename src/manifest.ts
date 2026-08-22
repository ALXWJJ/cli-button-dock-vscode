import * as fs from "node:fs"
import * as path from "node:path"
import * as vscode from "vscode"
import { toManifestIcon } from "./icons"
import type { ButtonConfig } from "./types"

export async function syncManifest(context: vscode.ExtensionContext, buttons: ButtonConfig[]) {
  const manifestPath = path.join(context.extensionPath, "package.json")
  try {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8")) as {
      contributes?: {
        commands?: Array<Record<string, unknown>>
        menus?: Record<string, Array<Record<string, unknown>>>
      }
    }
    const before = JSON.stringify(manifest)
    const buttonById = new Map(buttons.map((button) => [button.id, button]))

    if (manifest.contributes?.commands) {
      manifest.contributes.commands = await Promise.all(manifest.contributes.commands.map(async (command) => {
        const commandId = typeof command.command === "string" ? command.command : ""
        const buttonId = commandId.match(/^cliButtonDock\.button(\d{2})$/)?.[1]
        const button = buttonId ? buttonById.get(buttonId) : undefined
        if (!button) {
          return command
        }
        return {
          ...command,
          title: button.label,
          icon: await toManifestIcon(context, button.icon),
        }
      }))
    }

    if (manifest.contributes?.menus?.["editor/title"]) {
      const titleMenus = manifest.contributes.menus["editor/title"]
      const configureEntry = titleMenus.find((entry) => entry.command === "cliButtonDock.configure") ?? {
        command: "cliButtonDock.configure",
        group: "navigation@99",
      }
      manifest.contributes.menus["editor/title"] = [
        ...buttons.map((button, index) => ({
          command: `cliButtonDock.button${button.id}`,
          when: `cliButtonDock.button${button.id}Enabled`,
          group: `navigation@${index + 1}`,
        })),
        configureEntry,
      ]
    }

    const after = JSON.stringify(manifest)
    if (before === after) {
      return false
    }
    fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`)
    return true
  } catch (error) {
    console.error("[Cli Button Dock] Unable to update package.json", error)
    return false
  }
}
