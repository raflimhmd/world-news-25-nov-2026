// make-image.mjs — renders image-source/index.html to entry.png with headless Chromium.
//
// The entry image is drawn as HTML + CSS + SVG (no raster assets, no network, no downloaded
// fonts): only DejaVu Sans / DejaVu Serif / DejaVu Sans Mono are used, through font stacks.
// This script is the render step of the build, kept here so the image is reproducible:
//
//   node image-source/make-image.mjs
//
// It writes ../entry.png next to the repository root, checks the PNG it produced against the
// competition's limits (whole PNG, <= 1 MiB, <= 1024x1024) and prints the numbers it measured.

import { spawnSync } from 'node:child_process';
import { readFileSync, existsSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const here = fileURLToPath(new URL('.', import.meta.url));
const source = here + 'index.html';
const target = here + '..' + '/entry.png';

const CHROME = process.env.CHROME
  ?? '/root/.hermes/tools/chromium-1248/chrome-linux64/chrome';

if (!existsSync(CHROME)) {
  console.error(`chromium not found at ${CHROME} (set CHROME=/path/to/chrome)`);
  process.exit(1);
}
rmSync(target, { force: true });

const args = [
  '--headless', '--disable-gpu', '--no-sandbox', '--hide-scrollbars',
  '--force-device-scale-factor=1', '--window-size=1024,1024',
  '--virtual-time-budget=2000',
  `--screenshot=${target}`,
  `file://${source}`,
];
const run = spawnSync(CHROME, args, { encoding: 'utf8' });
if (run.status !== 0) {
  console.error(run.stderr || run.stdout);
  process.exit(run.status ?? 1);
}

// ---- check what we rendered -------------------------------------------------
const png = readFileSync(target);
const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
if (!png.subarray(0, 8).equals(sig)) throw new Error('not a PNG');

let off = 8;
const chunks = [];
let width = 0;
let height = 0;
let ended = false;
while (off + 8 <= png.length) {
  const len = png.readUInt32BE(off);
  const type = png.toString('latin1', off + 4, off + 8);
  const body = png.subarray(off + 8, off + 8 + len);
  const crc = png.readUInt32BE(off + 8 + len);
  const want = crc32(Buffer.concat([Buffer.from(type, 'latin1'), body])) >>> 0;
  if (crc !== want) throw new Error(`bad CRC on ${type}`);
  chunks.push(type);
  if (type === 'IHDR') {
    width = body.readUInt32BE(0);
    height = body.readUInt32BE(4);
  }
  if (type === 'IEND') { ended = true; break; }
  off += 12 + len;
}

function crc32(buf) {
  let c = ~0;
  for (const b of buf) {
    c ^= b;
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c;
}

const idat = chunks.filter((c) => c === 'IDAT').length;
console.log(`entry.png  ${png.length} bytes`);
console.log(`dimensions ${width}x${height}`);
console.log(`chunks     ${chunks.join(' ')}  (IDAT: ${idat})`);
console.log(`sha256     ${createHash('sha256').update(png).digest('hex')}`);
console.log(`whole PNG  ${ended && idat > 0 ? 'yes' : 'NO'}`);
console.log(`within caps ${png.length <= 1048576 && width <= 1024 && height <= 1024 ? 'yes' : 'NO'}`);
