/* eslint-disable no-console */
/**
 * Genera los PNG del ícono (tulipán minimalista) usando solo Node (sin dependencias).
 * Rasteriza los mismos paths vectoriales que usa TulipIcon.tsx en la app.
 *
 * Uso: node scripts/generate-icons.js
 */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const TULIP_DESIGN = JSON.parse(fs.readFileSync(path.join(__dirname, 'tulip-design.json')));

function hexToRgb(hex) {
  const value = hex.replace('#', '');
  return [
    parseInt(value.slice(0, 2), 16),
    parseInt(value.slice(2, 4), 16),
    parseInt(value.slice(4, 6), 16),
    255,
  ];
}

function parsePath(d) {
  const tokens = d.match(/[a-zA-Z]|-?\d*\.?\d+(?:e[-+]?\d+)?/g);
  const subpaths = [];
  let current = null;
  let k = 0;
  const readNum = () => {
    const value = parseFloat(tokens[k]);
    k += 1;
    return value;
  };
  while (k < tokens.length) {
    const token = tokens[k];
    if (/[a-zA-Z]/.test(token)) {
      k += 1;
    }
    const cmd = token.toUpperCase();
    if (cmd === 'Z') {
      if (current) {
        current.close = true;
        current = null;
      }
      continue;
    }
    if (cmd === 'M') {
      const x = readNum();
      const y = readNum();
      if (current) {
        current.close = true;
      }
      current = { points: [], close: false };
      subpaths.push(current);
      current.points.push([x, y]);
    } else if (cmd === 'L') {
      const x = readNum();
      const y = readNum();
      current.points.push([x, y]);
    } else if (cmd === 'C') {
      const c1x = readNum();
      const c1y = readNum();
      const c2x = readNum();
      const c2y = readNum();
      const x = readNum();
      const y = readNum();
      const p0 = current.points[current.points.length - 1];
      for (let t = 1; t <= 28; t += 1) {
        const u = t / 28;
        const v = 1 - u;
        const px = v * v * v * p0[0] + 3 * v * v * u * c1x + 3 * v * u * u * c2x + u * u * u * x;
        const py = v * v * v * p0[1] + 3 * v * v * u * c1y + 3 * v * u * u * c2y + u * u * u * y;
        current.points.push([px, py]);
      }
    } else {
      throw new Error(`Comando SVG no soportado: ${cmd}`);
    }
  }
  return subpaths;
}

function shapeBounds(points) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const [x, y] of points) {
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  return { minX, minY, maxX, maxY };
}

function pointInPolygon(x, y, points) {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const [xi, yi] = points[i];
    const [xj, yj] = points[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

function rasterize(width, height, shapes, background) {
  const img = Buffer.alloc(width * height * 4);
  if (background) {
    for (let i = 0; i < width * height; i += 1) {
      img[i * 4] = background[0];
      img[i * 4 + 1] = background[1];
      img[i * 4 + 2] = background[2];
      img[i * 4 + 3] = 255;
    }
  }
  const SS = 2;
  for (const shape of shapes) {
    const { minX, minY, maxX, maxY } = shapeBounds(shape.points);
    const x0 = Math.max(0, Math.floor(minX) - 1);
    const x1 = Math.min(width - 1, Math.ceil(maxX) + 1);
    const y0 = Math.max(0, Math.floor(minY) - 1);
    const y1 = Math.min(height - 1, Math.ceil(maxY) + 1);
    const [fr, fg, fb, fa] = shape.fill;
    for (let py = y0; py <= y1; py += 1) {
      for (let px = x0; px <= x1; px += 1) {
        let hits = 0;
        for (let sy = 0; sy < SS; sy += 1) {
          for (let sx = 0; sx < SS; sx += 1) {
            if (pointInPolygon(px + (sx + 0.5) / SS, py + (sy + 0.5) / SS, shape.points)) {
              hits += 1;
            }
          }
        }
        if (hits === 0) continue;
        const alpha = (hits / (SS * SS)) * (fa / 255);
        const idx = (py * width + px) * 4;
        img[idx] = Math.round(fr * alpha + img[idx] * (1 - alpha));
        img[idx + 1] = Math.round(fg * alpha + img[idx + 1] * (1 - alpha));
        img[idx + 2] = Math.round(fb * alpha + img[idx + 2] * (1 - alpha));
        img[idx + 3] = Math.round(255 * alpha + img[idx + 3] * (1 - alpha));
      }
    }
  }
  return img;
}

function crc32(buf) {
  if (!crc32.table) {
    crc32.table = new Int32Array(256);
    for (let n = 0; n < 256; n += 1) {
      let c = n;
      for (let k = 0; k < 8; k += 1) {
        c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      }
      crc32.table[n] = c;
    }
  }
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i += 1) {
    c = crc32.table[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])));
  return Buffer.concat([length, typeBuf, data, crcBuf]);
}

