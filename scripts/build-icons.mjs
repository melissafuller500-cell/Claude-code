/**
 * Génère favicon, icône Apple, logo carré (données structurées) et le logo PNG utilisé dans les images
 * Open Graph, à partir du logo officiel : assets-src/logo-mark.webp. Relancer après changement : npm run icons
 */
import sharp from 'sharp';
import fs from 'node:fs';

const SRC = 'assets-src/logo-mark.webp';
const BG = { r: 6, g: 17, b: 11, alpha: 1 }; // --night

async function square(size, pad, file, round = true) {
  const inner = Math.round(size * (1 - pad * 2));
  const mark = await sharp(SRC).resize({ width: inner, height: inner, fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
  const r = Math.round(size * 0.22);
  const mask = Buffer.from(`<svg width="${size}" height="${size}"><rect width="${size}" height="${size}" rx="${round ? r : 0}" fill="#fff"/></svg>`);
  await sharp({ create: { width: size, height: size, channels: 4, background: BG } })
    .composite([{ input: mark, gravity: 'center' }, { input: mask, blend: 'dest-in' }])
    .png({ compressionLevel: 9, palette: size >= 180, quality: 90 })
    .toFile(file);
}

await square(32, 0.06, 'public/favicon-32.png');
await square(192, 0.12, 'public/icon-192.png');
await square(180, 0.12, 'public/apple-touch-icon.png', false);
await square(512, 0.14, 'public/images/logo-512.png');
// Logo transparent pour les images Open Graph (satori).
await sharp(SRC).resize({ height: 160 }).png({ compressionLevel: 9 }).toFile('src/og/logo-mark.png');
if (fs.existsSync('public/favicon.svg')) fs.unlinkSync('public/favicon.svg');
console.log('icônes générées depuis', SRC);
// Portrait détouré pour les images Open Graph de l'accueil et de la page À propos.
await sharp('src/assets/brand/noe-cutout.webp').resize({ height: 600 }).png({ compressionLevel: 9 }).toFile('src/og/noe-cutout.png');
// Photo publique de Noé Mbwang (données structurées Person).
await sharp('src/assets/brand/noe-portrait.jpg').resize({ width: 600 }).jpeg({ quality: 82, mozjpeg: true }).toFile('public/images/noe-mbwang.jpg');
// Petit logo transparent pour la floraison de la tige (fin de page).
await sharp(SRC).resize({ height: 112 }).png({ compressionLevel: 9, palette: true }).toFile('public/images/logo-mark-112.png');
