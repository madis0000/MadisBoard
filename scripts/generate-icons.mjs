/**
 * Generate placeholder MadisBoard icons
 * Uses only Node.js built-ins (no external dependencies)
 * Creates solid-color PNG files with the brand color
 */
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { deflateSync } from 'node:zlib';

// Brand colors
const BG_COLOR = { r: 26, g: 26, b: 46 }; // #1a1a2e
const ACCENT_COLOR = { r: 88, g: 166, b: 255 }; // #58a6ff

function createPNG(width, height, color = BG_COLOR) {
  // Create raw pixel data (RGBA)
  const rawData = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    rawData[y * (width * 4 + 1)] = 0; // filter byte (None)
    for (let x = 0; x < width; x++) {
      const offset = y * (width * 4 + 1) + 1 + x * 4;
      // Create a simple centered circle/square pattern
      const cx = width / 2,
        cy = height / 2;
      const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
      const radius = Math.min(width, height) * 0.4;
      if (dist < radius) {
        rawData[offset] = ACCENT_COLOR.r;
        rawData[offset + 1] = ACCENT_COLOR.g;
        rawData[offset + 2] = ACCENT_COLOR.b;
        rawData[offset + 3] = 255;
      } else {
        rawData[offset] = color.r;
        rawData[offset + 1] = color.g;
        rawData[offset + 2] = color.b;
        rawData[offset + 3] = 255;
      }
    }
  }

  const compressed = deflateSync(rawData);

  // Build PNG file
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type (RGBA)
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  // IEND chunk
  const iend = Buffer.alloc(0);

  function makeChunk(type, data) {
    const length = Buffer.alloc(4);
    length.writeUInt32BE(data.length, 0);
    const typeBuffer = Buffer.from(type);
    const crcData = Buffer.concat([typeBuffer, data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(crcData), 0);
    return Buffer.concat([length, typeBuffer, data, crc]);
  }

  return Buffer.concat([
    signature,
    makeChunk('IHDR', ihdr),
    makeChunk('IDAT', compressed),
    makeChunk('IEND', iend),
  ]);
}

// CRC32 implementation
function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function createICO(pngBuffers) {
  // ICO header
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type (ICO)
  header.writeUInt16LE(pngBuffers.length, 4); // count

  let offset = 6 + pngBuffers.length * 16;
  const entries = [];
  for (const { width, buffer } of pngBuffers) {
    const entry = Buffer.alloc(16);
    entry[0] = width >= 256 ? 0 : width; // width
    entry[1] = width >= 256 ? 0 : width; // height
    entry[2] = 0; // color palette
    entry[3] = 0; // reserved
    entry.writeUInt16LE(1, 4); // color planes
    entry.writeUInt16LE(32, 6); // bits per pixel
    entry.writeUInt32LE(buffer.length, 8); // size
    entry.writeUInt32LE(offset, 12); // offset
    entries.push(entry);
    offset += buffer.length;
  }

  return Buffer.concat([header, ...entries, ...pngBuffers.map(p => p.buffer)]);
}

function ensureDir(filePath) {
  const dir = dirname(filePath);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

function writeIcon(filePath, buffer) {
  ensureDir(filePath);
  writeFileSync(filePath, buffer);
  console.log(`  Created: ${filePath}`);
}

// Generate all required icons
const ROOT = join(
  dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1')),
  '..'
);

console.log('Generating MadisBoard placeholder icons...\n');

// Web favicons
const webIconDir = join(ROOT, 'packages/frontend/core/public');
const sizes = [32, 36, 48, 72, 96, 144, 192];

console.log('Web favicons:');
for (const size of sizes) {
  writeIcon(join(webIconDir, `favicon-${size}.png`), createPNG(size, size));
}
writeIcon(join(webIconDir, 'apple-touch-icon.png'), createPNG(180, 180));

// Create favicon.ico (multi-size)
const icoSizes = [16, 32, 48];
const icoPngs = icoSizes.map(size => ({
  width: size,
  buffer: createPNG(size, size),
}));
writeIcon(join(webIconDir, 'favicon.ico'), createICO(icoPngs));

// Electron icons
const electronIconDir = join(
  ROOT,
  'packages/frontend/apps/electron/resources/icons'
);
console.log('\nElectron icons:');

const buildTypes = ['stable', 'beta', 'canary', 'internal'];
for (const bt of buildTypes) {
  writeIcon(
    join(electronIconDir, `icon_${bt}_512x512.png`),
    createPNG(512, 512)
  );
  writeIcon(join(electronIconDir, `icon_${bt}_64x64.png`), createPNG(64, 64));

  // ICO files
  const icoBuffer = createICO([
    { width: 16, buffer: createPNG(16, 16) },
    { width: 32, buffer: createPNG(32, 32) },
    { width: 48, buffer: createPNG(48, 48) },
    { width: 256, buffer: createPNG(256, 256) },
  ]);
  if (bt === 'stable') {
    writeIcon(join(electronIconDir, 'icon.ico'), icoBuffer);
    writeIcon(join(electronIconDir, 'icon.png'), createPNG(512, 512));
  } else {
    writeIcon(join(electronIconDir, `icon_${bt}.ico`), icoBuffer);
    writeIcon(join(electronIconDir, `icon_${bt}.png`), createPNG(512, 512));
  }
}

// Tray icon (smaller, 22x22 is common)
writeIcon(join(electronIconDir, 'tray-icon.png'), createPNG(22, 22));

// DMG background (540x380 is standard)
writeIcon(
  join(electronIconDir, 'dmg-background.png'),
  createPNG(540, 380, BG_COLOR)
);
writeIcon(
  join(electronIconDir, 'dmg-background@2x.png'),
  createPNG(1080, 760, BG_COLOR)
);

console.log('\nDone! All placeholder icons generated.');
console.log('Replace these with proper branded icons when ready.');
