# superpowers-bin

CLI installer for [Superpowers](https://github.com/obra/superpowers) skills to Trae IDE.

## 用途

在任意项目根目录运行 `superpowers-bin trae`,把 Superpowers 的 15 个技能和引导规则装到该项目的 `.trae/` 目录。重启 Trae IDE 后,技能自动生效。

## 前置要求

- Node.js 18+
- 本 CLI 位于 superpowers 仓库内的 `superpowers-bin/` 子目录

## 使用方式

### 方式 1:npm link（本地开发推荐）

```powershell
cd e:\workspace2\superpowers\superpowers-bin
npm link
```

之后可在任意目录全局使用:

```powershell
cd e:\your-project
superpowers-bin trae
```

### 方式 2:npx 本地路径

```powershell
cd e:\your-project
npx e:/workspace2/superpowers/superpowers-bin trae
```

### 方式 3:直接 node 运行

```powershell
cd e:\your-project
node e:/workspace2/superpowers/superpowers-bin/bin/cli.js trae
```

## 安装做了什么

运行 `superpowers-bin trae` 在当前项目下创建:

```
.trae/
├── skills/
│   ├── brainstorming/SKILL.md
│   ├── dispatching-parallel-agents/SKILL.md
│   ├── executing-plans/SKILL.md
│   ├── finishing-a-development-branch/SKILL.md
│   ├── receiving-code-review/SKILL.md
│   ├── requesting-code-review/SKILL.md
│   ├── subagent-driven-development/SKILL.md
│   ├── systematic-debugging/SKILL.md
│   ├── test-driven-development/SKILL.md
│   ├── using-git-worktrees/SKILL.md
│   ├── using-superpowers/SKILL.md
│   ├── verification-before-completion/SKILL.md
│   ├── writing-plans/SKILL.md
│   └── writing-skills/SKILL.md
└── rules/
    ├── superpowers-bootstrap.md       (始终生效,技能系统引导)
    └── superpowers-trae-tools.md      (始终生效,工具映射)
```

- `.trae/skills/` 下的 15 个技能由 Trae 按需自动发现和加载
- `.trae/rules/superpowers-bootstrap.md` 是"始终生效"规则,会话启动时自动注入 `using-superpowers` 引导内容（等同于 Superpowers 的 SessionStart 钩子）
- `.trae/rules/superpowers-trae-tools.md` 是工具名映射,把技能里的动作词汇翻译成 Trae 实际工具名

## 验证安装

### 步骤 1:基础验证

在 Trae IDE 打开装好的项目,新建会话,发送:

```
What are your superpowers?
```

✅ 预期:AI 说出自己有 superpowers 技能系统,列出技能
❌ 失败:AI 答非所问 → 检查 `.trae/rules/superpowers-bootstrap.md` 是否存在且 `alwaysApply: true`

### 步骤 2:接受测试

发送:

```
Let's make a react todo list
```

✅ 预期:AI 自动调用 `brainstorming` 技能,先问需求,不直接写代码
❌ 失败:AI 直接写 React 代码 → 引导没触发技能检查,需调整 bootstrap 措辞

### 步骤 3:验证工具名

Trae 文档未公开完整工具名清单。发送:

```
列出你能调用的所有工具的机器名,每行一个
```

按 AI 回复编辑 `.trae/rules/superpowers-trae-tools.md` 更新映射表。

## 卸载

```powershell
Remove-Item -Recurse .trae\skills
Remove-Item .trae\rules\superpowers-bootstrap.md
Remove-Item .trae\rules\superpowers-trae-tools.md
```

## 更新

Superpowers 仓库的 skills 改了之后,重新跑一次 `superpowers-bin trae` 即可（会覆盖旧文件）。

## 设计说明

- **零依赖**:只用 Node 18+ 原生 API
- **硬复制**:技能文件从 superpowers 仓库复制到目标项目（不用符号链接,避免权限问题）
- **项目级安装**:装到当前项目的 `.trae/`,不影响其他项目
- **不改 superpowers 仓库**:CLI 只读 skills 源目录,不修改任何现有文件
- **基于 Trae 原生能力**:用 `.trae/rules/` 的 `alwaysApply: true` 实现会话启动注入,用 `.trae/skills/` 自动发现实现技能加载,不需要 shell hook 或进程内插件
