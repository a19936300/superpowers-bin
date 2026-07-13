#!/usr/bin/env node
import { installTrae } from '../lib/trae.js'

const [,, cmd] = process.argv

if (cmd === 'trae') {
  try {
    await installTrae(process.cwd())
  } catch (err) {
    console.error(`✗ ${err.message}`)
    process.exit(1)
  }
} else if (cmd === undefined || cmd === '-h' || cmd === '--help' || cmd === 'help') {
  console.log('superpowers-bin - Install Superpowers skills to AI coding agents')
  console.log('')
  console.log('Usage:')
  console.log('  superpowers-bin trae    Install Superpowers to .trae/ in current project')
  console.log('')
  console.log('Run in the root of the target project.')
} else {
  console.error(`Unknown command: ${cmd}`)
  console.error('Usage: superpowers-bin trae')
  process.exit(1)
}
