import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const ROOT_DIR = path.resolve(__dirname, '../..')
const PRODUCTS_JSON = path.join(ROOT_DIR, 'backend/database/data/products.json')
const OUTPUT_DIR = path.join(ROOT_DIR, 'frontend/public/demo-products')

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true })
}

/**
 * Deterministic string hash (djb2).
 */
function hashString(str) {
  let hash = 5381
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) + str.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash)
}

/**
 * HSL to Hex converter.
 */
function hslToHex(h, s, l) {
  l /= 100
  const a = (s * Math.min(l, 1 - l)) / 100
  const f = (n) => {
    const k = (n + h / 30) % 12
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1)
    return Math.round(255 * color).toString(16).padStart(2, '0')
  }
  return `#${f(0)}${f(8)}${f(4)}`
}

/**
 * Derives a curated brand-like color palette based on product name and category.
 */
function getPalette(name, categoryId) {
  const hash = hashString(name)

  // Curated category hue seeds
  const catHueMap = {
    1: [0, 25, 140, 200, 350], // Drinks: red, orange, green, blue
    2: [25, 35, 18, 205, 340],  // Coffee: brown, amber, mocha, dark blue
    3: [42, 50, 15, 130, 0],    // Noodles: yellow, orange, spicy red, green
    4: [0, 145, 210, 355, 30],  // Canned: red, green, navy, gold
    5: [32, 45, 280, 150, 5],   // Snacks: orange, yellow, purple, red
    6: [35, 42, 28, 20, 48],    // Bread: golden wheat, warm crust
    7: [120, 28, 10, 45, 345],  // Condiments: green, dark soy, red catsup
    8: [85, 40, 200, 50, 150],  // Rice & cooking: golden, olive, green
    9: [195, 215, 320, 160, 280],// Personal care: aqua, blue, pink, fresh green
    10: [220, 200, 275, 40, 15] // Household: royal blue, cyan, purple
  }

  const hues = catHueMap[categoryId] || [200, 140, 30, 340]
  const baseHue = hues[hash % hues.length]
  const hueVariation = (hash % 11) - 5
  const finalHue = (baseHue + hueVariation + 360) % 360

  const primary = hslToHex(finalHue, 72, 42)
  const primaryLight = hslToHex(finalHue, 70, 56)
  const primaryDark = hslToHex(finalHue, 75, 28)
  const accent = hslToHex((finalHue + 40) % 360, 85, 55)

  return { primary, primaryLight, primaryDark, accent }
}

/**
 * XML escape helper.
 */
function escapeXml(unsafe) {
  return String(unsafe)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

/**
 * Extracts a concise short title (first 2-3 words) and size string.
 */
function extractTitleAndSize(fullName) {
  const sizeMatch = fullName.match(/\b(\d+(?:\.\d+)?\s*(?:ml|l|g|kg|pcs?|sachets?))\b/i)
  const size = sizeMatch ? sizeMatch[0] : ''

  // Clean name: remove size and trailing parentheses
  let clean = fullName.replace(/\b\d+(?:\.\d+)?\s*(?:ml|l|g|kg|pcs?|sachets?)\b/gi, '').trim()
  clean = clean.replace(/\([^)]*\)/g, '').trim()

  const words = clean.split(/\s+/).filter(Boolean)
  let line1 = words.slice(0, 2).join(' ')
  let line2 = words.slice(2, 4).join(' ')

  if (!line2 && words.length > 2) {
    line2 = words.slice(2).join(' ')
  }

  return {
    line1: escapeXml(line1 || fullName),
    line2: escapeXml(line2 || ''),
    size: escapeXml(size)
  }
}

/**
 * Selects the packshot shape based on unit, category, and name.
 */
function determineShape(p) {
  const unit = (p.unit || '').toLowerCase()
  const cat = Number(p.category_id)
  const name = p.name.toLowerCase()

  if (unit === 'can' || cat === 4) return 'can'
  if (unit === 'bottle' || name.includes('water') || name.includes('catsup') || name.includes('sauce') || name.includes('bleach') || name.includes('cooking oil')) return 'bottle'
  if (unit === 'cup' || p.sku === 'TT-NOO-004') return 'cup'
  if (unit === 'sachet' || cat === 2 || name.includes('shampoo') || name.includes('downy') || name.includes('powder') || name.includes('dishwashing')) return 'sachet'
  if (cat === 6) {
    if (name.includes('bread') || unit === 'pack') return 'loaf'
    return 'bread'
  }
  if (name.includes('safeguard') || (cat === 9 && (unit === 'bar' || unit === 'pc'))) return 'bar'
  if (name.includes('posporo') || name.includes('cube')) return 'box'
  if (unit === 'pack' || cat === 3 || cat === 5) return 'pack'

  return 'box'
}

