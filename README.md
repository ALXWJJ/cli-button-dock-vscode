# Agent Action Dock

Configure multiple editor-title buttons for OpenCode, Codex, Claude Code, Gemini CLI, Aider, and any other terminal agent.

## Features

- Up to 10 buttons in the editor's top-right title bar.
- Graphical configuration panel opened with `Agent Action Dock: Configure Buttons`.
- Built-in presets for common coding agents and a searchable Codicon list.
- Custom command, label, terminal name, working directory, reuse behavior, and file-context variables.
- OpenCode mode passes the active file or selection to the OpenCode TUI.

## Configure

Open the Command Palette and run:

```text
Agent Action Dock: Configure Buttons
```

Each button supports variables in its command:

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

Example command:

```text
codex review {{fileRef}}
```

The configuration is stored in the `agentActionDock.buttons` setting. The editor title menu is contributed statically by VS Code, so changing a button's label, icon, or visibility asks you to reload the window. Command-only changes take effect immediately.

## Development

1. Open this directory in VS Code: `code sdks/vscode`.
2. Run `bun install`.
3. Run `bun run compile`.
4. Press `F5` to start an Extension Development Host.

Create a VSIX with `bun x @vscode/vsce package --no-dependencies`.

The project is based on the MIT-licensed OpenCode VS Code SDK and is developed at [github.com/ALXWJJ/agent-action-dock](https://github.com/ALXWJJ/agent-action-dock).
