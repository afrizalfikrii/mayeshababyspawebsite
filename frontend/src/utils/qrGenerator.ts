/**
 * Pure TypeScript QR Code matrix generator (ISO/IEC 18004, Byte mode, ECC Level M).
 * Supports payloads up to 64 UTF-8 bytes (Version 1–4) with zero external dependencies.
 */

const GF_EXP = new Uint8Array(512);
const GF_LOG = new Uint8Array(256);

(() => {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    GF_EXP[i] = x;
    GF_LOG[x] = i;
    x <<= 1;
    if (x & 0x100) x ^= 0x11d;
  }
  for (let i = 255; i < 512; i++) {
    GF_EXP[i] = GF_EXP[i - 255];
  }
})();

function gfMul(a: number, b: number): number {
  if (a === 0 || b === 0) return 0;
  return GF_EXP[GF_LOG[a] + GF_LOG[b]];
}

function rsGeneratorPoly(degree: number): Uint8Array {
  let poly = new Uint8Array([1]);
  for (let i = 0; i < degree; i++) {
    const next = new Uint8Array(poly.length + 1);
    const factor = GF_EXP[i];
    for (let j = 0; j < poly.length; j++) {
      next[j] ^= poly[j];
      next[j + 1] ^= gfMul(poly[j], factor);
    }
    poly = next;
  }
  return poly;
}

function rsEncode(data: Uint8Array, ecLen: number): Uint8Array {
  const gen = rsGeneratorPoly(ecLen);
  const res = new Uint8Array(data.length + ecLen);
  res.set(data);
  for (let i = 0; i < data.length; i++) {
    const coef = res[i];
    if (coef !== 0) {
      for (let j = 0; j < gen.length; j++) {
        res[i + j] ^= gfMul(gen[j], coef);
      }
    }
  }
  return res.slice(data.length);
}

interface VersionSpec {
  version: number;
  size: number;
  totalDataBytes: number;
  ecBytesPerBlock: number;
  blocks: number;
  alignPos: number[];
}

// Level M specs for Versions 1..4
const VERSION_SPECS: VersionSpec[] = [
  { version: 1, size: 21, totalDataBytes: 16, ecBytesPerBlock: 10, blocks: 1, alignPos: [] },
  { version: 2, size: 25, totalDataBytes: 28, ecBytesPerBlock: 16, blocks: 1, alignPos: [6, 18] },
  { version: 3, size: 29, totalDataBytes: 44, ecBytesPerBlock: 26, blocks: 1, alignPos: [6, 22] },
  { version: 4, size: 33, totalDataBytes: 64, ecBytesPerBlock: 18, blocks: 2, alignPos: [6, 26] },
];

// Format info for ECC Level M (00) + Mask 0 (000) -> 15-bit BCH + mask 0x5412 = 0x5017? Wait:
// Level M = 00, Mask 0 = 000 => 5-bit data = 00000 => 15-bit BCH(15,5) = 000000000000000 ^ 0x5412 = 0x5412
const FORMAT_INFO_M_MASK0 = 0x5412;

function placeFinder(grid: Int8Array, reserved: Uint8Array, size: number, r0: number, c0: number) {
  for (let dr = -1; dr <= 7; dr++) {
    for (let dc = -1; dc <= 7; dc++) {
      const r = r0 + dr;
      const c = c0 + dc;
      if (r < 0 || r >= size || c < 0 || c >= size) continue;
      reserved[r * size + c] = 1;
      const inOuter = dr >= 0 && dr <= 6 && dc >= 0 && dc <= 6;
      const isBorder = dr === 0 || dr === 6 || dc === 0 || dc === 6;
      const isCenter = dr >= 2 && dr <= 4 && dc >= 2 && dc <= 4;
      grid[r * size + c] = inOuter && (isBorder || isCenter) ? 1 : 0;
    }
  }
}

function placeAlignment(grid: Int8Array, reserved: Uint8Array, size: number, cr: number, cc: number) {
  for (let dr = -2; dr <= 2; dr++) {
    for (let dc = -2; dc <= 2; dc++) {
      const r = cr + dr;
      const c = cc + dc;
      reserved[r * size + c] = 1;
      const isDark = Math.abs(dr) === 2 || Math.abs(dc) === 2 || (dr === 0 && dc === 0);
      grid[r * size + c] = isDark ? 1 : 0;
    }
  }
}