/**
 * SVG template generators for each product shape.
 */
const shapes = {
  can({ primary, primaryLight, primaryDark, accent }, { line1, line2, size }) {
    return `
      <!-- Base Ground Shadow -->
      <ellipse cx="256" cy="460" rx="130" ry="24" fill="black" opacity="0.12" />

      <!-- Can Cylinder Bottom Rim -->
      <ellipse cx="256" cy="420" rx="115" ry="32" fill="#9ca3af" />
      <ellipse cx="256" cy="417" rx="114" ry="30" fill="${primaryDark}" />

      <!-- Can Body -->
      <path d="M141 120 C141 120 141 417 141 417 C141 435 256 447 256 447 C256 447 371 435 371 417 L371 120 Z" fill="url(#bodyGrad)" />

      <!-- Label Wrap -->
      <path d="M141 180 C141 180 141 360 141 360 C180 375 332 375 371 360 L371 180 C332 195 180 195 141 180 Z" fill="#ffffff" />
      <path d="M141 190 C180 205 332 205 371 190 L371 196 C332 211 180 211 141 196 Z" fill="${accent}" opacity="0.8" />
      <path d="M141 345 C180 360 332 360 371 345 L371 351 C332 366 180 366 141 351 Z" fill="${accent}" opacity="0.8" />

      <!-- Can Top Rim -->
      <path d="M141 120 C141 102 256 90 256 90 C256 90 371 102 371 120 C371 138 256 150 256 150 C256 150 141 138 141 120 Z" fill="url(#silverTop)" />
      <ellipse cx="256" cy="120" rx="100" ry="22" fill="#d1d5db" />
      <ellipse cx="256" cy="119" rx="94" ry="19" fill="#f3f4f6" />
      <ellipse cx="256" cy="119" rx="80" ry="14" fill="#e5e7eb" />
      <!-- Pull Tab -->
      <path d="M246 114 C246 110 266 110 266 114 L264 128 L248 128 Z" fill="#9ca3af" />
      <circle cx="256" cy="117" r="4" fill="#6b7280" />

      <!-- Specular Highlight Curve -->
      <path d="M175 135 L175 425 C170 423 166 420 162 418 L162 130 C166 132 170 134 175 135 Z" fill="#ffffff" opacity="0.35" />

      <!-- Label Text -->
      <text x="256" y="240" font-family="system-ui, -apple-system, sans-serif" font-weight="800" font-size="28" fill="#1f2937" text-anchor="middle">${line1}</text>
      ${line2 ? `<text x="256" y="275" font-family="system-ui, -apple-system, sans-serif" font-weight="700" font-size="22" fill="#4b5563" text-anchor="middle">${line2}</text>` : ''}
      ${size ? `
        <rect x="206" y="298" width="100" height="26" rx="13" fill="${primary}" />
        <text x="256" y="316" font-family="system-ui, -apple-system, sans-serif" font-weight="700" font-size="15" fill="#ffffff" text-anchor="middle">${size}</text>
      ` : ''}

      <defs>
        <linearGradient id="bodyGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stop-color="${primaryDark}" />
          <stop offset="25%" stop-color="${primaryLight}" />
          <stop offset="70%" stop-color="${primary}" />
          <stop offset="100%" stop-color="${primaryDark}" />
        </linearGradient>
        <linearGradient id="silverTop" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#f9fafb" />
          <stop offset="50%" stop-color="#9ca3af" />
          <stop offset="100%" stop-color="#4b5563" />
        </linearGradient>
      </defs>`
  },

  bottle({ primary, primaryLight, primaryDark, accent }, { line1, line2, size }) {
    return `
      <!-- Base Ground Shadow -->
      <ellipse cx="256" cy="466" rx="100" ry="20" fill="black" opacity="0.13" />

      <!-- Bottle Body & Neck -->
      <path d="M232 50 L280 50 L280 110 C280 140 336 170 336 215 L336 430 C336 448 256 456 256 456 C256 456 176 448 176 430 L176 215 C176 170 232 140 232 110 Z" fill="url(#bottleGrad)" />

      <!-- Bottle Cap -->
      <rect x="230" y="36" width="52" height="20" rx="3" fill="#e5e7eb" stroke="#9ca3af" stroke-width="2" />
      <line x1="230" y1="42" x2="282" y2="42" stroke="#6b7280" stroke-width="1.5" />
      <line x1="230" y1="48" x2="282" y2="48" stroke="#6b7280" stroke-width="1.5" />
      <rect x="232" y="28" width="48" height="10" rx="4" fill="${accent}" />

      <!-- Label Wrap -->
      <rect x="176" y="240" width="160" height="140" fill="#ffffff" />
      <rect x="176" y="240" width="160" height="8" fill="${primary}" />
      <rect x="176" y="372" width="160" height="8" fill="${primary}" />

      <!-- Specular Highlight Sheen -->
      <path d="M200 135 C190 150 190 180 190 220 L190 435 C185 433 182 430 180 425 L180 215 C180 175 190 145 200 135 Z" fill="#ffffff" opacity="0.4" />

      <!-- Label Text -->
      <text x="256" y="288" font-family="system-ui, -apple-system, sans-serif" font-weight="800" font-size="24" fill="#1f2937" text-anchor="middle">${line1}</text>
      ${line2 ? `<text x="256" y="318" font-family="system-ui, -apple-system, sans-serif" font-weight="700" font-size="18" fill="#4b5563" text-anchor="middle">${line2}</text>` : ''}
      ${size ? `
        <rect x="211" y="336" width="90" height="24" rx="12" fill="${accent}" />
        <text x="256" y="353" font-family="system-ui, -apple-system, sans-serif" font-weight="800" font-size="14" fill="#ffffff" text-anchor="middle">${size}</text>
      ` : ''}

      <defs>
        <linearGradient id="bottleGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stop-color="${primaryDark}" />
          <stop offset="30%" stop-color="${primaryLight}" />
          <stop offset="70%" stop-color="${primary}" />
          <stop offset="100%" stop-color="${primaryDark}" />
        </linearGradient>
      </defs>`
  },

  sachet({ primary, primaryLight, primaryDark, accent }, { line1, line2, size }) {
    return `
      <!-- Base Ground Shadow -->
      <ellipse cx="256" cy="460" rx="125" ry="20" fill="black" opacity="0.12" />

      <!-- Sachet Body -->
      <rect x="146" y="70" width="220" height="370" rx="10" fill="url(#sachetGrad)" />

      <!-- Crimped Top & Bottom Seams -->
      <path d="M146 70 L366 70 L366 100 L146 100 Z" fill="${primaryDark}" opacity="0.6" />
      <path d="M146 70 L366 70" stroke="#ffffff" stroke-width="2" stroke-dasharray="6,4" opacity="0.7" />
      <path d="M146 85 L366 85" stroke="#ffffff" stroke-width="1.5" stroke-dasharray="6,4" opacity="0.5" />
      <path d="M146 410 L366 410 L366 440 L146 440 Z" fill="${primaryDark}" opacity="0.6" />
      <path d="M146 425 L366 425" stroke="#ffffff" stroke-width="2" stroke-dasharray="6,4" opacity="0.7" />

      <!-- Tear Notch on Top Left -->
      <polygon points="146,82 156,86 146,90" fill="#ffffff" opacity="0.9" />

      <!-- Diagonal Gloss Sheen -->
      <path d="M150 110 L270 110 L200 400 L150 400 Z" fill="#ffffff" opacity="0.18" />

      <!-- Center Brand Badge -->
      <rect x="166" y="170" width="180" height="170" rx="16" fill="#ffffff" filter="drop-shadow(0px 4px 6px rgba(0,0,0,0.15))" />
      <rect x="176" y="180" width="160" height="6" rx="3" fill="${accent}" />

      <!-- Text -->
      <text x="256" y="235" font-family="system-ui, -apple-system, sans-serif" font-weight="800" font-size="24" fill="#111827" text-anchor="middle">${line1}</text>
      ${line2 ? `<text x="256" y="268" font-family="system-ui, -apple-system, sans-serif" font-weight="700" font-size="18" fill="#4b5563" text-anchor="middle">${line2}</text>` : ''}
      ${size ? `
        <rect x="206" y="290" width="100" height="26" rx="13" fill="${primary}" />
        <text x="256" y="308" font-family="system-ui, -apple-system, sans-serif" font-weight="700" font-size="14" fill="#ffffff" text-anchor="middle">${size}</text>
      ` : ''}

      <defs>
        <linearGradient id="sachetGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="${primaryLight}" />
          <stop offset="60%" stop-color="${primary}" />
          <stop offset="100%" stop-color="${primaryDark}" />
        </linearGradient>
      </defs>`
  },

  pack({ primary, primaryLight, primaryDark, accent }, { line1, line2, size }) {
    return `
      <!-- Base Ground Shadow -->
      <ellipse cx="256" cy="462" rx="140" ry="22" fill="black" opacity="0.14" />

      <!-- Pillow Pack Contour -->
      <path d="M126 100 C150 90 362 90 386 100 C406 200 406 320 386 420 C362 430 150 430 126 420 C106 320 106 200 126 100 Z" fill="url(#packGrad)" />

      <!-- Top and Bottom Crimped Ribs -->
      <path d="M126 100 C150 90 362 90 386 100 L382 120 C360 112 152 112 130 120 Z" fill="${primaryDark}" opacity="0.7" />
      <path d="M126 420 C150 430 362 430 386 420 L382 400 C360 408 152 408 130 400 Z" fill="${primaryDark}" opacity="0.7" />

      <!-- Dynamic Diagonal Band -->
      <path d="M116 220 Q256 250 396 210 L392 330 Q256 370 118 340 Z" fill="#ffffff" opacity="0.95" />
      <path d="M116 220 Q256 250 396 210 L395 224 Q256 264 116 234 Z" fill="${accent}" />

      <!-- Highlight Arc -->
      <path d="M136 130 Q116 260 136 390 Q146 390 146 130 Z" fill="#ffffff" opacity="0.25" />

      <!-- Product Text on Band -->
      <text x="256" y="272" font-family="system-ui, -apple-system, sans-serif" font-weight="900" font-size="28" fill="#111827" text-anchor="middle">${line1}</text>
      ${line2 ? `<text x="256" y="306" font-family="system-ui, -apple-system, sans-serif" font-weight="700" font-size="20" fill="#4b5563" text-anchor="middle">${line2}</text>` : ''}
      ${size ? `
        <rect x="206" y="360" width="100" height="28" rx="14" fill="#ffffff" stroke="${primary}" stroke-width="2" />
        <text x="256" y="379" font-family="system-ui, -apple-system, sans-serif" font-weight="800" font-size="15" fill="${primary}" text-anchor="middle">${size}</text>
      ` : ''}

      <defs>
        <linearGradient id="packGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="${primaryLight}" />
          <stop offset="50%" stop-color="${primary}" />
          <stop offset="100%" stop-color="${primaryDark}" />
        </linearGradient>
      </defs>`
  },

  cup({ primary, primaryLight, primaryDark, accent }, { line1, line2, size }) {
    return `
      <!-- Base Ground Shadow -->
      <ellipse cx="256" cy="460" rx="115" ry="22" fill="black" opacity="0.13" />

      <!-- Tapered Cup Body -->
      <path d="M146 110 L366 110 L326 430 C326 444 186 444 186 430 Z" fill="url(#cupGrad)" />

      <!-- Cup Rim & Foil Lid -->
      <ellipse cx="256" cy="110" rx="115" ry="26" fill="#e5e7eb" stroke="#9ca3af" stroke-width="2" />
      <ellipse cx="256" cy="107" rx="108" ry="22" fill="#ffffff" />
      <ellipse cx="256" cy="107" rx="90" ry="16" fill="${accent}" opacity="0.3" />

      <!-- Center Label Wrap -->
      <path d="M156 190 L356 190 L341 330 L171 330 Z" fill="#ffffff" />
      <rect x="156" y="190" width="200" height="8" fill="${accent}" />
      <rect x="171" y="322" width="170" height="8" fill="${accent}" />

      <!-- Text -->
      <text x="256" y="246" font-family="system-ui, -apple-system, sans-serif" font-weight="900" font-size="24" fill="#111827" text-anchor="middle">${line1}</text>
      ${line2 ? `<text x="256" y="278" font-family="system-ui, -apple-system, sans-serif" font-weight="700" font-size="19" fill="#4b5563" text-anchor="middle">${line2}</text>` : ''}
      ${size ? `
        <rect x="211" y="294" width="90" height="22" rx="11" fill="${primary}" />
        <text x="256" y="310" font-family="system-ui, -apple-system, sans-serif" font-weight="700" font-size="13" fill="#ffffff" text-anchor="middle">${size}</text>
      ` : ''}

      <defs>
        <linearGradient id="cupGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stop-color="${primaryDark}" />
          <stop offset="25%" stop-color="${primaryLight}" />
          <stop offset="70%" stop-color="${primary}" />
          <stop offset="100%" stop-color="${primaryDark}" />
        </linearGradient>
      </defs>`
  },

  loaf({ primary, primaryLight, primaryDark, accent }, { line1, line2, size }) {
    return `
      <!-- Base Ground Shadow -->
      <ellipse cx="256" cy="460" rx="135" ry="22" fill="black" opacity="0.12" />

      <!-- Bread Bag Contour -->
      <rect x="146" y="110" width="220" height="330" rx="28" fill="url(#breadGrad)" />

      <!-- Tied Top bunch -->
      <polygon points="236,75 276,75 266,110 246,110" fill="#ffffff" opacity="0.8" />
      <rect x="238" y="90" width="36" height="12" rx="3" fill="#ef4444" /> <!-- Twist tie -->

      <!-- Clear Plastic Window with Bread Texture -->
      <rect x="176" y="140" width="160" height="100" rx="14" fill="#fde68a" opacity="0.85" />
      <circle cx="210" cy="180" r="16" fill="#d97706" opacity="0.3" />
      <circle cx="260" cy="190" r="20" fill="#d97706" opacity="0.3" />
      <circle cx="305" cy="175" r="14" fill="#d97706" opacity="0.3" />

      <!-- Lower Label Area -->
      <rect x="146" y="260" width="220" height="160" fill="#ffffff" opacity="0.95" />
      <rect x="146" y="260" width="220" height="8" fill="${primary}" />

      <!-- Text -->
      <text x="256" y="315" font-family="system-ui, -apple-system, sans-serif" font-weight="900" font-size="26" fill="#111827" text-anchor="middle">${line1}</text>
      ${line2 ? `<text x="256" y="348" font-family="system-ui, -apple-system, sans-serif" font-weight="700" font-size="20" fill="#4b5563" text-anchor="middle">${line2}</text>` : ''}
      ${size ? `
        <rect x="206" y="370" width="100" height="26" rx="13" fill="${accent}" />
        <text x="256" y="388" font-family="system-ui, -apple-system, sans-serif" font-weight="800" font-size="15" fill="#ffffff" text-anchor="middle">${size}</text>
      ` : ''}

      <defs>
        <linearGradient id="breadGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#ffffff" stop-opacity="0.9" />
          <stop offset="100%" stop-color="#f3f4f6" stop-opacity="0.95" />
        </linearGradient>
      </defs>`
  },

  bread({ primary, primaryLight, primaryDark, accent }, { line1, line2, size }) {
    return `
      <!-- Base Ground Shadow -->
      <ellipse cx="256" cy="460" rx="130" ry="24" fill="black" opacity="0.12" />

      <!-- Kraft Paper / Bakery Bag -->
      <path d="M146 110 L366 110 L356 440 L156 440 Z" fill="#d97706" opacity="0.85" />
      <!-- Serrated bag top -->
      <path d="M146 110 L166 95 L186 110 L206 95 L226 110 L246 95 L266 110 L286 95 L306 110 L326 95 L346 110 L366 95 L366 110 Z" fill="#b45309" />

      <!-- Center Stamp Label -->
      <rect x="176" y="190" width="160" height="180" rx="16" fill="#fffbeb" stroke="#92400e" stroke-width="2" />
      <circle cx="256" cy="240" r="32" fill="#fde68a" />
      <path d="M236 240 Q256 220 276 240" stroke="#92400e" stroke-width="3" fill="none" />

      <!-- Text -->
      <text x="256" y="296" font-family="system-ui, -apple-system, sans-serif" font-weight="900" font-size="24" fill="#78350f" text-anchor="middle">${line1}</text>
      ${line2 ? `<text x="256" y="324" font-family="system-ui, -apple-system, sans-serif" font-weight="700" font-size="18" fill="#92400e" text-anchor="middle">${line2}</text>` : ''}
      ${size ? `
        <rect x="211" y="336" width="90" height="22" rx="11" fill="#92400e" />
        <text x="256" y="352" font-family="system-ui, -apple-system, sans-serif" font-weight="700" font-size="13" fill="#ffffff" text-anchor="middle">${size}</text>
      ` : ''}
    `
  },

  bar({ primary, primaryLight, primaryDark, accent }, { line1, line2, size }) {
    return `
      <!-- Base Ground Shadow -->
      <ellipse cx="256" cy="450" rx="140" ry="24" fill="black" opacity="0.12" />

      <!-- Soap Bar Body -->
      <rect x="136" y="140" width="240" height="280" rx="40" fill="url(#barGrad)" />

      <!-- Bevel Edge Emboss -->
      <rect x="156" y="160" width="200" height="240" rx="30" fill="none" stroke="#ffffff" stroke-width="3" opacity="0.4" />

      <!-- Center Brand Band -->
      <rect x="136" y="220" width="240" height="120" fill="#ffffff" opacity="0.9" />
      <rect x="136" y="220" width="240" height="6" fill="${accent}" />
      <rect x="136" y="334" width="240" height="6" fill="${accent}" />

      <!-- Text -->
      <text x="256" y="272" font-family="system-ui, -apple-system, sans-serif" font-weight="900" font-size="26" fill="#1f2937" text-anchor="middle">${line1}</text>
      ${line2 ? `<text x="256" y="302" font-family="system-ui, -apple-system, sans-serif" font-weight="700" font-size="18" fill="#4b5563" text-anchor="middle">${line2}</text>` : ''}
      ${size ? `
        <rect x="211" y="360" width="90" height="24" rx="12" fill="${primary}" />
        <text x="256" y="377" font-family="system-ui, -apple-system, sans-serif" font-weight="800" font-size="14" fill="#ffffff" text-anchor="middle">${size}</text>
      ` : ''}

      <defs>
        <linearGradient id="barGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="${primaryLight}" />
          <stop offset="50%" stop-color="${primary}" />
          <stop offset="100%" stop-color="${primaryDark}" />
        </linearGradient>
      </defs>`
  },

  box({ primary, primaryLight, primaryDark, accent }, { line1, line2, size }) {
    return `
      <!-- Base Ground Shadow -->
      <ellipse cx="256" cy="460" rx="135" ry="24" fill="black" opacity="0.14" />

      <!-- 3D Box Carton -->
      <path d="M146 130 L366 130 L366 430 L146 430 Z" fill="url(#boxFront)" />
      <path d="M146 130 L200 80 L420 80 L366 130 Z" fill="${primaryLight}" />
      <path d="M366 130 L420 80 L420 380 L366 430 Z" fill="${primaryDark}" />

      <!-- Center Label Area -->
      <rect x="166" y="190" width="180" height="180" rx="14" fill="#ffffff" opacity="0.95" />
      <rect x="166" y="190" width="180" height="8" rx="4" fill="${accent}" />

      <!-- Text -->
      <text x="256" y="255" font-family="system-ui, -apple-system, sans-serif" font-weight="900" font-size="26" fill="#111827" text-anchor="middle">${line1}</text>
      ${line2 ? `<text x="256" y="288" font-family="system-ui, -apple-system, sans-serif" font-weight="700" font-size="19" fill="#4b5563" text-anchor="middle">${line2}</text>` : ''}
      ${size ? `
        <rect x="206" y="310" width="100" height="26" rx="13" fill="${primary}" />
        <text x="256" y="328" font-family="system-ui, -apple-system, sans-serif" font-weight="700" font-size="14" fill="#ffffff" text-anchor="middle">${size}</text>
      ` : ''}

      <defs>
        <linearGradient id="boxFront" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="${primaryLight}" />
          <stop offset="60%" stop-color="${primary}" />
          <stop offset="100%" stop-color="${primaryDark}" />
        </linearGradient>
      </defs>`
  }
}

/**
 * Main generate function.
 */
export function generateDemoArt() {
  const products = JSON.parse(fs.readFileSync(PRODUCTS_JSON, 'utf8'))
  console.log(`Generating packshot art for ${products.length} products...`)

  let count = 0
  for (const p of products) {
    const sku = (p.sku || '').toLowerCase()
    if (!sku) continue

    const palette = getPalette(p.name, p.category_id)
    const textInfo = extractTitleAndSize(p.name)
    const shape = determineShape(p)
    const renderShape = shapes[shape] || shapes.box

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <rect width="512" height="512" fill="none" />
  <g id="packshot">
    ${renderShape(palette, textInfo).trim()}
  </g>
</svg>`.trim()

    // Validate size <= 6KB
    const byteSize = Buffer.byteLength(svg, 'utf8')
    if (byteSize > 6144) {
      console.warn(`⚠️ Warning: ${sku}.svg is ${byteSize} bytes (exceeds 6KB limit)`)
    }

    const outPath = path.join(OUTPUT_DIR, `${sku}.svg`)
    fs.writeFileSync(outPath, svg, 'utf8')
    count++
  }

  console.log(`✅ Successfully generated ${count} demo packshots in ${OUTPUT_DIR}`)
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  generateDemoArt()
}
