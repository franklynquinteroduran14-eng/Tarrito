/**
 * Traza la silueta de tulip-designs/gemini.png (fondo blanco, flor magenta, tallo verde)
 * y la convierte en paths SVG (marching squares + simplificación RDP).
 *
 * Emite:
 *  - scripts/tulip-design.json (para generate-icons.js)
 *  - src/components/tulipDesign.ts (para la app)
 *
 * Uso: node scripts/trace-tulip.js
 */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

function decode(file) {
  const b = fs.readFileSync(file);
  const w = b.readUInt32BE(16);
  const h = b.readUInt32BE(20);
  let off = 8;
  const idats = [];
  while (off < b.length) {
    const len = b.readUInt32BE(off);
    const type = b.toString('ascii', off + 4, off + 8);
    if (type === 'IDAT') idats.push(b.subarray(off + 8, off + 8 + len));
    off += 12 + len;
  }
  const raw = zlib.inflateSync(Buffer.concat(idats));
  const stride = w * 4;
  const out = Buffer.alloc(w * h * 4);
  const paeth = (a, bb, c) => {
    const p = a + bb - c;
    const pa = Math.abs(p - a);
    const pb = Math.abs(p - bb);
    const pc = Math.abs(p - c);
    return pa <= pb && pa <= pc ? a : pb <= pc ? bb : c;
  };
  for (let y = 0; y < h; y += 1) {
    const f = raw[y * (1 + stride)];
    const row = out.subarray(y * stride, (y + 1) * stride);
    const prev = y > 0 ? out.subarray((y - 1) * stride, y * stride) : null;
    for (let x = 0; x < w; x += 1) {
      for (let c = 0; c < 4; c += 1) {
        const a = raw[y * (1 + stride) + 1 + x * 4 + c];
        const lc = x > 0 ? row[(x - 1) * 4 + c] : 0;
        const uc = prev ? prev[x * 4 + c] : 0;
        const ulc = x > 0 && prev ? prev[(x - 1) * 4 + c] : 0;
        let v = a;
        if (f === 1) v = a + lc;
        else if (f === 2) v = a + uc;
        else if (f === 3) v = a + ((lc + uc) >> 1);
        else if (f === 4) v = a + paeth(lc, uc, ulc);
        row[x * 4 + c] = v & 255;
      }
    }
  }
  return { w, h, out };
}

// Contorno por aristas de la rejilla de píxeles: para cada píxel dentro con un
// vecino 4-conectado fuera, se emite la arista compartida (vértices en coords enteras).
// Produce loops cerrados encadenables sin huecos en las esquinas.
function traceMask(mask, w, h) {
  const inside = (x, y) => x >= 0 && y >= 0 && x < w && y < h && mask[y * w + x] === 1;
  const segments = [];
  for (let j = 0; j < h; j += 1) {
    for (let i = 0; i < w; i += 1) {
      if (!inside(i, j)) continue;
      if (!inside(i, j - 1)) segments.push([[i, j], [i + 1, j]]);
      if (!inside(i, j + 1)) segments.push([[i, j + 1], [i + 1, j + 1]]);
      if (!inside(i - 1, j)) segments.push([[i, j], [i, j + 1]]);
      if (!inside(i + 1, j)) segments.push([[i + 1, j], [i + 1, j + 1]]);
    }
  }
  const key = (p) => `${p[0]},${p[1]}`;
  const adj = new Map();
  for (let s = 0; s < segments.length; s += 1) {
    for (const end of [0, 1]) {
      const k = key(segments[s][end]);
      if (!adj.has(k)) adj.set(k, []);
      adj.get(k).push(s);
    }
  }
  const loops = [];
  const used = new Set();
  for (let s = 0; s < segments.length; s += 1) {
    if (used.has(s)) continue;
    const loop = [segments[s][0]];
    let curKey = key(segments[s][1]);
    let curSeg = s;
    let guard = 0;
    for (;;) {
      if (guard++ > segments.length) break;
      const options = adj.get(curKey).filter((ss) => ss !== curSeg && !used.has(ss));
      const next = options[0];
      if (next === undefined) break;
      used.add(next);
      const seg = segments[next];
      const isStart = key(seg[0]) === curKey;
      loop.push(isStart ? seg[1] : seg[0]);
      curSeg = next;
      curKey = key(isStart ? seg[1] : seg[0]);
      if (next === s) break;
    }
    loops.push(loop);
    used.add(s);
  }
  // filtrar loops pequeños (motas de anti-alias) y unificar
  return loops
    .map((loop) => ({ loop, area: Math.abs(polygonArea(loop)) }))
    .filter(({ area }) => area > 600)
    .sort((a, b) => b.area - a.area)
    .map(({ loop }) => loop);
}

