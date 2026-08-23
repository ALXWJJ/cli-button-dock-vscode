# Cli Button Dock

[English](README.en.md)

在编辑器标题栏放最多 10 个按钮，一键在终端里启动 OpenCode、Codex、Claude Code、Gemini CLI、Cursor CLI、OpenClaw、MiMo Code、Antigravity 等 18 种预设 CLI Agent，或任意自定义命令。

配置项 ID 为 `cliButtonDock.*`。

## 快速开始

1. 点编辑器标题栏右侧的 **Cli Button Dock 图标**（Configure Cli Button Dock）打开配置页
2. 勾选要显示的按钮，选预设或填写命令、名称、图标
3. 点 **保存并重载窗口**，标题栏会出现对应按钮

每次点击按钮都会 **新开一个终端** 并执行命令。

## 快捷键

| 操作 | 快捷键 |
|------|--------|
| 打开配置页 | `Cmd/Ctrl+Alt+A` |
| 将当前文件引用插入终端 | `Cmd/Ctrl+Alt+K` |

## 安装（本地 VSIX）

```bash
bun install && bun run package
bun x @vscode/vsce package --no-dependencies
code --install-extension ./cli-button-dock-*.vsix
```

需要 VS Code ≥ 1.94、[Bun](https://bun.sh/) ≥ 1.3。

## 高级配置

图形页可改：启用、预设、名称、图标、命令。

`cwd` 等请在 `settings.json` 的 `cliButtonDock.buttons` 里编辑。命令支持 `{{file}}`、`{{fileRef}}`、`{{selection}}` 等变量。

## 开发

```bash
bun run check   # 类型检查 + lint + 测试
bun run package
```

## 说明

MIT 许可。社区项目，与各 Agent 厂商无官方关系。
