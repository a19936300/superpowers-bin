import { fileURLToPath } from 'node:url'
import path from 'node:path'
import fs from 'node:fs'

const __filename = fileURLToPath(import.meta.url)
// lib/paths.js → lib/ → superpowers-bin/ → superpowers 仓库根
export const REPO_ROOT = path.resolve(__filename, '..', '..', '..')
export const SKILLS_DIR = path.join(REPO_ROOT, 'skills')

export function assertSkillsDirExists() {
  if (!fs.existsSync(SKILLS_DIR)) {
    throw new Error(`Skills directory not found: ${SKILLS_DIR}
Expected superpowers-bin to live inside the superpowers repo.`)
  }
  const usingSkill = path.join(SKILLS_DIR, 'using-superpowers', 'SKILL.md')
  if (!fs.existsSync(usingSkill)) {
    throw new Error(`using-superpowers/SKILL.md not found at: ${usingSkill}
Cannot proceed without the bootstrap skill.`)
  }
}
