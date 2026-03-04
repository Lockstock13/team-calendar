#!/usr/bin/env node
/**
 * generate-icons.mjs
 * Generates PWA icons (192x192 and 512x512) as solid-color PNGs
 * using only Node.js built-in modules — no extra dependencies needed.
 *
 * Usage:  node scripts/generate-icons.mjs
 * Output: public/icon-192.png  public/icon-96.png  public/icon-512.png
 */

import { deflateSync } from "zlib";
import { writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, "..", "public");

mkdirSync(publicDir, { recursive: true });

// ─── App brand colours ────────────────────────────────────────────────────────
const BG   = [30, 41, 59];   // #1e293b  (primary dark)
const FG   = [248, 250, 252]; // #f8fafc  (primary foreground)

// ─── CRC-32 (required by PNG spec) ───────────────────────────────────────────
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let crc = 0xffffffff;
  for (const byte of buf) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBytes = Buffer.from(type, "ascii");
  const lenBuf    = Buffer.allocUnsafe(4);
  const crcBuf    = Buffer.allocUnsafe(4);
  lenBuf.writeUInt32BE(data.length, 0);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBytes, data])), 0);
  return Buffer.concat([lenBuf, typeBytes, data, crcBuf]);
}

// ─── Simple bitmap renderer ───────────────────────────────────────────────────
// Returns an RGBA pixel array (Uint8Array, length = size*size*4)
function renderIcon(size) {
  const pixels = new Uint8Array(size * size * 4);
  const cx = size / 2;
  const cy = size / 2;
  const r  = size * 0.5;          // full-bleed circle / rounded square
  const pad = size * 0.16;        // inner padding for the "camera" glyph

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;

      // ── Background: rounded-square (squircle-ish) ──────────────────────────
      const dx = Math.abs(x - cx);
      const dy = Math.abs(y - cy);
      const cornerR = size * 0.22; // corner radius
      const inSquare = dx <= cx - cornerR || dy <= cy - cornerR ||
        Math.hypot(dx - (cx - cornerR), dy - (cy - cornerR)) <= cornerR;

      if (!inSquare) {
        // Transparent outside the rounded square
        pixels[idx]     = 0;
        pixels[idx + 1] = 0;
        pixels[idx + 2] = 0;
        pixels[idx + 3] = 0;
        continue;
      }

      // ── Default: background colour ─────────────────────────────────────────
      let [pr, pg, pb, pa] = [...BG, 255];

      // ── Camera body (rounded rect in the center) ───────────────────────────
      const bodyX1 = cx - size * 0.28;
      const bodyX2 = cx + size * 0.28;
      const bodyY1 = cy - size * 0.18;
      const bodyY2 = cy + size * 0.22;
      const bodyR  = size * 0.06;

      const inBodyX = x >= bodyX1 && x <= bodyX2;
      const inBodyY = y >= bodyY1 && y <= bodyY2;
      const bCorners = (
        (x < bodyX1 + bodyR && y < bodyY1 + bodyR &&
          Math.hypot(x - (bodyX1 + bodyR), y - (bodyY1 + bodyR)) > bodyR) ||
        (x > bodyX2 - bodyR && y < bodyY1 + bodyR &&
          Math.hypot(x - (bodyX2 - bodyR), y - (bodyY1 + bodyR)) > bodyR) ||
        (x < bodyX1 + bodyR && y > bodyY2 - bodyR &&
          Math.hypot(x - (bodyX1 + bodyR), y - (bodyY2 - bodyR)) > bodyR) ||
        (x > bodyX2 - bodyR && y > bodyY2 - bodyR &&
          Math.hypot(x - (bodyX2 - bodyR), y - (bodyY2 - bodyR)) > bodyR)
      );

      const inBody = inBodyX && inBodyY && !bCorners;

      // Viewfinder bump (top-center rectangle)
      const bumpW = size * 0.14;
      const bumpH = size * 0.07;
      const inBump = (
        x >= cx - bumpW / 2 && x <= cx + bumpW / 2 &&
        y >= bodyY1 - bumpH && y <= bodyY1
      );

      if (inBody || inBump) {
        [pr, pg, pb] = FG;
      }

      // ── Lens (circle inside body) ──────────────────────────────────────────
      const lensR    = size * 0.12;
      const lensInR  = size * 0.075;
      const dist     = Math.hypot(x - cx, y - (cy + size * 0.02));

      if (dist <= lensR && dist > lensInR) {
        // Lens ring — use BG colour as contrast ring on FG body
        [pr, pg, pb] = BG;
      } else if (dist <= lensInR) {
        // Lens inner — slightly lighter than BG
        pr = BG[0] + 20; pg = BG[1] + 28; pb = BG[2] + 46;
      }

      pixels[idx]     = pr;
      pixels[idx + 1] = pg;
      pixels[idx + 2] = pb;
      pixels[idx + 3] = pa;
    }
  }
  return pixels;
}

// ─── Encode pixels → PNG bytes ────────────────────────────────────────────────
function encodePNG(size, pixels) {
  // PNG signature
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR
  const ihdr = Buffer.allocUnsafe(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr.writeUInt8(8,  8);  // bit depth
  ihdr.writeUInt8(6,  9);  // colour type 6 = RGBA
  ihdr.writeUInt8(0, 10);  // compression
  ihdr.writeUInt8(0, 11);  // filter
  ihdr.writeUInt8(0, 12);  // interlace

  // Raw (uncompressed) scanlines: filter-byte(0) + RGBA * width, per row
  const raw = Buffer.allocUnsafe(size * (1 + size * 4));
  for (let y = 0; y < size; y++) {
    const rowStart = y * (1 + size * 4);
    raw[rowStart] = 0; // filter = None
    for (let x = 0; x < size; x++) {
      const src  = (y * size + x) * 4;
      const dst  = rowStart + 1 + x * 4;
      raw[dst]     = pixels[src];
      raw[dst + 1] = pixels[src + 1];
      raw[dst + 2] = pixels[src + 2];
      raw[dst + 3] = pixels[src + 3];
    }
  }

  const idat = deflateSync(raw, { level: 6 });

  return Buffer.concat([
    sig,
    chunk("IHDR", ihdr),
    chunk("IDAT", idat),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// ─── Generate & write ─────────────────────────────────────────────────────────
const sizes = [
  { size: 96,  file: "icon-96.png"  },
  { size: 192, file: "icon-192.png" },
  { size: 512, file: "icon-512.png" },
];

for (const { size, file } of sizes) {
  const pixels = renderIcon(size);
  const png    = encodePNG(size, pixels);
  const dest   = join(publicDir, file);
  writeFileSync(dest, png);
  console.log(`✅  ${file}  (${size}×${size})  →  ${dest}`);
}

console.log("\nDone! Replace these files with your own branded icons any time.");
