import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const frontendRoot = path.resolve(__dirname, '..')
const srcDir = path.resolve(frontendRoot, 'src')
const indexHtmlPath = path.resolve(frontendRoot, 'index.html')

let errors = 0

function logError(file, message, line) {
  const rel = path.relative(frontendRoot, file)
  console.error(`❌ [mobile] ${rel}${line ? `:${line}` : ''}: ${message}`)
  errors++
}

// 1. Check viewport meta in index.html
if (fs.existsSync(indexHtmlPath)) {
  const html = fs.readFileSync(indexHtmlPath, 'utf8')
  if (html.includes('maximum-scale') || html.includes('user-scalable')) {
    logError(indexHtmlPath, 'Viewport meta must not contain maximum-scale or user-scalable (blocks pinch-to-zoom).')
  }
  if (!html.includes('interactive-widget=resizes-content')) {
    logError(indexHtmlPath, 'Viewport meta should include interactive-widget=resizes-content for mobile keyboards.')
  }
} else {
  logError(indexHtmlPath, 'index.html not found')
}

// 2. Recursively scan src/** excluding components/ui
function scanDirectory(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)

    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === '.git') continue
      // Exclude components/ui
      if (fullPath === path.resolve(srcDir, 'components', 'ui')) continue
      scanDirectory(fullPath)
    } else if (entry.isFile() && /\.(jsx?|tsx?|css|html)$/.test(entry.name)) {
      checkFile(fullPath)
    }
  }
}

function checkFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8')
  const lines = content.split('\n')

  // Check 2a: No h-screen, min-h-screen, 100vh, or h-[100vh]
  // (Skip test files or mocks if they mock dimensions, but let's check standard source files)
  lines.forEach((line, idx) => {
    // Check viewport units
    const vhMatch = /\b(h-screen|min-h-screen|h-\[100vh\]|min-h-\[100vh\])\b/.exec(line)
    if (vhMatch) {
      logError(filePath, `Found forbidden viewport class "${vhMatch[1]}". Use dvh units (e.g. h-dvh, min-h-dvh) instead.`, idx + 1)
    }
    if (line.includes('100vh') && !line.includes('var(--vvh') && !line.includes('calc(') && !filePath.endsWith('.test.jsx')) {
      // Catch raw 100vh unless in fallback calculations
      if (/\b100vh\b/.test(line)) {
        logError(filePath, 'Found raw "100vh". Use dvh or dynamic visual viewport heights instead.', idx + 1)
      }
    }
  })

  // Check 2b: Inputs must not use text-xs or text-sm without md: prefix
  if (/\.(jsx|js)$/.test(filePath)) {
    const tagStartRegex = /<(Input|Textarea|CommandInput|input|textarea)\b/g
    let m
    while ((m = tagStartRegex.exec(content)) !== null) {
      const tag = m[1]
      let pos = m.index + m[0].length
      let inBraces = 0
      let inQuote = null
      let attrs = ''
      while (pos < content.length) {
        const ch = content[pos]
        if (inQuote) {
          if (ch === inQuote && content[pos - 1] !== '\\') inQuote = null
        } else if (ch === '"' || ch === "'" || ch === '`') {
          inQuote = ch
        } else if (ch === '{') {
          inBraces++
        } else if (ch === '}') {
          inBraces--
        } else if (ch === '>' && inBraces === 0) {
          break
        }
        attrs += ch
        pos++
      }

      // Check className in attrs
      const classAttr = /className=(?:\{[^}]*\}|"[^"]*"|'[^']*')/g
      let cMatch
      while ((cMatch = classAttr.exec(attrs)) !== null) {
        const fullClassAttr = cMatch[0]
        const classTokens = fullClassAttr.match(/[\w:-]+/g) || []
        for (const cls of classTokens) {
          if (cls === 'text-xs' || cls === 'text-sm') {
            const lineNum = content.slice(0, m.index).split('\n').length
            logError(
              filePath,
              `<${tag}> has forbidden class "${cls}" without responsive prefix (e.g. md:). Use "text-base md:${cls}" or remove it to avoid touch zoom.`,
              lineNum,
            )
          }
        }
      }
    }
  }
}

scanDirectory(srcDir)

if (errors > 0) {
  console.error(`\n💥 Mobile checks failed with ${errors} violation(s).`)
  process.exit(1)
} else {
  console.log('✅ Mobile checks passed: touch safety floor verified, no forbidden viewport units, no small input classes.')
  process.exit(0)
}
