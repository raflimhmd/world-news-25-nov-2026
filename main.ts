// main.ts — make.fun entry for "Sum up 25 November's world news in one image"
// (competition news-image-20261125).
//
// The entry's image is drawn as HTML + CSS + SVG by image-source/make-image.mjs and committed
// beside this program as entry.png. This program ships that whole image to the grader: it reads
// entry.png relative to import.meta.url, proves it is a whole PNG that fits the gate's limits
// (one PNG, at most 1 MiB, at most 1024 by 1024 pixels, every chunk checksummed and the image
// data inflating to the size its header describes), and only then writes it to
// ${MAKEFUN_OUTPUT_DIR ?? '/output'}/entry.png byte for byte, so both runs write the same bytes.
// No network, nothing read outside the repository and the output directory.
//
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { inflateSync } from 'node:zlib';

const MAX_BYTES = 1048576;
const MAX_SIDE = 1024;
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const CHANNELS: Record<number, number> = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 };

const SOURCE = fileURLToPath(new URL('./entry.png', import.meta.url));
const OUT_DIR = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
const TARGET = join(OUT_DIR, 'entry.png');

/** CRC-32 as PNG defines it, over a chunk's type and its data. */
function crc32(bytes: Buffer): number {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ 0xffffffff) >>> 0;
}

type PngInfo = {
  bytes: number; width: number; height: number; bitDepth: number; colorType: number;
  chunks: string[]; inflated: number; expected: number;
};

/**
 * Walk the PNG chunk by chunk, checking every checksum and length, reading the dimensions out of
 * IHDR, and inflating the image data to check it is exactly what IHDR describes. Throws on any
 * damage, so nothing is written unless the source really is a whole PNG.
 */
function inspectPng(file: Buffer): PngInfo {
  if (file.length < 8 || !file.subarray(0, 8).equals(PNG_SIGNATURE)) {
    throw new Error('entry.png is not a PNG: bad signature');
  }

  const chunks: string[] = [];
  const dataParts: Buffer[] = [];
  let offset = 8;
  let width = 0;
  let height = 0;
  let bitDepth = 8;
  let colorType = 6;
  let interlaced = 0;
  let sawEnd = false;

  while (offset + 12 <= file.length) {
    const length = file.readUInt32BE(offset);
    const type = file.toString('latin1', offset + 4, offset + 8);
    const end = offset + 8 + length;
    if (end + 4 > file.length) throw new Error(`PNG chunk ${type} is cut short`);
    const data = file.subarray(offset + 8, end);
    if (file.readUInt32BE(end) !== crc32(Buffer.concat([Buffer.from(type, 'latin1'), data]))) {
      throw new Error(`PNG chunk ${type} has a bad CRC`);
    }
    chunks.push(type);
    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
      interlaced = data[12] ?? 0;
    }
    if (type === 'IDAT') dataParts.push(data);
    if (type === 'IEND') { sawEnd = true; break; }
    offset = end + 4;
  }

  if (!sawEnd) throw new Error('entry.png has no IEND chunk: it is not a whole PNG');
  if (chunks[0] !== 'IHDR' || dataParts.length === 0) {
    throw new Error('entry.png is missing IHDR or IDAT');
  }
  if (interlaced !== 0) throw new Error('interlaced PNGs are not used here');

  const channels = CHANNELS[colorType];
  if (channels === undefined) throw new Error(`unknown PNG colour type ${colorType}`);
  const rowBytes = Math.ceil((width * channels * bitDepth) / 8);
  const expected = height * (rowBytes + 1);
  const inflated = inflateSync(Buffer.concat(dataParts)).length;

  return { bytes: file.length, width, height, bitDepth, colorType, chunks, inflated, expected };
}

function main(): void {
  const file = readFileSync(SOURCE);
  const info = inspectPng(file);

  if (info.bytes > MAX_BYTES) throw new Error(`${info.bytes} bytes is over the ${MAX_BYTES}-byte cap`);
  if (info.width > MAX_SIDE || info.height > MAX_SIDE) {
    throw new Error(`${info.width}x${info.height} is over the ${MAX_SIDE}x${MAX_SIDE} cap`);
  }
  if (info.inflated !== info.expected) {
    throw new Error(`image data inflates to ${info.inflated} bytes, IHDR describes ${info.expected}`);
  }

  // Write through a temporary name in the same directory, then rename: the grader never sees a
  // half-written entry.png, and the bytes are the source image's, unchanged.
  mkdirSync(OUT_DIR, { recursive: true });
  const temp = `${TARGET}.writing`;
  rmSync(temp, { force: true });
  writeFileSync(temp, file);
  renameSync(temp, TARGET);

  const back = readFileSync(TARGET);
  if (!back.equals(file)) throw new Error('the written entry.png is not the source image');

  const digest = createHash('sha256').update(back).digest('hex');
  console.log(
    `entry.png ${info.bytes} bytes ${info.width}x${info.height} ` +
    `${info.chunks.length} chunks sha256 ${digest} -> ${TARGET}`,
  );
}

main();
