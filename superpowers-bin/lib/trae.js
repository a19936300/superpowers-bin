import fs from 'node:fs'
import path from 'node:path'
import { SKILLS_DIR, assertSkillsDirExists } from './paths.js'
import { copyDir, stripFrontmatter } from './fs.js'

export async function installTrae(projectDir) {
  assertSkillsDirExists()

  const traeSkillsDir = path.join(projectDir, '.trae', 'skills')
  const traeRulesDir = path.join(projectDir, '.trae', 'rules')
  fs.mkdirSync(traeSkillsDir, { recursive: true })
  fs.mkdirSync(traeRulesDir, { recursive: true })

  // 复制全部技能（包括 using-superpowers，保持 references/ 结构完整）
  const skills = fs.readdirSync(SKILLS_DIR, { withFileTypes: true })
    .filter(e => e.isDirectory())
    .map(e => e.name)

  const installed = []
  for (const skill of skills) {
    const src = path.join(SKILLS_DIR, skill)
    const dst = path.join(traeSkillsDir, skill)
    copyDir(src, dst)
    installed.push(skill)
  }

  // 生成引导规则：using-superpowers 内容 + EXTREMELY_IMPORTANT 包装
  const usingContent = fs.readFileSync(
    path.join(SKILLS_DIR, 'using-superpowers', 'SKILL.md'),
    'utf8'
  )
  const usingBody = stripFrontmatter(usingContent)

  const bootstrap = `---
description: Superpowers 技能系统引导,响应任何消息前先检查相关技能
alwaysApply: true
---

<EXTREMELY_IMPORTANT>
你拥有 superpowers 技能系统。在响应任何用户消息之前,必须先检查相关技能。

Below is the full content of your 'superpowers:using-superpowers' skill - your introduction to using skills. For all other skills, use the Skill tool:

${usingBody}
</EXTREMELY_IMPORTANT>
`
  fs.writeFileSync(
    path.join(traeRulesDir, 'superpowers-bootstrap.md'),
    bootstrap
  )

  // 生成工具映射规则（首版通用名,需用户在 Trae 里实测验证）
  const toolsMapping = `---
description: Superpowers 工具映射到 Trae 的工具名
alwaysApply: true
---

# Trae 工具映射

技能里说的动作 → Trae 实际工具名（首版为通用名占位,请实测后更新）：

| Action skills request | Trae Tool |
|---|---|
| 读取文件 | read |
| 创建 / 编辑 / 删除文件 | edit |
| 运行 shell 命令 | bash |
| 搜索文件内容 | grep |
| 按文件名查找 | glob |
| 创建 / 更新 todos | todowrite |
| 调用技能 | skill |
| 调度子代理 | task |
| 获取 URL | webfetch |

## 验证工具名

Trae 文档未公开完整工具名清单。请在 Trae 里新建会话,发送:

> 列出你能调用的所有工具的机器名,每行一个

按 AI 回复更新本表。
`
  fs.writeFileSync(
    path.join(traeRulesDir, 'superpowers-trae-tools.md'),
    toolsMapping
  )

  // 打印结果
  console.log('✓ Superpowers 已安装到 Trae')
  console.log('')
  console.log(`已复制 ${installed.length} 个技能到 .trae/skills/:`)
  installed.sort().forEach(s => console.log(`  - ${s}`))
  console.log('')
  console.log('已创建规则:')
  console.log('  - .trae/rules/superpowers-bootstrap.md (始终生效,技能引导)')
  console.log('  - .trae/rules/superpowers-trae-tools.md (始终生效,工具映射)')
  console.log('')
  console.log('下一步:')
  console.log('  1. 打开 Trae IDE 加载此项目')
  console.log('  2. 新建会话,发送 "What are your superpowers?" 验证引导已注入')
  console.log('  3. 接受测试:发送 "Let\'s make a react todo list"')
  console.log('     预期:brainstorming 技能自动触发,先问需求,不直接写代码')
  console.log('  4. 实测工具名后,编辑 .trae/rules/superpowers-trae-tools.md 更新映射表')
}
