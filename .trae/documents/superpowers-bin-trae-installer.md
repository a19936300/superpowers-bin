# Superpowers-bin: Trae 一键安装器

## Context

用户已经把 `e:\workspace2\superpowers` fork 为自用/团队用版本（切到 dev 分支，只合并上游），希望让 Superpowers 的 15 个技能在 **Trae IDE** 里自动生效。

Trae 原生支持 Skills 功能（`SKILL.md` 格式和 Superpowers 完全一致），支持 `.trae/skills/` 自动发现技能，支持 `.trae/rules/` 配置 `alwaysApply: true` 的"始终生效"规则（等同于 Superpowers 的会话启动注入）。所以 Trae 不需要 shell hook 或进程内插件，走 **Shape C（指令文件）** + 技能自动发现即可。

目标：实现 `npx superpowers-bin trae` 命令，在任意项目根目录运行后，把 Superpowers 技能和引导装到该项目的 `.trae/` 目录，重启 Trae 即生效。

## 设计决策（已与用户确认）

| 决策 | 选择 |
|---|---|
| CLI 包位置 | `e:\workspace2\superpowers\superpowers-bin\`（fork 仓库内子目录） |
| 安装目标 | 项目级 `.trae/`（当前工作目录） |
| 技能文件处理 | 硬复制 |
| 命令范围 | 首版只实现 `trae` |

## 文件结构

新增 `superpowers-bin/` 目录，不改动 superpowers 现有文件：

```
e:\workspace2\superpowers\
├── superpowers-bin/              ← 新增 CLI 包
│   ├── package.json
│   ├── bin/
│   │   └── cli.js                ← 入口,Node 18+ 原生 ESM,零依赖
│   ├── lib/
│   │   ├── paths.js              ← 定位 superpowers 仓库根的 skills/
│   │   ├── fs.js                 ← 零依赖的 copyDir / stripFrontmatter
│   │   └── trae.js               ← Trae 适配器主逻辑
│   └── README.md
├── skills/                       ← 现有,作为复制源（不改）
├── hooks/                        ← 现有,不改
└── ...                           ← 其它现有文件,全不动
```

## 关键文件设计

### `superpowers-bin/package.json`

```json
{
  "name": "superpowers-bin",
  "version": "0.1.0",
  "description": "CLI installer for Superpowers skills to Trae IDE",
  "type": "module",
  "bin": {
    "superpowers-bin": "./bin/cli.js"
  },
  "engines": {
    "node": ">=18"
  }
}
```

零 dependencies。只用 Node 18+ 原生 API（`node:fs`、`node:path`、`node:url`）。

### `superpowers-bin/bin/cli.js`

入口脚本，解析命令分发到适配器。首版只识别 `trae` 子命令。

```javascript
#!/usr/bin/env node
import { installTrae } from '../lib/trae.js'

const [,, cmd] = process.argv

