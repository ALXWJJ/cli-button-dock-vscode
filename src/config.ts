import * as vscode from "vscode"
import { BUTTON_IDS, CONFIGURATION_KEY, CONFIGURATION_SECTION } from "./constants"
import {
  DEFAULT_BUTTONS,
  compactButtonsForStorage,
  getConfiguredEntry,
  normalizeButton,
  normalizeButtons,
  normalizeIcon,
} from "./presets"
import { isTitleBarCustomIcon } from "./title-bar"
import type { ButtonConfig } from "./types"

export { normalizeButtons }

export function loadButtons(): ButtonConfig[] {
  const configured = vscode.workspace.getConfiguration(CONFIGURATION_SECTION).get<unknown>(CONFIGURATION_KEY)
  const entries = Array.isArray(configured) ? configured : []
  return BUTTON_IDS.map((id, index) => normalizeButton(getConfiguredEntry(entries, id), DEFAULT_BUTTONS[index], id))
}

export async function updateButtonContexts(buttons: ButtonConfig[], customIconSlots?: Map<string, number>) {
  const updates = buttons.flatMap((button) => {
    const icon = normalizeIcon(button.icon)
    const isCustom = isTitleBarCustomIcon(icon)
    return [
      vscode.commands.executeCommand("setContext", `cliButtonDock.button${button.id}Enabled`, button.enabled),
      vscode.commands.executeCommand("setContext", `cliButtonDock.button${button.id}Icon`, icon),
      vscode.commands.executeCommand("setContext", `cliButtonDock.button${button.id}IconCustom`, isCustom),
      vscode.commands.executeCommand(
        "setContext",
        `cliButtonDock.button${button.id}IconCustomSlot`,
        isCustom ? (customIconSlots?.get(button.id) ?? 0) : undefined,
      ),
    ]
  })
  await Promise.all(updates)
}

export async function saveButtons(buttons: ButtonConfig[]) {
  const stored = compactButtonsForStorage(buttons)
  await vscode.workspace
    .getConfiguration(CONFIGURATION_SECTION)
    .update(
      CONFIGURATION_KEY,
      stored.length > 0 ? stored : undefined,
      vscode.ConfigurationTarget.Global,
    )
}