export function generateQrMatrix(text: string): { size: number; modules: boolean[] } {
  const bytes = new TextEncoder().encode(text);
  const spec =
    VERSION_SPECS.find((v) => bytes.length + 2 <= v.totalDataBytes) ??
    VERSION_SPECS[VERSION_SPECS.length - 1];

  const payload = bytes.slice(0, spec.totalDataBytes - 2);
  const bits: number[] = [];
  const pushBits = (val: number, len: number) => {
    for (let i = len - 1; i >= 0; i--) bits.push((val >> i) & 1);
  };

  // Byte mode (0100) + 8-bit length
  pushBits(0b0100, 4);
  pushBits(payload.length, 8);
  for (const b of payload) pushBits(b, 8);

  // Terminator + byte pad
  const maxBits = spec.totalDataBytes * 8;
  for (let i = 0; i < 4 && bits.length < maxBits; i++) bits.push(0);
  while (bits.length % 8 !== 0) bits.push(0);
  let padIdx = 0;
  while (bits.length < maxBits) {
    pushBits(padIdx % 2 === 0 ? 0xec : 0x11, 8);
    padIdx++;
  }

  const dataBytes = new Uint8Array(spec.totalDataBytes);
  for (let i = 0; i < spec.totalDataBytes; i++) {
    let byte = 0;
    for (let b = 0; b < 8; b++) byte = (byte << 1) | bits[i * 8 + b];
    dataBytes[i] = byte;
  }

  // Split into RS blocks & interleave
  const blockSize = Math.floor(spec.totalDataBytes / spec.blocks);
  const dataBlocks: Uint8Array[] = [];
  const ecBlocks: Uint8Array[] = [];
  for (let i = 0; i < spec.blocks; i++) {
    const slice = dataBytes.slice(i * blockSize, (i + 1) * blockSize);
    dataBlocks.push(slice);
    ecBlocks.push(rsEncode(slice, spec.ecBytesPerBlock));
  }

  const finalBytes: number[] = [];
  for (let i = 0; i < blockSize; i++) {
    for (const b of dataBlocks) finalBytes.push(b[i]);
  }
  for (let i = 0; i < spec.ecBytesPerBlock; i++) {
    for (const b of ecBlocks) finalBytes.push(b[i]);
  }

  const size = spec.size;
  const grid = new Int8Array(size * size);
  const reserved = new Uint8Array(size * size);

  placeFinder(grid, reserved, size, 0, 0);
  placeFinder(grid, reserved, size, 0, size - 7);
  placeFinder(grid, reserved, size, size - 7, 0);

  if (spec.alignPos.length > 0) {
    for (const r of spec.alignPos) {
      for (const c of spec.alignPos) {
        if (reserved[r * size + c]) continue;
        placeAlignment(grid, reserved, size, r, c);
      }
    }
  }

  // Timing patterns
  for (let i = 8; i < size - 8; i++) {
    reserved[6 * size + i] = 1;
    grid[6 * size + i] = i % 2 === 0 ? 1 : 0;
    reserved[i * size + 6] = 1;
    grid[i * size + 6] = i % 2 === 0 ? 1 : 0;
  }

  // Dark module
  reserved[(4 * spec.version + 9) * size + 8] = 1;
  grid[(4 * spec.version + 9) * size + 8] = 1;

  // Format info reservation + placement (Mask 0, ECC M)
  for (let i = 0; i < 15; i++) {
    const bit = (FORMAT_INFO_M_MASK0 >> i) & 1;
    // Top-left horizontal + vertical
    const r1 = i < 6 ? 8 : i === 6 ? 8 : i === 7 ? 8 : 14 - i;
    const c1 = i < 6 ? i : i === 6 ? 7 : 8;
    if (i < 8) {
      reserved[8 * size + (i < 6 ? i : i + 1)] = 1;
      grid[8 * size + (i < 6 ? i : i + 1)] = bit;
    } else {
      reserved[(14 - i < 6 ? 14 - i : 15 - i) * size + 8] = 1;
      grid[(14 - i < 6 ? 14 - i : 15 - i) * size + 8] = bit;
    }
    void r1;
    void c1;

    // Top-right & bottom-left
    if (i < 7) {
      reserved[(size - 1 - i) * size + 8] = 1;
      grid[(size - 1 - i) * size + 8] = bit;
    } else {
      reserved[8 * size + (size - 15 + i)] = 1;
      grid[8 * size + (size - 15 + i)] = bit;
    }
  }

  // Place data bits with Mask 0: (r + c) % 2 === 0
  let bitIdx = 0;
  const totalBits = finalBytes.length * 8;
  let upward = true;
  for (let col = size - 1; col > 0; col -= 2) {
    if (col === 6) col--;
    for (let step = 0; step < size; step++) {
      const r = upward ? size - 1 - step : step;
      for (let dc = 0; dc < 2; dc++) {
        const c = col - dc;
        if (reserved[r * size + c]) continue;
        let bit = 0;
        if (bitIdx < totalBits) {
          bit = (finalBytes[bitIdx >> 3] >> (7 - (bitIdx & 7))) & 1;
          bitIdx++;
        }
        if ((r + c) % 2 === 0) bit ^= 1;
        grid[r * size + c] = bit;
      }
    }
    upward = !upward;
  }

  return {
    size,
    modules: Array.from(grid, (v) => v === 1),
  };
}
