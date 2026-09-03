/**
 * Generates synthetic "individuals" so you can verify the spike pipeline runs
 * end to end before you go out and photograph real pets.
 *
 * Each individual is a distinct colour-and-shape pattern; its photos are that
 * pattern with small variations (rotation, brightness, blur, crop) standing in
 * for different angles and lighting.
 *
 * IMPORTANT: a good score here proves the plumbing works, nothing more. These
 * shapes are far easier to tell apart than two brown aspins. Only real photos
 * answer the actual question.
 */

import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const OUT = path.resolve('./demo-images');
const SIZE = 400;

const individuals = [
  { name: 'demo-bruno', bg: '#8a5a2b', fg: '#f2e8d5', shape: 'circle' },
  { name: 'demo-muning', bg: '#d98207', fg: '#3b2a12', shape: 'stripes' },
  { name: 'demo-whitey', bg: '#f4f4f2', fg: '#9aa0a6', shape: 'circle' },
  { name: 'demo-blackie', bg: '#2b2b2b', fg: '#6f6f6f', shape: 'stripes' },
];

const singles = [
  { name: 'stray-a', bg: '#4b7f52', fg: '#dfe9d8', shape: 'circle' },
  { name: 'stray-b', bg: '#2563eb', fg: '#dbe6ff', shape: 'stripes' },
  { name: 'stray-c', bg: '#7c3aed', fg: '#ede4ff', shape: 'circle' },
  { name: 'stray-d', bg: '#b91c1c', fg: '#ffd9d9', shape: 'stripes' },
  { name: 'stray-e', bg: '#0f766e', fg: '#ccece8', shape: 'circle' },
  { name: 'stray-f', bg: '#a16207', fg: '#ffeec2', shape: 'stripes' },
];

function svg({ bg, fg, shape }, variant) {
  const cx = SIZE / 2 + variant * 9;
  const cy = SIZE / 2 - variant * 7;

  const body =
    shape === 'circle'
      ? `<circle cx="${cx}" cy="${cy}" r="${120 + variant * 6}" fill="${fg}" />
         <circle cx="${cx - 45}" cy="${cy - 35}" r="22" fill="${bg}" />
         <circle cx="${cx + 45}" cy="${cy - 35}" r="22" fill="${bg}" />
         <ellipse cx="${cx}" cy="${cy + 45}" rx="40" ry="26" fill="${bg}" />`
      : `${Array.from({ length: 7 }, (_, i) =>
          `<rect x="${60 + i * 40}" y="${70 + variant * 8}" width="22" height="${260 - variant * 10}" fill="${fg}" />`,
        ).join('')}
         <circle cx="${cx}" cy="${cy}" r="52" fill="${bg}" stroke="${fg}" stroke-width="10" />`;

  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}">
       <rect width="${SIZE}" height="${SIZE}" fill="${bg}" />
       ${body}
     </svg>`,
  );
}

async function writeVariant(spec, dir, index) {
  const file = path.join(dir, `${spec.name}-${index + 1}.jpg`);
  await sharp(svg(spec, index))
    .rotate(index * 5 - 5, { background: spec.bg }) // stand-in for a different angle
    .modulate({ brightness: 1 + (index - 1) * 0.12 }) // stand-in for lighting
    .blur(index === 2 ? 1.2 : 0.3) // stand-in for focus
    .resize(SIZE, SIZE, { fit: 'cover' })
    .jpeg({ quality: 88 })
    .toFile(file);
  return file;
}

async function main() {
  fs.rmSync(OUT, { recursive: true, force: true });

  let count = 0;

  // Individuals with 3 photos each -> these produce the same-animal pairs.
  for (const spec of individuals) {
    const dir = path.join(OUT, spec.name);
    fs.mkdirSync(dir, { recursive: true });
    for (let i = 0; i < 3; i += 1) {
      await writeVariant(spec, dir, i);
      count += 1;
    }
  }

  // "_" prefix -> the spike treats every file here as a different individual.
  const negativesDir = path.join(OUT, '_negatives');
  fs.mkdirSync(negativesDir, { recursive: true });
  for (const spec of singles) {
    await writeVariant(spec, negativesDir, 1);
    count += 1;
  }

  console.log(`\nWrote ${count} synthetic images to ${OUT}`);
  console.log(`  ${individuals.length} individuals with 3 photos each`);
  console.log(`  ${singles.length} one-off negatives in _negatives/`);
  console.log('\nSmoke-test the pipeline:\n');
  console.log('  npm run spike -- --images ./demo-images --out ./results-demo\n');
  console.log('Then replace with real photos. Synthetic shapes are far easier to');
  console.log('separate than two brown aspins - a high score here means the code');
  console.log('runs, not that the approach works.\n');
}

main().catch((error) => {
  console.error('Failed to generate demo images:', error.message);
  process.exitCode = 1;
});
