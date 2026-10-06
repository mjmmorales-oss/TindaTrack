#!/usr/bin/env node
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const scriptPath = resolve(__dirname, '../frontend/scripts/check-mockdata.mjs')

const res = spawnSync(process.execPath, [scriptPath], {
  stdio: 'inherit',
  cwd: resolve(__dirname, '../frontend'),
})

process.exit(res.status ?? 0)
