# 发布到 VS Code 扩展市场

扩展 ID：`ALXWJJ.cli-button-dock`  
Publisher：`ALXWJJ`

## 推荐：网页上传 VSIX（不需要 PAT）

若 Azure DevOps PAT 页面 **404** 或一直跳转登录，用这种方式最省事。

### 1. 创建 Publisher

1. 打开 [Visual Studio Marketplace 管理页](https://marketplace.visualstudio.com/manage)
2. 用 **Microsoft 账号** 登录（与 GitHub 无关）
3. 左侧 **Create publisher**
   - ID：`ALXWJJ`（须与 `package.json` 里 `publisher` 一致）
   - Name：随意，例如 `ALXWJJ`

### 2. 本地打包

```bash
bun install
bun run vsix
```

得到 `cli-button-dock-0.1.5.vsix`（版本号随 `package.json` 变化）。

### 3. 在网页上传

1. 仍在 [manage 页面](https://marketplace.visualstudio.com/manage)
2. 选中 Publisher **`ALXWJJ`**
3. **+ New extension** → 选 **Visual Studio Code**（不是 Visual Studio）
4. 上传 `cli-button-dock-*.vsix`
5. 填扩展说明（可从 README 复制），点 **Publish** / **Upload**

上架后链接：

https://marketplace.visualstudio.com/items?itemName=ALXWJJ.cli-button-dock

用户安装：

```bash
code --install-extension ALXWJJ.cli-button-dock
```

---

## 备选：用 PAT + `vsce publish`

只有在你需要命令行/CI 自动发布时才需要 PAT。

### PAT 页面 404 的常见原因

文档里的 `https://dev.azure.com/_usersSettings/tokens` **在未创建 Azure DevOps 组织时会 404**。

正确顺序：

1. 打开 [https://dev.azure.com](https://dev.azure.com)，用 Microsoft 账号登录
2. 若没有组织：点 **Start free** / **Create new organization**，随便建一个（例如 `ALXWJJ`）
3. 进入该组织后，右上角头像 → **Personal access tokens**
   - 或直接打开：`https://dev.azure.com/<你的组织名>/_usersSettings/tokens`
4. **+ New Token**
   - Organization：**All accessible organizations**
   - Scopes：**Show all scopes** → 勾选 **Marketplace → Manage**
5. 创建后复制 token（只显示一次）

或在已创建 Publisher 后，在 [Marketplace 管理页](https://marketplace.visualstudio.com/manage) → 你的 Publisher → **Security** → **Personal access tokens** 里创建（部分账号可用）。

### 命令行发布

```bash
export VSCE_PAT="<你的 PAT>"
bun x @vscode/vsce login ALXWJJ
bun x @vscode/vsce publish --no-dependencies
```

---

## 本地安装（不上架）

```bash
bun run vsix
code --install-extension ./cli-button-dock-*.vsix --force
```

然后 **Developer: Reload Window**。

## 更新版本

1. 提高 `package.json` 的 `version`
2. `bun run vsix`
3. 网页 **New extension** 上传新 VSIX，或 `vsce publish`（若已配置 PAT）