function polygonArea(points) {
  let area = 0;
  for (let i = 0; i < points.length; i += 1) {
    const [x1, y1] = points[i];
    const [x2, y2] = points[(i + 1) % points.length];
    area += x1 * y2 - x2 * y1;
  }
  return area / 2;
}

// Ramer-Douglas-Peucker
function rdp(points, epsilon) {
  if (points.length < 3) return points;
  const [first, last] = [points[0], points[points.length - 1]];
  const segLen = Math.hypot(last[0] - first[0], last[1] - first[1]);
  let maxDist = 0;
  let index = 0;
  for (let i = 1; i < points.length - 1; i += 1) {
    const dist = segLen === 0
      ? Math.hypot(points[i][0] - first[0], points[i][1] - first[1])
      : Math.abs(
          (last[0] - first[0]) * (first[1] - points[i][1]) -
            (first[0] - points[i][0]) * (last[1] - first[1]),
        ) / segLen;
    if (dist > maxDist) {
      maxDist = dist;
      index = i;
    }
  }
  if (maxDist > epsilon) {
    const left = rdp(points.slice(0, index + 1), epsilon);
    const right = rdp(points.slice(index), epsilon);
    return left.slice(0, -1).concat(right);
  }
  return [first, last];
}

function toPath(points) {
  return points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`).join(' ') + ' Z';
}

function main() {
  const src = path.join(__dirname, '..', 'tulip-designs', 'gemini.png');
  const { w, h, out } = decode(src);

  const flower = new Uint8Array(w * h);
  const stem = new Uint8Array(w * h);
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const i = (y * w + x) * 4;
      const r = out[i];
      const g = out[i + 1];
      const b = out[i + 2];
      const isFlower = r > 150 && g < 120 && b > 150;
      const isStem = g > 150 && r < 120 && b < 160;
      const inside = isFlower || isStem;
      if (inside) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
      if (isFlower) flower[y * w + x] = 1;
      if (isStem) stem[y * w + x] = 1;
    }
  }

  const flowerPaths = traceMask(flower, w, h).map((loop) => toPath(rdp(loop, 2.2)));
  const stemPaths = traceMask(stem, w, h).map((loop) => toPath(rdp(loop, 2.2)));

  const margin = 12;
  const box = [minX - margin, minY - margin, maxX - minX + margin * 2, maxY - minY + margin * 2];

  const json = {
    viewBox: box,
    flower: flowerPaths,
    stem: stemPaths,
  };
  fs.writeFileSync(path.join(__dirname, 'tulip-design.json'), JSON.stringify(json, null, 1));
  console.log(`✓ scripts/tulip-design.json (viewBox ${box.join(' ')})`);
  console.log(`  flor: ${flowerPaths.length} paths, tallo: ${stemPaths.length} paths`);

  const ts = `// Generado por scripts/trace-tulip.js a partir de tulip-designs/gemini.png. No editar.
export interface TulipDesign {
  viewBox: [number, number, number, number];
  flower: string[];
  stem: string[];
}

export const TULIP_DESIGN: TulipDesign = {
  viewBox: [${box.join(', ')}],
  flower: [
${flowerPaths.map((p) => `    '${p}',`).join('\n')}
  ],
  stem: [
${stemPaths.map((p) => `    '${p}',`).join('\n')}
  ],
};
`;
  fs.writeFileSync(path.join(__dirname, '..', 'src', 'components', 'tulipDesign.ts'), ts);
  console.log('✓ src/components/tulipDesign.ts');
}

main();
