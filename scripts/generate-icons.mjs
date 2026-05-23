// Generates all PWA icon PNGs from an SVG using sharp.
import sharp from 'sharp'
import { writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import path from 'path'

const __dir = path.dirname(fileURLToPath(import.meta.url))
const pub = path.join(__dir, '../public')

// GutCheck mark — a calm sage rounded square with a soft leaf,
// suggesting gut health and gentle, natural tracking.
const SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#8DBA98"/>
      <stop offset="100%" stop-color="#6E9B7C"/>
    </linearGradient>
    <filter id="soft" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="6" stdDeviation="10" flood-color="#3d5944" flood-opacity="0.35"/>
    </filter>
  </defs>

  <rect width="512" height="512" rx="116" fill="url(#bg)"/>

  <!-- Leaf body -->
  <path d="M256 116
           C 168 150 132 244 150 350
           C 256 360 350 320 372 214
           C 332 150 300 124 256 116 Z"
        fill="#FBF8F3" filter="url(#soft)"/>

  <!-- Midrib -->
  <path d="M168 332 C 232 320 304 268 344 192"
        stroke="#8DBA98" stroke-width="20" stroke-linecap="round" fill="none"/>

  <!-- Side veins -->
  <path d="M236 308 C 252 290 260 268 262 244" stroke="#8DBA98" stroke-width="13" stroke-linecap="round" fill="none"/>
  <path d="M286 282 C 304 268 318 248 326 222" stroke="#8DBA98" stroke-width="13" stroke-linecap="round" fill="none"/>
</svg>`

async function generate() {
  const sizes = [
    { name: 'icon-192.png', size: 192 },
    { name: 'icon-512.png', size: 512 },
    { name: 'apple-touch-icon.png', size: 180 },
  ]

  const buf = Buffer.from(SVG)
  writeFileSync(path.join(pub, 'icon.svg'), SVG, 'utf8')
  console.log('wrote icon.svg')

  for (const { name, size } of sizes) {
    await sharp(buf).resize(size, size).png().toFile(path.join(pub, name))
    console.log('wrote', name, size + 'x' + size)
  }
}

generate().catch(e => { console.error(e); process.exit(1) })
