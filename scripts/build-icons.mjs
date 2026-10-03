/**
 * Génère les icônes à partir de la marque provisoire (feuille + étincelle).
 * À relancer après avoir remplacé public/favicon.svg par le logo officiel : node scripts/build-icons.mjs
 */
import sharp from 'sharp';
import fs from 'node:fs';

const mark = `<path d="M16 1C27 9 29 25 16 39 3 25 5 9 16 1Z" fill="#A3D65C"/><path d="M16 6v31" stroke="#0B1A0F" stroke-width="1.6" stroke-linecap="round" opacity=".55"/><circle cx="16" cy="19" r="4.2" fill="#5AB4FF" stroke="#06110B" stroke-width="1.6"/>`;
const square = (pad) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${-pad - 4} ${-pad} ${40 + pad * 2} ${40 + pad * 2}"><rect x="${-pad - 4}" y="${-pad}" width="${40 + pad * 2}" height="${40 + pad * 2}" rx="${pad * 1.5}" fill="#06110B"/>${mark}</svg>`;

fs.writeFileSync('public/favicon.svg', square(3));
await sharp(Buffer.from(square(3))).resize(32, 32).png().toFile('public/favicon-32.png');
await sharp(Buffer.from(square(6))).resize(180, 180).png().toFile('public/apple-touch-icon.png');
await sharp(Buffer.from(square(6))).resize(512, 512).png().toFile('public/images/logo-512.png');
console.log('icônes générées');
