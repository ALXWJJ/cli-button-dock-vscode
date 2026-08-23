# 发布到 VS Code 扩展市场

扩展 ID：`ALXWJJ.cli-button-dock`  
Publisher：`ALXWJJ`

## 一、首次发布（只需做一次）

### 1. 创建 Publisher

1. 打开 [Visual Studio Marketplace 管理页](https://marketplace.visualstudio.com/manage)
2. 用 Microsoft 账号登录
3. 点 **Create publisher**，名称填 **`ALXWJJ`**（须与 `package.json` 里 `publisher` 一致）

### 2. 创建 Personal Access Token（PAT）

1. 打开 [Azure DevOps PAT 页面](https://dev.azure.com/_usersSettings/tokens)
2. **New Token**
   - Organization：**All accessible organizations**
   - Scopes：展开 **Show all scopes** → 勾选 **Marketplace → Manage**
3. 创建后 **立刻复制** token（只显示一次）

### 3. 登录并发布

在项目根目录：

```bash
bun install
export VSCE_PAT="<你的 PAT>"
bun x @vscode/vsce login ALXWJJ
bun run vsix          # 先本地打包自检
bun x @vscode/vsce publish --no-dependencies
```

成功后可在扩展市场搜索 **Cli Button Dock** 或打开：

https://marketplace.visualstudio.com/items?itemName=ALXWJJ.cli-button-dock

用户安装命令：

```bash
code --install-extension ALXWJJ.cli-button-dock
```

## 二、后续版本更新

1. 改 `package.json` 里的 `version`（须大于已发布版本）
2. `git commit` 并 `git push`
3. 再执行：

```bash
export VSCE_PAT="<你的 PAT>"
bun x @vscode/vsce publish --no-dependencies
```

或用 GitHub Actions：在仓库 Settings → Secrets 添加 `VSCE_PAT`，然后 Actions 里运行 **Publish extension** workflow。

## 三、仅本地安装（不上架）

```bash
bun run vsix
code --install-extension ./cli-button-dock-*.vsix --force
```

然后在 VS Code 执行 **Developer: Reload Window**。

## 常见问题

| 问题 | 处理 |
|------|------|
| `npm list` / ELSPROBLEMS 打包失败 | 使用 `--no-dependencies`（`bun run vsix` 已包含） |
| Publisher 不存在 | 先在 Marketplace 创建 `ALXWJJ` publisher |
| 401 / 403 发布失败 | PAT 须含 Marketplace **Manage**，且 Organization 选 All |
| 版本已存在 | 提高 `package.json` 的 `version` 再发布 |