function encodePng(width, height, rgba) {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type: RGBA
  const raw = Buffer.alloc(height * (1 + width * 4));
  for (let y = 0; y < height; y += 1) {
    raw[y * (1 + width * 4)] = 0; // filter: none
    rgba.copy(raw, y * (1 + width * 4) + 1, y * width * 4, (y + 1) * width * 4);
  }
  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([
    signature,
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function buildShapes(flowerColor, stemColor, scale, size, mono) {
  const flower = mono ? '#FFFFFF' : flowerColor;
  const stem = mono ? '#FFFFFF' : stemColor;
  const parsed = [];
  for (const d of TULIP_DESIGN.flower) {
    parsed.push({ subpaths: parsePath(d), fill: hexToRgb(flower) });
  }
  for (const d of TULIP_DESIGN.stem) {
    parsed.push({ subpaths: parsePath(d), fill: hexToRgb(stem) });
  }
  const all = parsed.flatMap(({ subpaths }) => subpaths);
  const bounds = shapeBounds(all.flatMap((sub) => sub.points));
  const span = Math.max(bounds.maxX - bounds.minX, bounds.maxY - bounds.minY);
  const unit = (size * scale) / span;
  const tx = (size - (bounds.minX + bounds.maxX) * unit) / 2;
  const ty = (size - (bounds.minY + bounds.maxY) * unit) / 2;
  const shapes = [];
  for (const { subpaths, fill } of parsed) {
    for (const sub of subpaths) {
      shapes.push({
        points: sub.points.map(([x, y]) => [x * unit + tx, y * unit + ty]),
        fill,
      });
    }
  }
  return shapes;
}

function renderIcon(fileName, size, options) {
  const { background, flower, stem, scale, mono } = options;
  const shapes = flower || stem ? buildShapes(flower, stem, scale, size, mono) : [];
  const img = rasterize(size, size, shapes, background ? hexToRgb(background) : null);
  const png = encodePng(size, size, img);
  const outPath = path.join(__dirname, '..', 'assets', fileName);
  fs.writeFileSync(outPath, png);
  console.log(`✓ ${fileName} (${size}x${size})`);
}

const CREAM = '#FFF8F0';
const DARK_BG = '#221812';
const ROSE = '#D96A87';
const ROSE_DARK = '#E88CA0';
const STEM_COLOR = '#B08D7C';
const STEM_DARK = '#B98F7A';

renderIcon('icon.png', 1024, { background: CREAM, flower: ROSE, stem: STEM_COLOR, scale: 0.93 });
renderIcon('android-icon-foreground.png', 1024, {
  flower: ROSE,
  stem: STEM_COLOR,
  scale: 0.78,
});
renderIcon('android-icon-background.png', 1024, { background: CREAM });
renderIcon('android-icon-monochrome.png', 1024, { mono: true, scale: 0.78 });
renderIcon('splash-icon.png', 1024, { flower: ROSE, stem: STEM_COLOR, scale: 0.85 });
renderIcon('splash-icon-dark.png', 1024, {
  flower: ROSE_DARK,
  stem: STEM_DARK,
  scale: 0.85,
});
renderIcon('favicon.png', 48, { background: CREAM, flower: ROSE, stem: STEM_COLOR, scale: 0.9 });

console.log('Listo: íconos generados en assets/.');


// ---------------------------------------------------------------------------
// Previews del tulipán trazado por tema (14 temas de la app)
// ---------------------------------------------------------------------------

const THEME_PREVIEWS = [
  { file: '01-organico.png', label: 'Cálido Orgánico', bg: '#FFF8F0', accent: '#D96A87', stem: '#B08D7C' },
  { file: '02-noche.png', label: 'Noche Profunda', bg: '#221812', accent: '#E88CA0', stem: '#B98F7A' },
  { file: '03-romantico.png', label: 'Pastel Rosa', bg: '#FFF6F8', accent: '#B34A6E', stem: '#C48AA5' },
  { file: '04-otono.png', label: 'Otoño Cálido', bg: '#FFF9EC', accent: '#C7791F', stem: '#B08D5E' },
  { file: '05-noche-estrellada.png', label: 'Noche Estrellada', bg: '#0E1428', accent: '#F2C14E', stem: '#9AA3C9' },
  { file: '06-te-verde.png', label: 'Té Verde / Matcha', bg: '#F4F7EE', accent: '#7C9A5B', stem: '#8FA47E' },
  { file: '07-arandano.png', label: 'Arándano & Crema', bg: '#F6F3FB', accent: '#7C5CC4', stem: '#A79BC7' },
  { file: '08-cafe.png', label: 'Café de Mañana', bg: '#F5F0E8', accent: '#8B5E34', stem: '#A98C6D' },
  { file: '09-atardecer.png', label: 'Atardecer Dorado', bg: '#FFF6EC', accent: '#E07A3F', stem: '#C29167' },
  { file: '10-nube-violeta.png', label: 'Nube Violeta', bg: '#F8F5FD', accent: '#8B5CF6', stem: '#AEA0C9' },
  { file: '11-menta.png', label: 'Menta Fresca', bg: '#F1FBF7', accent: '#3FA98C', stem: '#7FB5A2' },
  { file: '12-frutilla.png', label: 'Frutilla & Crema', bg: '#FEF7F5', accent: '#D9606E', stem: '#C49A92' },
  { file: '13-pergamino.png', label: 'Pergamino Vintage', bg: '#F7EFDC', accent: '#9A6B2F', stem: '#A08A5F' },
  { file: '14-carbon.png', label: 'Carbón Elegante', bg: '#121212', accent: '#7C8A9C', stem: '#A0A0A0' },
];

function renderThemePreview(theme, size, scale) {
  const shapes = buildShapes(theme.accent, theme.stem, scale, size, false);
  return rasterize(size, size, shapes, hexToRgb(theme.bg));
}

function generateDesignCatalog() {
  const dir = path.join(__dirname, '..', 'tulip-designs');
  fs.mkdirSync(dir, { recursive: true });
  const SIZE = 600;
  for (const theme of THEME_PREVIEWS) {
    const img = renderThemePreview(theme, SIZE, 0.8);
    fs.writeFileSync(path.join(dir, theme.file), encodePng(SIZE, SIZE, img));
    console.log(`✓ tulip-designs/${theme.file} (${theme.label})`);
  }

  const COLS = 5;
  const CELL = 380;
  const GAP = 24;
  const PAD = 40;
  const ROWS = Math.ceil(THEME_PREVIEWS.length / COLS);
  const totalW = PAD * 2 + COLS * CELL + (COLS - 1) * GAP;
  const totalH = PAD * 2 + ROWS * CELL + (ROWS - 1) * GAP;
  const montage = Buffer.alloc(totalW * totalH * 4);
  for (let i = 0; i < totalW * totalH; i += 1) {
    montage[i * 4] = 244;
    montage[i * 4 + 1] = 242;
    montage[i * 4 + 2] = 240;
    montage[i * 4 + 3] = 255;
  }
  THEME_PREVIEWS.forEach((theme, index) => {
    const img = renderThemePreview(theme, CELL, 0.8);
    const col = index % COLS;
    const row = Math.floor(index / COLS);
    const ox = PAD + col * (CELL + GAP);
    const oy = PAD + row * (CELL + GAP);
    for (let y = 0; y < CELL; y += 1) {
      img.copy(montage, ((oy + y) * totalW + ox) * 4, y * CELL * 4, (y + 1) * CELL * 4);
    }
  });
  fs.writeFileSync(path.join(dir, 'todas.png'), encodePng(totalW, totalH, montage));
  console.log(`✓ tulip-designs/todas.png (${totalW}x${totalH})`);
  console.log('Previews por tema listos en tulip-designs/.');
}

if (process.argv[2] === 'designs') {
  generateDesignCatalog();
}
