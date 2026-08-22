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
- The default configuration enables only the OpenCode button; other slots can
  be enabled when needed.
- A graphical configuration page available from the Command Palette, the
  editor title bar, or the `Cmd/Ctrl+Alt+A` shortcut.
- Built-in presets for common coding agents, plus fully custom commands.
- Brand icons and a curated set of cute emoji choices; the default emoji is 👻
  (U+1F47B).
- Custom icons without file uploads: inline SVG, `data:image/...` values, or
  HTTPS image URLs.
- An interactive custom-icon editor with Lucide image and link icons for SVG or
  HTTPS image links, plus live preview.
- A one-click **Reload Window** button in the configuration page.
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
code --install-extension ./agent-action-dock-0.1.4.vsix
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
- `icon`: an emoji id such as `emoji:👻`, a brand id such as `brand:codex`, an
  inline SVG, a `data:image/...` value, or an `https://...` image URL. Legacy
  Codicon ids remain supported when entered manually in `settings.json`, but
  the graphical picker no longer offers them.
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

### Custom icons

Custom icons do not require uploading a file. Set `icon` to one of these forms:

```json
{
  "icon": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\"><path fill=\"currentColor\" d=\"...\"/></svg>"
}
```

You can also use a `data:image/svg+xml,...` or `data:image/png;base64,...`
value, or an HTTPS image URL. The graphical editor no longer uses a text field
for the icon value. Use the Lucide image button to edit SVG or the Lucide link
button to set an image link, then preview it and click **Apply icon**. VS Code command icons require
extension-local image paths, so the extension downloads HTTPS images and
caches them under its local `media/user-icons` directory before updating the
title-bar command. SVG content is sanitized and limited to 1 MiB. HTTP links
and unsupported image types are rejected; a failed custom icon falls back to
the 👻 icon. Use the **Reload Window** button at the top of the configuration
page to apply title-bar icon changes immediately.

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
media/brands/          Bundled, normalized agent brand assets
media/codicon.*        Bundled VS Code Codicon font and stylesheet
images/icon.png        Extension icon
esbuild.js             Extension bundler
package.json           VS Code manifest and development scripts
```

## Security and privacy

Commands are executed in the VS Code integrated terminal with the permissions
of the current user. The extension does not sandbox or rewrite commands, so
review button settings before enabling them. The extension itself only talks to
`localhost` for the optional OpenCode context integration. When a button uses
an HTTPS custom icon URL, that URL is fetched and cached locally; review remote
icon sources before using them. The extension does not upload source files or
collect telemetry.

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
