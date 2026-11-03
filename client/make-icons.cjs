const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const table = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (buf) => {
  let c = 0xffffffff;
  for (const b of buf) c = table[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const chunk = (type, data) => {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
};

const inRoundRect = (x, y, x0, y0, x1, y1, r) => {
  if (x < x0 || x > x1 || y < y0 || y > y1) return false;
  const cx = Math.min(Math.max(x, x0 + r), x1 - r);
  const cy = Math.min(Math.max(y, y0 + r), y1 - r);
  return (x - cx) ** 2 + (y - cy) ** 2 <= r * r;
};
const inTri = (px, py, a, b, c) => {
  const s = (p, q, r) => (p[0] - r[0]) * (q[1] - r[1]) - (q[0] - r[0]) * (p[1] - r[1]);
  const p = [px, py];
  const d1 = s(p, a, b), d2 = s(p, b, c), d3 = s(p, c, a);
  const neg = d1 < 0 || d2 < 0 || d3 < 0;
  const pos = d1 > 0 || d2 > 0 || d3 > 0;
  return !(neg && pos);
};

function makePng(S, maskable) {
  const SS = 3;
  const green = [0, 168, 132];
  const white = [255, 255, 255];
  const scale = maskable ? 0.62 : 0.7;
  const bw = S * scale, bh = bw * 0.78;
  const cx = S / 2, cy = S / 2 - S * 0.02;
  const x0 = cx - bw / 2, y0 = cy - bh / 2, x1 = cx + bw / 2, y1 = cy + bh / 2;
  const tail = [[x0 + bw * 0.12, y1 - bh * 0.05], [x0 + bw * 0.1, y1 + bh * 0.28], [x0 + bw * 0.38, y1 - bh * 0.05]];
  const dotR = bh * 0.085;
  const raw = Buffer.alloc((S * 4 + 1) * S);
  for (let y = 0; y < S; y++) {
    raw[y * (S * 4 + 1)] = 0;
    for (let x = 0; x < S; x++) {
      let r = 0, g = 0, b = 0, n = 0;
      for (let j = 0; j < SS; j++) for (let i = 0; i < SS; i++) {
        const px = x + (i + 0.5) / SS, py = y + (j + 0.5) / SS;
        if (!maskable && !inRoundRect(px, py, 0, 0, S, S, S * 0.22)) continue;
        let col = green;
        if (inRoundRect(px, py, x0, y0, x1, y1, bh * 0.3) || inTri(px, py, ...tail)) col = white;
        for (const k of [-1, 0, 1]) {
          if ((px - (cx + k * bw * 0.2)) ** 2 + (py - cy) ** 2 <= dotR * dotR) col = green;
        }
        r += col[0]; g += col[1]; b += col[2]; n++;
      }
      const o = y * (S * 4 + 1) + 1 + x * 4;
      if (n) { raw[o] = r / n; raw[o + 1] = g / n; raw[o + 2] = b / n; }
      raw[o + 3] = Math.round((n / (SS * SS)) * 255);
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(S, 0); ihdr.writeUInt32BE(S, 4);
  ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const outDir = path.join(__dirname, 'public');
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'icon-192.png'), makePng(192, false));
fs.writeFileSync(path.join(outDir, 'icon-512.png'), makePng(512, false));
fs.writeFileSync(path.join(outDir, 'icon-maskable-512.png'), makePng(512, true));
console.log('Icons created in', outDir);