import fs from 'fs'
import path from 'path'
import zlib from 'zlib'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// ── CRC32 ──────────────────────────────────────────────────────────────────
const CRC_TABLE = new Uint32Array(256)
for (let i = 0; i < 256; i++) {
  let c = i
  for (let k = 0; k < 8; k++) c = (c & 1) ? 0xEDB88320 ^ (c >>> 1) : c >>> 1
  CRC_TABLE[i] = c
}
function crc32(buf) {
  let crc = 0xFFFFFFFF
  for (let i = 0; i < buf.length; i++) crc = CRC_TABLE[(crc ^ buf[i]) & 0xFF] ^ (crc >>> 8)
  return (crc ^ 0xFFFFFFFF) >>> 0
}

function makeChunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const t = Buffer.from(type, 'ascii')
  const crcBuf = Buffer.alloc(4)
  crcBuf.writeUInt32BE(crc32(Buffer.concat([t, data])))
  return Buffer.concat([len, t, data, crcBuf])
}

// ── Desenha o ícone: fundo azul escuro + pin branco ────────────────────────
function drawIcon(size) {
  const pixels = new Uint8Array(size * size * 4)
  const cx = size / 2
  const cy = size / 2
  const bg = [15, 23, 42]       // #0F172A
  const circle = [37, 99, 235]  // #2563EB
  const white = [255, 255, 255]

  const outerR   = size * 0.42
  const headCy   = cy - outerR * 0.08
  const headR    = outerR * 0.30
  const dotR     = headR * 0.42
  const tailW    = headR * 0.48
  const tailTop  = headCy + headR * 0.72
  const tailBot  = cy + outerR * 0.44

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4
      const dx = x - cx, dy = y - cy
      const dist = Math.sqrt(dx * dx + dy * dy)
      const dxH = x - cx, dyH = y - headCy
      const distH = Math.sqrt(dxH * dxH + dyH * dyH)

      // Progresso do tail: 1 no topo, 0 na ponta
      const tailProgress = tailBot > tailTop ? (tailBot - y) / (tailBot - tailTop) : 0
      const inTail = y >= tailTop && y <= tailBot && Math.abs(x - cx) <= tailW * tailProgress

      let color = bg
      if (dist <= outerR)          color = circle
      if (dist <= outerR && (distH <= headR || inTail)) color = white
      if (dist <= outerR && distH <= dotR) color = circle

      pixels[idx]     = color[0]
      pixels[idx + 1] = color[1]
      pixels[idx + 2] = color[2]
      pixels[idx + 3] = 255
    }
  }
  return pixels
}

function createPNG(size) {
  const pixels = drawIcon(size)

  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8; ihdr[9] = 6  // 8-bit RGBA

  // Raw scanlines com filter byte 0 (None) por linha
  const raw = Buffer.alloc(size * (size * 4 + 1))
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0
    for (let x = 0; x < size; x++) {
      const src = (y * size + x) * 4
      const dst = y * (size * 4 + 1) + 1 + x * 4
      raw[dst]     = pixels[src]
      raw[dst + 1] = pixels[src + 1]
      raw[dst + 2] = pixels[src + 2]
      raw[dst + 3] = pixels[src + 3]
    }
  }

  const idat = zlib.deflateSync(raw, { level: 6 })

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),  // PNG signature
    makeChunk('IHDR', ihdr),
    makeChunk('IDAT', idat),
    makeChunk('IEND', Buffer.alloc(0)),
  ])
}

// ── Gera os arquivos ────────────────────────────────────────────────────────
const outDir = path.join(__dirname, '..', 'public', 'icons')
fs.mkdirSync(outDir, { recursive: true })

for (const size of [192, 512]) {
  const file = path.join(outDir, `icon-${size}.png`)
  fs.writeFileSync(file, createPNG(size))
  console.log(`✓ icon-${size}.png  (${fs.statSync(file).size} bytes)`)
}
