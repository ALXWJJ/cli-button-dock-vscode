import * as vscode from "vscode"
import { BUTTON_IDS, CONFIGURATION_KEY, CONFIGURATION_SECTION, CUSTOM_ICON_SLOTS_KEY } from "./constants"
import {
  DEFAULT_BUTTONS,
  compactButtonsForStorage,
  getConfiguredEntry,
  normalizeButton,
  normalizeButtons,
} from "./presets"
import type { ButtonConfig } from "./types"

export { normalizeButtons }

function getSettingsTarget() {
  return vscode.ConfigurationTarget.Global
}

export function loadButtons(): ButtonConfig[] {
  const configured = vscode.workspace.getConfiguration(CONFIGURATION_SECTION).get<unknown>(CONFIGURATION_KEY)
  const entries = Array.isArray(configured) ? configured : []
  return BUTTON_IDS.map((id, index) => normalizeButton(getConfiguredEntry(entries, id), DEFAULT_BUTTONS[index], id))
}

export function loadCustomIconSlots(): Map<string, number> {
  const stored = vscode.workspace.getConfiguration(CONFIGURATION_SECTION).get<Record<string, number>>(CUSTOM_ICON_SLOTS_KEY) ?? {}
  return new Map(Object.entries(stored).map(([id, slot]) => [id, Number(slot)]))
}

export async function saveCustomIconSlots(slots: Map<string, number>) {
  const value = Object.fromEntries(slots)
  await vscode.workspace
    .getConfiguration(CONFIGURATION_SECTION)
    .update(
      CUSTOM_ICON_SLOTS_KEY,
      Object.keys(value).length > 0 ? value : undefined,
      getSettingsTarget(),
    )
}

export async function updateButtonContexts(buttons: ButtonConfig[], iconSlots?: Map<string, number>) {
  const slots = iconSlots ?? loadCustomIconSlots()
  const updates = buttons.flatMap((button) => [
    vscode.commands.executeCommand("setContext", `cliButtonDock.button${button.id}Enabled`, button.enabled),
    vscode.commands.executeCommand(
      "setContext",
      `cliButtonDock.button${button.id}IconSlot`,
      button.enabled ? (slots.get(button.id) ?? 0) : undefined,
    ),
  ])
  await Promise.all(updates)
}

export async function saveButtons(buttons: ButtonConfig[]) {
  const stored = compactButtonsForStorage(buttons)
  await vscode.workspace
    .getConfiguration(CONFIGURATION_SECTION)
    .update(
      CONFIGURATION_KEY,
      stored.length > 0 ? stored : undefined,
      getSettingsTarget(),
    )
}

export function affectsCliButtonDockConfiguration(event: vscode.ConfigurationChangeEvent) {
  return event.affectsConfiguration(`${CONFIGURATION_SECTION}.${CONFIGURATION_KEY}`)
    || event.affectsConfiguration(`${CONFIGURATION_SECTION}.${CUSTOM_ICON_SLOTS_KEY}`)
}
