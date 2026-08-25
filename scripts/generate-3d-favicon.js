const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// Helper to calculate CRC32 for PNG chunks
function crc32(buf) {
  let c = 0xffffffff;
  const table = [];
  for (let n = 0; n < 256; n++) {
    let curr = n;
    for (let k = 0; k < 8; k++) {
      curr = (curr & 1) ? (0xedb88320 ^ (curr >>> 1)) : (curr >>> 1);
    }
    table[n] = curr;
  }
  for (let i = 0; i < buf.length; i++) {
    c = table[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function makePngChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const typeAndData = Buffer.concat([typeBuf, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(typeAndData), 0);
  return Buffer.concat([len, typeAndData, crc]);
}

function generate3DShieldPng(size = 64) {
  const width = size;
  const height = size;
  const rawData = [];

  const cx = width / 2;
  const cy = height / 2;

  for (let y = 0; y < height; y++) {
    rawData.push(0); // Filter byte for scanline
    for (let x = 0; x < width; x++) {
      const dx = (x - cx) / (width / 2);
      const dy = (y - cy) / (height / 2);
      const dist = Math.sqrt(dx * dx + dy * dy);

      let r = 10, g = 21, b = 40, a = 255; // Background dark navy

      // Outer Glow Aura
      if (dist <= 0.95) {
        // Orbit Rings
        const angle = Math.atan2(dy, dx);
        const ring1 = Math.abs(dist - 0.82) < 0.06 && Math.sin(angle * 3) > -0.5;
        const ring2 = Math.abs(dist - 0.90) < 0.04;

        if (ring1) {
          r = 0; g = 242; b = 254; a = 230; // Neon cyan
        } else if (ring2) {
          r = 0; g = 230; b = 118; a = 200; // Neon emerald
        }

        // Shield Outline (Isometric Shield Shape)
        // Shield formula: |x| <= 0.65 * (1 - y_norm/2)
        const ny = (y - cy * 0.3) / (height * 0.6); // 0 to 1
        const shieldWidthAtY = 0.55 * Math.max(0, 1 - Math.pow(Math.max(0, ny - 0.2), 1.5));
        
        if (ny >= 0 && ny <= 1 && Math.abs(dx) <= shieldWidthAtY) {
          // Inside Shield Front
          const facetLeft = dx < 0;
          const progressY = ny;

          if (facetLeft) {
            // Cyan to bright blue gradient
            r = Math.floor(0 + progressY * 30);
            g = Math.floor(242 - progressY * 80);
            b = Math.floor(254 - progressY * 30);
          } else {
            // Darker cyan blue shadow facet
            r = Math.floor(0 + progressY * 20);
            g = Math.floor(180 - progressY * 90);
            b = Math.floor(220 - progressY * 50);
          }

          // Inner Glowing Core Diamond (Center AI node)
          const coreDx = Math.abs(dx);
          const coreDy = Math.abs(ny - 0.5);
          if (coreDx + coreDy * 0.8 < 0.18) {
            r = 255; g = 255; b = 255; a = 255; // Bright Core Sparkle
          } else if (coreDx + coreDy * 0.8 < 0.28) {
            r = 0; g = 242; b = 254; a = 255; // Cyan Core Aura
          }
        }
      } else {
        a = 0; // Transparent outside container
      }

      rawData.push(r, g, b, a);
    }
  }

  const rawBuffer = Buffer.from(rawData);
  const compressed = zlib.deflateSync(rawBuffer);

  const header = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8;  // Bit depth
  ihdrData[9] = 6;  // Color type RGBA
  ihdrData[10] = 0; // Compression
  ihdrData[11] = 0; // Filter
  ihdrData[12] = 0; // Interlace

  const ihdrChunk = makePngChunk('IHDR', ihdrData);
  const idatChunk = makePngChunk('IDAT', compressed);
  const iendChunk = makePngChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([header, ihdrChunk, idatChunk, iendChunk]);
}

function makeIcoFromPng(pngBuffer) {
  // ICO Header (6 bytes)
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // Reserved
  header.writeUInt16LE(1, 2); // Type 1 = ICO
  header.writeUInt16LE(1, 4); // Count 1 image

  // Icon Directory Entry (16 bytes)
  const dir = Buffer.alloc(16);
  dir[0] = 64; // Width 64
  dir[1] = 64; // Height 64
  dir[2] = 0;  // Palette
  dir[3] = 0;  // Reserved
  dir.writeUInt16LE(1, 4);  // Color planes
  dir.writeUInt16LE(32, 6); // Bits per pixel
  dir.writeUInt32BE(pngBuffer.length, 8); // Image data size
  dir.writeUInt32LE(22, 12); // Offset (6 + 16 = 22)

  return Buffer.concat([header, dir, pngBuffer]);
}

const pngBuf = generate3DShieldPng(64);
const icoBuf = makeIcoFromPng(pngBuf);

fs.writeFileSync(path.join(__dirname, '../src/app/favicon.ico'), icoBuf);
fs.writeFileSync(path.join(__dirname, '../public/favicon.ico'), icoBuf);
fs.writeFileSync(path.join(__dirname, '../public/apple-icon.png'), pngBuf);

console.log('Successfully generated 3D Shield favicon.ico and apple-icon.png!');
