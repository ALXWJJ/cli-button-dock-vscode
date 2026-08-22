import * as vscode from "vscode"
import { BUTTON_IDS, CONFIGURATION_KEY, CONFIGURATION_SECTION } from "./constants"
import {
  DEFAULT_BUTTONS,
  getConfiguredEntry,
  normalizeButton,
  normalizeButtons,
  normalizeIcon,
  normalizePresetIcon,
} from "./presets"
import type { ButtonConfig } from "./types"

export { normalizeButtons }

export function loadButtons(): ButtonConfig[] {
  const configured = vscode.workspace.getConfiguration(CONFIGURATION_SECTION).get<unknown>(CONFIGURATION_KEY)
  const entries = Array.isArray(configured) ? configured : []
  return BUTTON_IDS.map((id, index) => normalizeButton(getConfiguredEntry(entries, id, index), DEFAULT_BUTTONS[index], id))
}

export async function migrateLegacyPresetIcons(buttons: ButtonConfig[]) {
  const configuration = vscode.workspace.getConfiguration(CONFIGURATION_SECTION)
  const configured = configuration.get<unknown>(CONFIGURATION_KEY)
  if (!Array.isArray(configured)) {
    return
  }
  const needsMigration = configured.some((entry, index) => {
    const record = entry && typeof entry === "object" ? entry as Record<string, unknown> : undefined
    if (!record || typeof record.icon !== "string") {
      return false
    }
    const id = typeof record.id === "string" ? record.id : BUTTON_IDS[index]
    const fallback = DEFAULT_BUTTONS.find((button) => button.id === id)
    const preset = typeof record.preset === "string" && record.preset.trim()
      ? record.preset.trim()
      : fallback?.preset ?? "custom"
    const icon = normalizeIcon(record.icon)
    return normalizePresetIcon(preset, icon) !== icon
  })
  if (!needsMigration) {
    return
  }
  await configuration.update(CONFIGURATION_KEY, buttons, vscode.ConfigurationTarget.Global)
}

export async function updateButtonContexts(buttons: ButtonConfig[]) {
  await Promise.all(buttons.map((button) =>
    vscode.commands.executeCommand("setContext", `agentActionDock.button${button.id}Enabled`, button.enabled),
  ))
}

export async function saveButtons(buttons: ButtonConfig[]) {
  await vscode.workspace
    .getConfiguration(CONFIGURATION_SECTION)
    .update(CONFIGURATION_KEY, buttons, vscode.ConfigurationTarget.Global)
}