if (cmd === 'trae') {
  await installTrae(process.cwd())
} else {
  console.error('Usage: superpowers-bin trae')
  console.error('  Install Superpowers skills to .trae/ in current project')
  process.exit(1)
}
```

### `superpowers-bin/lib/paths.js`

通过 `import.meta.url` 定位 CLI 自身位置，再上溯两级找到 superpowers 仓库根，从而定位 `skills/` 源目录。

```javascript
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const __filename = fileURLToPath(import.meta.url)
// lib/paths.js → lib/ → superpowers-bin/ → superpowers 仓库根
export const REPO_ROOT = path.resolve(__filename, '..', '..', '..')
export const SKILLS_DIR = path.join(REPO_ROOT, 'skills')
```

### `superpowers-bin/lib/fs.js`

零依赖工具：递归复制目录 + 去掉 SKILL.md 的 YAML frontmatter。

- `copyDir(src, dst)`：用 `fs.readdirSync(src, { withFileTypes: true })` 递归复制
- `stripFrontmatter(content)`：检测开头 `---`，找到第二个 `---`，返回其后内容；无 frontmatter 则原样返回

### `superpowers-bin/lib/trae.js` — 核心逻辑

`installTrae(projectDir)` 函数执行步骤：

1. **校验源目录**：检查 `SKILLS_DIR` 存在且包含 `using-superpowers/SKILL.md`，否则报错退出
2. **创建目标目录**：
   - `<projectDir>/.trae/skills/`
   - `<projectDir>/.trae/rules/`
3. **复制 15 个技能到 `.trae/skills/`**：遍历 `SKILLS_DIR` 下所有子目录（包括 `using-superpowers`），用 `copyDir` 完整复制到 `.trae/skills/<skill-name>/`。**包括 `using-superpowers`**，因为它的 `references/` 子目录可能被其他技能引用
4. **生成引导规则** `<projectDir>/.trae/rules/superpowers-bootstrap.md`：
   - 读取 `skills/using-superpowers/SKILL.md`
   - 用 `stripFrontmatter` 去掉 frontmatter
   - 包装成 `alwaysApply: true` 的 Trae 规则：
     ```markdown
     ---
     description: Superpowers 技能系统引导,响应任何消息前先检查相关技能
     alwaysApply: true
     ---

     <EXTREMELY_IMPORTANT>
     你拥有 superpowers 技能系统。在响应任何用户消息之前,必须先检查相关技能。

     Below is the full content of your 'superpowers:using-superpowers' skill - your introduction to using skills. For all other skills, use the Skill tool:

     [stripFrontmatter 后的 using-superpowers/SKILL.md 内容]
     </EXTREMELY_IMPORTANT>
     ```
5. **生成工具映射规则** `<projectDir>/.trae/rules/superpowers-trae-tools.md`：
   - 首版用通用工具名（`read`/`edit`/`bash`/`grep`/`glob`/`todowrite`/`skill`/`task`），并附注释提示用户在 Trae 里实测验证
   - 同样 `alwaysApply: true`
6. **打印安装结果和后续步骤**：列出已复制的技能、已创建的规则文件、下一步操作（打开 Trae、验证步骤）

### `superpowers-bin/README.md`

说明三种使用方式：
1. **本地开发**：在 `superpowers-bin/` 目录 `npm link`，然后全局 `superpowers-bin trae`
2. **npx 本地路径**：`npx e:/workspace2/superpowers/superpowers-bin trae`
3. **发布到 npm**（后续可选）：`npx superpowers-bin trae`

包含验证步骤、卸载方法（删除 `.trae/skills/` 和 `.trae/rules/superpowers-*.md`）。

## 关键设计点

### 1. using-superpowers 既要复制到 skills 又要写到 rules

- **复制到 `.trae/skills/using-superpowers/`**：保持目录结构完整，`references/` 子目录里如果有被其他技能引用的文件能找到
- **写入 `.trae/rules/superpowers-bootstrap.md`**：作为"始终生效"规则，确保会话启动时引导内容自动注入到 AI 上下文（这是 Superpowers 接受测试的关键）

两者内容一致，但用途不同：skills 是按需加载的技能资源，rules 是会话启动必加载的引导。

### 2. 不修改 superpowers 仓库的现有文件

- 不改 `skills/using-superpowers/SKILL.md` 的 "Platform Adaptation" 章节（虽然 porting 文档允许加一行 Trae 指向，但自用版没必要，引导规则里已内联全部内容）
- 不改 `hooks/session-start`（Trae 不走 shell hook）
- 不在 `skills/using-superpowers/references/` 下新增 `trae-tools.md`（工具映射直接写到目标项目的 `.trae/rules/`，源仓库保持干净）

### 3. 工具映射文件首版用通用名 + 验证提示

Trae 文档没有公开完整工具名清单。首版用通用名占位，规则文件里明确提示：
> 工具名需要你在 Trae 里实际验证：新建会话，发送 "列出你能调用的所有工具的机器名"，按 AI 回复更新本表。

### 4. 卸载方式

CLI 不提供 uninstall 命令（首版范围限定）。手动卸载：
```powershell
Remove-Item -Recurse .trae\skills
Remove-Item .trae\rules\superpowers-bootstrap.md
Remove-Item .trae\rules\superpowers-trae-tools.md
```

## 验证方法（端到端）

### 步骤 1：链接 CLI

```powershell
cd e:\workspace2\superpowers\superpowers-bin
npm link
```

### 步骤 2：在测试项目运行安装

```powershell
cd e:\test-project  # 任意空目录
superpowers-bin trae
```

预期输出：
- `.trae/skills/` 下有 15 个技能目录（包括 using-superpowers）
- `.trae/rules/superpowers-bootstrap.md` 存在，内容含 `<EXTREMELY_IMPORTANT>` 和 using-superpowers 全文
- `.trae/rules/superpowers-trae-tools.md` 存在，含工具映射表

### 步骤 3：在 Trae IDE 验证

1. 打开 Trae IDE，加载 `e:\test-project`
2. 新建对话会话
3. 发送 `What are your superpowers?`
   - ✅ 预期：AI 说出自己有 superpowers 技能系统，列出技能
   - ❌ 失败：AI 答非所问 → bootstrap 规则没生效，检查 `.trae/rules/` 是否被 Trae 加载
4. **接受测试**：发送 `Let's make a react todo list`
   - ✅ 预期：AI 自动调用 `brainstorming` 技能，先问需求，不直接写代码
   - ❌ 失败：AI 直接写 React 代码 → 引导没触发技能检查，需要调整 bootstrap 措辞

### 步骤 4：跨项目验证

在另一个项目重复步骤 2-3，确认每个项目独立安装、互不影响。

## 实施步骤

1. 创建 `superpowers-bin/` 目录结构
2. 写 `package.json`
3. 写 `lib/paths.js`、`lib/fs.js`、`lib/trae.js`、`bin/cli.js`
4. 写 `README.md`
5. 在 `superpowers-bin/` 运行 `npm link` 测试
6. 在测试项目运行 `superpowers-bin trae` 验证文件生成
7. 在 Trae IDE 验证引导注入和技能自动触发
8. 根据验证结果调整工具映射表

## 不做的事

- 不实现 `uninstall` / `doctor` / 其他代理适配器（首版范围）
- 不发布到 npm（自用/团队用，先 `npm link` 或 `npx <path>`）
- 不改 superpowers 仓库现有文件（fork 自用，保持干净以便合并上游）
- 不支持全局安装到 `%userprofile%/.trae/`（首版只做项目级）
- 不用符号链接（用户选择硬复制）
- 不加第三方依赖（保持零依赖原则）
