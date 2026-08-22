# Agent Action Dock

[中文文档](README.zh-CN.md)

Agent Action Dock is a lightweight VS Code extension for launching CLI coding
agents from buttons in the editor title bar. Configure up to ten buttons for
OpenCode, Codex, Claude Code, Gemini CLI, Aider, Goose, Qwen Code, Pi Agent,
DeepSeek, ZCode, Kimi Code, or any other command-line tool.

The repository is named `cli-button-dock-vscode`; the extension name and the
`agentActionDock.*` identifiers are kept for compatibility with existing
settings.

## Features

- Up to 10 configurable buttons in the editor title bar.
- A graphical configuration page available from the Command Palette, the
  editor title bar, or the `Cmd/Ctrl+Alt+A` shortcut.
- Built-in presets for common coding agents, plus fully custom commands.
- Brand icons and a searchable grid of official VS Code Codicons.
- Reuse an existing integrated terminal by button name.
- Choose the terminal working directory: current, workspace, or active file.
- Expand workspace, file, selection, line, and port variables in commands.
- Optional OpenCode file-context integration.
- A command for inserting the active file reference into the active terminal.

## Installation

The extension is currently distributed from source as a VSIX.

Requirements:

- VS Code 1.94 or newer
- [Bun](https://bun.sh/) 1.3 or newer

Build and install it locally:

```bash
git clone https://github.com/ALXWJJ/cli-button-dock-vscode.git
cd cli-button-dock-vscode
bun install
bun run package
bun x @vscode/vsce package --no-dependencies
code --install-extension ./agent-action-dock-0.1.0.vsix
```

The VSIX filename includes the version from `package.json`. You can also use
VS Code's **Extensions: Install from VSIX...** command.

## Usage

1. Open the Command Palette.
2. Run **Agent Action Dock: Configure Buttons**.
3. Enable a button, choose a preset or enter a custom command, and save.
4. Reload the VS Code window when prompted.

The configuration page can also be opened from the settings gear in the editor
title bar or its context menu. The default keyboard shortcuts are:

| Action | macOS | Windows/Linux |
| --- | --- | --- |
| Configure buttons | `Cmd+Alt+A` | `Ctrl+Alt+A` |
| Add active file to terminal | `Cmd+Alt+K` | `Ctrl+Alt+K` |

The extension reuses an existing integrated terminal with the same name. When
it finds one, clicking the button focuses that terminal without running the
command again.

## Configuration

The graphical editor writes the button list to the user settings. Advanced
fields can be edited directly in `settings.json`:

```json
{
  "agentActionDock.buttons": [
    {
      "id": "01",
      "enabled": true,
      "preset": "custom",
      "label": "My Agent",
      "icon": "terminal",
      "command": "my-agent --file {{fileRef}}",
      "cwd": "current",
      "context": "none"
    }
  ]
}
```

### Button fields

- `enabled`: whether the button is shown in the editor title bar.
- `label`: the button label and the integrated terminal name.
- `preset`: a built-in preset id or `custom`.
- `icon`: a Codicon id such as `terminal`, or a brand id such as
  `brand:codex`.
- `command`: the command sent to the integrated terminal.
- `cwd`: `current`, `workspace`, or `file`.
- `context`: `none` or `opencode`.

Commands support both `{{name}}` and `${name}` forms for these variables:

| Variable | Expansion |
| --- | --- |
| `workspaceFolder` | Absolute path of the current workspace folder |
| `file` | Absolute path of the active file |
| `relativeFile` | Workspace-relative path of the active file |
| `fileRef` | A relative file reference such as `@src/index.ts#L10-L12` |
| `selection` | The active editor selection |
| `lineStart` | One-based start line of the active selection |
| `lineEnd` | One-based end line of the active selection |
| `port` | The temporary OpenCode integration port |

Unknown variables are left unchanged. File and selection variables are empty
when no editor context is available.

### OpenCode context

For a button with `context: "opencode"`, the extension allocates a local port,
sets the terminal environment variables expected by OpenCode, and sends the
active file reference to the local OpenCode endpoint after startup. This is an
optional integration; normal commands use `context: "none"`.

## Development

```bash
bun install
bun run check       # TypeScript and ESLint
bun run compile     # Development bundle
bun run package     # Production bundle
bun run format      # Apply the configured ESLint fixes
```

Open the repository in VS Code and press `F5` to launch an Extension
Development Host. `bun run watch:esbuild` can be used while iterating on the
extension bundle.

The repository currently has no automated integration test suite. CI runs the
type check, lint, and production-independent compile step on pushes and pull
requests.

## Project layout

```text
src/extension.ts       Extension activation, commands, terminal handling,
                       configuration UI, and manifest synchronization
media/brands/          Bundled agent brand assets
media/codicon.*        Bundled VS Code Codicon font and stylesheet
images/icon.png        Extension icon
esbuild.js             Extension bundler
package.json           VS Code manifest and development scripts
```

## Security and privacy

Commands are executed in the VS Code integrated terminal with the permissions
of the current user. The extension does not sandbox or rewrite commands, so
review button settings before enabling them. The extension itself only talks to
`localhost` for the optional OpenCode context integration; it does not upload
source files or collect telemetry.

## Contributing

Bug reports, feature requests, documentation improvements, and pull requests
are welcome. Please read [CONTRIBUTING.md](CONTRIBUTING.md) before submitting a
change.

## License and attribution

This project is released under the [MIT License](LICENSE). It bundles the
VS Code Codicons font and stylesheet and several agent brand assets. See
[THIRD-PARTY-NOTICES.txt](THIRD-PARTY-NOTICES.txt) for attribution, source
links, and trademark notes.

Agent Action Dock is an independent community project. It is not affiliated
with Microsoft, OpenCode, OpenAI, Anthropic, Google, Aider, Goose, Qwen,
DeepSeek, Z.ai, Moonshot AI, or any other agent vendor named in the presets.
