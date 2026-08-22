# Agent Action Dock

Configure multiple editor-title buttons for OpenCode, Codex, Claude Code, Gemini CLI, Aider, Goose,
Qwen Code, Pi Agent, DeepSeek, ZCode, Kimi Code, and other terminal agents.

## Features

- Up to 10 buttons in the editor's top-right title bar.
- One-line graphical configuration: enable, preset, name, icon, and command.
- Click the icon preview to choose a built-in Agent brand icon or an official VS Code Codicon from a searchable grid, or enter a custom icon ID.
- The name is used for both the editor button and terminal, and terminals with the same name are always reused.
- Built-in presets for common coding agents.
- Advanced command, working-directory, and file-context options remain available in `settings.json`.

## Configure

Open the Command Palette and run:

```text
Agent Action Dock: Configure Buttons
```

Or press `Ctrl+Alt+A`.

You can also right-click the editor title bar where the Dock buttons appear and choose `Agent Action Dock: Configure Buttons`.

The editor title bar also includes a settings gear button for the same action.

The simple editor stores the button name, icon, preset, command, and enabled state. Selecting a preset fills its command and brand icon automatically, and the command can be edited directly in the same row. Click the icon preview to open the picker; it includes OpenCode, Codex, Claude, Gemini, Aider, Goose, Qwen Code, Pi Agent, DeepSeek, ZCode, and Kimi Code brand icons, followed by the official Codicon grid. The adjacent field accepts either a Codicon ID such as `terminal` or a built-in brand ID such as `brand:codex`. Advanced options can be edited with the **编辑高级配置** button or in `settings.json` under `agentActionDock.buttons`.

The default working directory is `current`, which lets VS Code choose the terminal's current directory. Other supported values are `workspace` and `file`. File context is disabled by default. To enable OpenCode context manually:

```json
{
  "agentActionDock.buttons": [
    {
      "id": "01",
      "enabled": true,
      "preset": "opencode",
      "label": "OpenCode",
      "icon": "brand:opencode",
      "command": "opencode --port {{port}}",
      "cwd": "current",
      "context": "opencode"
    }
  ]
}
```

Commands support these variables:

```text
{{workspaceFolder}}
{{file}}
{{relativeFile}}
{{fileRef}}
{{selection}}
{{lineStart}}
{{lineEnd}}
{{port}}
```

After changing a button's name, icon, or enabled state, reload the VS Code window to update the editor title bar. Reusing an existing terminal only focuses it; the configured command is not run again.

## Development

1. Open this directory in VS Code: `code .`.
2. Run `bun install`.
3. Run `bun run compile`.
4. Press `F5` to start an Extension Development Host.

Create a VSIX with `bun x @vscode/vsce package --no-dependencies`.

The picker bundles the official `@vscode/codicons` font and stylesheet under `media/`, together with the referenced Agent brand assets under `media/brands/`. The `deepseek` and `zcode` entries are editable command presets; their command availability depends on the CLI installed on the host.

The project is based on the MIT-licensed OpenCode VS Code SDK and is developed at [github.com/ALXWJJ/cli-button-dock-vscode](https://github.com/ALXWJJ/cli-button-dock-vscode).
