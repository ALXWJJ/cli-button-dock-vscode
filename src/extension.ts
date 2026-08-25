import * as vscode from "vscode"
import { BUTTON_IDS, TITLE_BAR_RUNTIME_ICON_SLOTS } from "./constants"
import {
  affectsCliButtonDockConfiguration,
  loadButtons,
  loadCustomIconSlots,
  saveButtons,
  updateButtonContexts,
} from "./config"
import { openConfigurator } from "./configurator"
import { syncTitleBarRuntimeIcons } from "./icons"
import {
  createRuntimeIconPlaceholders,
  customFaceCommandId,
  faceCommandId,
  getTitleBarIconIds,
} from "./title-bar"
import { addFilepathToActiveTerminal, runButton } from "./terminal"

import type { ButtonConfig, ConfiguratorHandlers } from "./types"

function registerConfigurationListener(
  context: vscode.ExtensionContext,
  onChange: () => void | Promise<void>,
) {
  context.subscriptions.push(vscode.workspace.onDidChangeConfiguration((event) => {
    if (!affectsCliButtonDockConfiguration(event)) {
      return
    }
    void onChange()
  }))
}

function scheduleRemoteContextRefresh(context: vscode.ExtensionContext, refresh: () => void | Promise<void>) {
  if (!vscode.env.remoteName) {
    return
  }
  const delays = [800, 2500]
  const timers = delays.map((delay) => setTimeout(() => void refresh(), delay))
  context.subscriptions.push({
    dispose: () => timers.forEach((timer) => clearTimeout(timer)),
  })
}

async function refreshTitleBarContexts(customIconSlots?: Map<string, number>) {
  const buttons = loadButtons()
  await updateButtonContexts(buttons, customIconSlots ?? loadCustomIconSlots())
}

async function applyWorkspaceButtonConfig(context: vscode.ExtensionContext, nextButtons: ButtonConfig[]) {
  const { customIconSlots } = await syncTitleBarRuntimeIcons(context, nextButtons)
  await updateButtonContexts(nextButtons, customIconSlots)
}

function registerButtonFaceCommands(
  context: vscode.ExtensionContext,
  getButtons: () => ButtonConfig[],
) {
  const iconIds = getTitleBarIconIds()

  for (const buttonId of BUTTON_IDS) {
    for (const iconId of iconIds) {
      const commandId = faceCommandId(buttonId, iconId)
      context.subscriptions.push(vscode.commands.registerCommand(commandId, async () => {
        const button = getButtons().find((item) => item.id === buttonId)
        if (button) {
          await runButton(button, context)
        }
      }))
    }

    for (let slot = 0; slot < TITLE_BAR_RUNTIME_ICON_SLOTS; slot++) {
      const customCommandId = customFaceCommandId(buttonId, slot)
      context.subscriptions.push(vscode.commands.registerCommand(customCommandId, async () => {
        const button = getButtons().find((item) => item.id === buttonId)
        if (button) {
          await runButton(button, context)
        }
      }))
    }
  }
}

export function activate(context: vscode.ExtensionContext) {
  if (context.extension.extensionKind === vscode.ExtensionKind.UI) {
    void refreshTitleBarContexts()
    registerConfigurationListener(context, () => refreshTitleBarContexts())
    scheduleRemoteContextRefresh(context, () => refreshTitleBarContexts())
    return
  }

  createRuntimeIconPlaceholders(context.extensionPath)
  let buttons = loadButtons()

  const refreshWorkspace = async (nextButtons?: ButtonConfig[]) => {
    buttons = nextButtons ?? loadButtons()
    await applyWorkspaceButtonConfig(context, buttons)
  }

  void refreshWorkspace()
  registerButtonFaceCommands(context, () => buttons)

  const configureDisposable = vscode.commands.registerCommand("cliButtonDock.configure", () => {
    const handlers: ConfiguratorHandlers = {
      apply: async (nextButtons) => {
        buttons = nextButtons
        await saveButtons(nextButtons)
        await applyWorkspaceButtonConfig(context, nextButtons)
      },
    }
    openConfigurator(context, buttons, handlers)
  })
  context.subscriptions.push(configureDisposable)

  const addFilepathDisposable = vscode.commands.registerCommand("cliButtonDock.addFilepathToTerminal", async () => {
    await addFilepathToActiveTerminal()
  })
  context.subscriptions.push(addFilepathDisposable)

  registerConfigurationListener(context, () => refreshWorkspace())
}

export function deactivate() {}
