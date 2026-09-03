/**
 * SaanPaw - image recognition spike.
 *
 * Question this answers: does a pre-trained image embedding separate photos of
 * the SAME animal from photos of DIFFERENT animals well enough to drive the
 * matching feature - and what should IR_MATCH_THRESHOLD actually be?
 *
 * It does NOT train anything. It loads an ImageNet-pretrained MobileNet, takes
 * the penultimate layer as a feature vector, and measures how well cosine
 * similarity ranks same-animal pairs above different-animal pairs.
 *
 * Usage:
 *   npm run spike -- --images ./images
 *   npm run spike -- --images ./images --out ./results
 *
 * Expected folder layout - one folder per individual animal:
 *
 *   images/
 *     bruno/        bruno-1.jpg bruno-2.jpg bruno-3.jpg
 *     muning/       muning-1.jpg muning-2.jpg
 *     _negatives/   any-dog.jpg other-cat.jpg ...
 *
 * A folder whose name starts with "_" is treated as "every file in here is a
 * different individual", which is how you fold in a public dataset without
 * pretending those photos are of the same animal.
 */

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import sharp from 'sharp';
import * as tf from '@tensorflow/tfjs';
import * as mobilenet from '@tensorflow-models/mobilenet';

const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.bmp', '.gif', '.tif', '.tiff']);
const INPUT_SIZE = 224;

// ---------------------------------------------------------------- cli

function parseArgs(argv) {
  const args = { images: './images', out: './results' };
  for (let i = 0; i < argv.length; i += 1) {
    const flag = argv[i];
    if (flag === '--images') args.images = argv[++i];
    else if (flag === '--out') args.out = argv[++i];
    else if (flag === '--help' || flag === '-h') args.help = true;
  }
  return args;
}

function printHelp() {
  console.log(`
SaanPaw image-recognition spike

  npm run spike -- --images ./images [--out ./results]

Put one folder per individual animal inside --images. Folders starting with "_"
are treated as a pile of distinct individuals (one per file), which is how you
add negatives from a public dataset.

No photos yet? Generate synthetic ones to smoke-test the pipeline:

  npm run demo-images
  npm run spike -- --images ./demo-images
`);
}

// ---------------------------------------------------------------- data loading

/**
 * Walks the images directory and labels every file with the individual animal
 * it belongs to. The label is what makes a pair "same" or "different".
 */
function collectImages(root) {
  if (!fs.existsSync(root)) return [];

  const entries = fs.readdirSync(root, { withFileTypes: true });
  const items = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const folder = entry.name;
    const folderPath = path.join(root, folder);
    // "_" prefix => a bag of distinct animals, one individual per file.
    const eachFileIsItsOwnIndividual = folder.startsWith('_');

    for (const file of fs.readdirSync(folderPath)) {
      if (!IMAGE_EXTENSIONS.has(path.extname(file).toLowerCase())) continue;
      items.push({
        file: path.join(folderPath, file),
        label: path.basename(file, path.extname(file)),
        individual: eachFileIsItsOwnIndividual ? `${folder}/${file}` : folder,
        group: folder,
      });
    }
  }

  return items;
}

/**
 * Decode -> auto-orient -> square crop -> raw RGB.
 *
 * `.rotate()` with no argument applies the EXIF orientation. Phone photos are
 * routinely stored sideways with an orientation tag, and a sideways animal
 * embeds to something quite different, so skipping this quietly wrecks scores.
 */
async function toTensor(file) {
  const { data } = await sharp(file)
    .rotate()
    .resize(INPUT_SIZE, INPUT_SIZE, { fit: 'cover' })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  return tf.tensor3d(new Uint8Array(data), [INPUT_SIZE, INPUT_SIZE, 3], 'int32');
}

/** L2-normalise so cosine similarity is just a dot product. */
function l2Normalize(vector) {
  let sum = 0;
  for (const v of vector) sum += v * v;
  const norm = Math.sqrt(sum) || 1;
  return Float32Array.from(vector, (v) => v / norm);
}

function dot(a, b) {
  let total = 0;
  for (let i = 0; i < a.length; i += 1) total += a[i] * b[i];
  return total;
}

// ---------------------------------------------------------------- statistics

function describe(values) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const at = (q) => sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))];
  const mean = sorted.reduce((s, v) => s + v, 0) / sorted.length;
  const variance = sorted.reduce((s, v) => s + (v - mean) ** 2, 0) / sorted.length;
  return {
    n: sorted.length,
    min: sorted[0],
    p25: at(0.25),
    median: at(0.5),
    mean,
    p75: at(0.75),
    max: sorted[sorted.length - 1],
    sd: Math.sqrt(variance),
  };
}

/**
 * ROC AUC via the Mann-Whitney U identity: the probability that a randomly
 * chosen same-animal pair scores above a randomly chosen different-animal pair.
 * 0.5 means the embedding is useless here; 1.0 means perfect separation.
 */
function rocAuc(positives, negatives) {
  if (!positives.length || !negatives.length) return null;

  const combined = [
    ...positives.map((v) => ({ v, pos: true })),
    ...negatives.map((v) => ({ v, pos: false })),
  ].sort((a, b) => a.v - b.v);

  // Average ranks so ties do not bias the result.
  let i = 0;
  let rankSumPositives = 0;
  while (i < combined.length) {
    let j = i;
    while (j + 1 < combined.length && combined[j + 1].v === combined[i].v) j += 1;
    const averageRank = (i + j) / 2 + 1;
    for (let k = i; k <= j; k += 1) if (combined[k].pos) rankSumPositives += averageRank;
    i = j + 1;
  }

  const nPos = positives.length;
  const nNeg = negatives.length;
  return (rankSumPositives - (nPos * (nPos + 1)) / 2) / (nPos * nNeg);
}

/** Standardised distance between the two distributions. >0.8 is a large effect. */
function cohensD(positives, negatives) {
  const p = describe(positives);
  const n = describe(negatives);
  if (!p || !n) return null;
  const pooled = Math.sqrt((p.sd ** 2 + n.sd ** 2) / 2) || 1e-9;
  return (p.mean - n.mean) / pooled;
}

function sweepThresholds(positives, negatives) {
  const rows = [];
  for (let t = 0.30; t <= 0.99; t += 0.01) {
    const threshold = Number(t.toFixed(2));
    const tp = positives.filter((v) => v >= threshold).length;
    const fn = positives.length - tp;
    const fp = negatives.filter((v) => v >= threshold).length;
    const tn = negatives.length - fp;
    const precision = tp + fp ? tp / (tp + fp) : 0;
    const recall = tp + fn ? tp / (tp + fn) : 0;
    const f1 = precision + recall ? (2 * precision * recall) / (precision + recall) : 0;
    rows.push({ threshold, tp, fp, tn, fn, precision, recall, f1 });
  }
  return rows;
}

// ---------------------------------------------------------------- reporting

function histogram(positives, negatives, bins = 20) {
  const lines = [];
  const counts = { same: new Array(bins).fill(0), diff: new Array(bins).fill(0) };

  const bucket = (v) => Math.min(bins - 1, Math.max(0, Math.floor(v * bins)));
  for (const v of positives) counts.same[bucket(v)] += 1;
  for (const v of negatives) counts.diff[bucket(v)] += 1;

  const scale = (count, total) => (total ? count / total : 0);
  const bar = (fraction, width = 34) => '#'.repeat(Math.round(fraction * width));

  lines.push('  similarity   same-animal pairs            different-animal pairs');
  for (let b = 0; b < bins; b += 1) {
    const lo = (b / bins).toFixed(2);
    const same = scale(counts.same[b], positives.length);
    const diff = scale(counts.diff[b], negatives.length);
    lines.push(
      `  ${lo}  ${bar(same).padEnd(34)}  ${bar(diff)}`,
    );
  }
  return lines.join('\n');
}

function verdict({ auc, top1 }) {
  if (auc === null) {
    return {
      label: 'INCONCLUSIVE',
      detail: 'Not enough pairs to judge. You need at least two photos of one animal and some negatives.',
    };
  }
  if (auc >= 0.9 && top1 >= 0.7) {
    return {
      label: 'GO',
      detail:
        'Image similarity alone ranks the right candidate near the top. Use the recommended threshold, and keep the attribute and distance signals as tie-breakers.',
    };
  }
  if (auc >= 0.75) {
    return {
      label: 'MARGINAL',
      detail:
        'Image similarity carries real signal but is not decisive on its own. Ship it as ONE input to the combined score alongside coat colour, size, markings, and distance - which is how the SaanPaw UI already presents matches.',
    };
  }
  return {
    label: 'NO-GO for image-only matching',
    detail:
      'The two distributions overlap too much to rank on the photo alone. Weight the attribute and distance signals heavily, present image similarity as a weak hint, and say so plainly in the paper. Consider a stronger embedding (CLIP) before concluding.',
  };
}

// ---------------------------------------------------------------- main

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) return printHelp();

  const imagesDir = path.resolve(args.images);
  const outDir = path.resolve(args.out);

  console.log('\nSaanPaw - image recognition spike');
  console.log('='.repeat(72));
  console.log(`images: ${imagesDir}`);

  const items = collectImages(imagesDir);
  if (items.length < 2) {
    console.log('\nNo usable images found.');
    printHelp();
    process.exitCode = 1;
    return;
  }

  const individuals = new Map();
  for (const item of items) {
    if (!individuals.has(item.individual)) individuals.set(item.individual, []);
    individuals.get(item.individual).push(item);
  }
  const withSiblings = [...individuals.values()].filter((g) => g.length > 1);

  console.log(`found:  ${items.length} images across ${individuals.size} individuals`);
  console.log(`        ${withSiblings.length} individuals have 2+ photos (these produce the same-animal pairs)`);

  if (!withSiblings.length) {
    console.log(
      '\nEvery individual has only one photo, so there are no same-animal pairs to measure.\n' +
        'Add at least 2-3 photos of the same pet, taken at different angles or times.',
    );
    process.exitCode = 1;
    return;
  }

  await tf.setBackend('cpu');
  await tf.ready();

  console.log('\nLoading MobileNet v2 (ImageNet-pretrained, ~17 MB on first run)...');
  const model = await mobilenet.load({ version: 2, alpha: 1.0 });
  console.log('Model ready. Embedding images - this is CPU-only, expect a second or two each.\n');

  const embeddings = [];
  for (let i = 0; i < items.length; i += 1) {
    const item = items[i];
    let pixels;
    try {
      pixels = await toTensor(item.file);
    } catch (error) {
      console.log(`  [skip] ${path.basename(item.file)} - could not decode (${error.message})`);
      continue;
    }

    const raw = model.infer(pixels, true); // true => penultimate layer, not logits
    const vector = l2Normalize(await raw.data());
    raw.dispose();
    pixels.dispose();

    embeddings.push({ ...item, vector });
    process.stdout.write(`\r  embedded ${embeddings.length}/${items.length}`);
  }
  console.log(`\r  embedded ${embeddings.length}/${items.length} images   \n`);

  // ---- all pairs

  const positives = [];
  const negatives = [];
  const pairRows = [['image_a', 'image_b', 'same_animal', 'cosine_similarity']];

  for (let i = 0; i < embeddings.length; i += 1) {
    for (let j = i + 1; j < embeddings.length; j += 1) {
      const a = embeddings[i];
      const b = embeddings[j];
      const score = dot(a.vector, b.vector);
      const same = a.individual === b.individual;
      (same ? positives : negatives).push(score);
      pairRows.push([
        path.relative(imagesDir, a.file),
        path.relative(imagesDir, b.file),
        same ? 'yes' : 'no',
        score.toFixed(6),
      ]);
    }
  }

  // ---- top-1 / top-3 retrieval: the metric that matches the product

  let evaluated = 0;
  let top1Hits = 0;
  let top3Hits = 0;
  const perAnimal = new Map();

  for (const query of embeddings) {
    const siblings = individuals.get(query.individual).length - 1;
    if (siblings < 1) continue; // no correct answer exists for this query

    const ranked = embeddings
      .filter((other) => other !== query)
      .map((other) => ({ other, score: dot(query.vector, other.vector) }))
      .sort((a, b) => b.score - a.score);

    const hit1 = ranked[0]?.other.individual === query.individual;
    const hit3 = ranked.slice(0, 3).some((r) => r.other.individual === query.individual);

    evaluated += 1;
    if (hit1) top1Hits += 1;
    if (hit3) top3Hits += 1;

    const stats = perAnimal.get(query.individual) ?? { n: 0, hits: 0 };
    stats.n += 1;
    if (hit1) stats.hits += 1;
    perAnimal.set(query.individual, stats);
  }

  const top1 = evaluated ? top1Hits / evaluated : 0;
  const top3 = evaluated ? top3Hits / evaluated : 0;

  // ---- report

  const samePairs = describe(positives);
  const diffPairs = describe(negatives);
  const auc = rocAuc(positives, negatives);
  const d = cohensD(positives, negatives);
  const sweep = sweepThresholds(positives, negatives);
  const best = sweep.reduce((a, b) => (b.f1 > a.f1 ? b : a), sweep[0]);

  const pct = (v) => `${(v * 100).toFixed(1)}%`;
  const num = (v) => (v === null || v === undefined ? 'n/a' : v.toFixed(3));

  console.log('='.repeat(72));
  console.log('SIMILARITY DISTRIBUTIONS');
  console.log('='.repeat(72));
  console.log(`  same-animal pairs      n=${samePairs.n}  mean=${num(samePairs.mean)}  median=${num(samePairs.median)}  sd=${num(samePairs.sd)}`);
  console.log(`                         range ${num(samePairs.min)} .. ${num(samePairs.max)}   IQR ${num(samePairs.p25)} .. ${num(samePairs.p75)}`);
  console.log(`  different-animal pairs n=${diffPairs.n}  mean=${num(diffPairs.mean)}  median=${num(diffPairs.median)}  sd=${num(diffPairs.sd)}`);
  console.log(`                         range ${num(diffPairs.min)} .. ${num(diffPairs.max)}   IQR ${num(diffPairs.p25)} .. ${num(diffPairs.p75)}`);
  console.log('');
  console.log(histogram(positives, negatives));

  console.log('\n' + '='.repeat(72));
  console.log('SEPARATION');
  console.log('='.repeat(72));
  console.log(`  ROC AUC                ${num(auc)}   (0.5 = no signal, 1.0 = perfect)`);
  console.log(`  Cohen's d              ${num(d)}   (>0.8 is a large effect)`);
  console.log(`  Top-1 retrieval        ${pct(top1)}   (right animal ranked first, n=${evaluated})`);
  console.log(`  Top-3 retrieval        ${pct(top3)}   (right animal in the top 3)`);

  console.log('\n' + '='.repeat(72));
  console.log('THRESHOLD SWEEP  (what to put in IR_MATCH_THRESHOLD)');
  console.log('='.repeat(72));
  console.log('  thresh   precision   recall      F1     TP    FP    FN');
  for (const row of sweep.filter((r) => Math.round(r.threshold * 100) % 5 === 0)) {
    console.log(
      `  ${row.threshold.toFixed(2)}     ${pct(row.precision).padStart(7)}   ${pct(row.recall).padStart(7)}  ${row.f1.toFixed(3)}  ${String(row.tp).padStart(5)} ${String(row.fp).padStart(5)} ${String(row.fn).padStart(5)}`,
    );
  }
  console.log(
    `\n  Best F1 at threshold ${best.threshold.toFixed(2)}  ->  precision ${pct(best.precision)}, recall ${pct(best.recall)}, F1 ${best.f1.toFixed(3)}`,
  );
  console.log(
    '  Note: for SaanPaw, precision matters more than recall. A wrong "match" sends\n' +
      '  someone across the city for the wrong dog; a missed one still shows up in search.',
  );

  const call = verdict({ auc, top1 });
  console.log('\n' + '='.repeat(72));
  console.log(`VERDICT: ${call.label}`);
  console.log('='.repeat(72));
  console.log(`  ${call.detail}\n`);

  if (perAnimal.size) {
    console.log('  Per-animal top-1 accuracy (spot the hard cases):');
    for (const [individual, stats] of [...perAnimal].sort((a, b) => a[1].hits / a[1].n - b[1].hits / b[1].n)) {
      console.log(`    ${individual.padEnd(28)} ${stats.hits}/${stats.n}`);
    }
  }

  // ---- artefacts for Chapter 4

  fs.mkdirSync(outDir, { recursive: true });

  const summary = {
    generatedAt: new Date().toISOString(),
    model: 'mobilenet_v2_alpha1.0_imagenet (penultimate layer, 1280-d)',
    imagesDir,
    imageCount: embeddings.length,
    individualCount: individuals.size,
    samePairs,
    diffPairs,
    rocAuc: auc,
    cohensD: d,
    top1Retrieval: top1,
    top3Retrieval: top3,
    recommendedThreshold: best.threshold,
    atRecommendedThreshold: {
      precision: best.precision,
      recall: best.recall,
      f1: best.f1,
      truePositives: best.tp,
      falsePositives: best.fp,
      falseNegatives: best.fn,
    },
    verdict: call,
  };

  fs.writeFileSync(path.join(outDir, 'summary.json'), JSON.stringify(summary, null, 2));
  fs.writeFileSync(path.join(outDir, 'pairs.csv'), pairRows.map((r) => r.join(',')).join('\n'));
  fs.writeFileSync(
    path.join(outDir, 'threshold-sweep.csv'),
    ['threshold,precision,recall,f1,tp,fp,tn,fn']
      .concat(
        sweep.map((r) =>
          [r.threshold, r.precision.toFixed(4), r.recall.toFixed(4), r.f1.toFixed(4), r.tp, r.fp, r.tn, r.fn].join(','),
        ),
      )
      .join('\n'),
  );

  console.log(`\n  Wrote summary.json, pairs.csv, threshold-sweep.csv to ${outDir}`);
  console.log('  pairs.csv and threshold-sweep.csv drop straight into a chart for Chapter 4.\n');
}

main().catch((error) => {
  console.error('\nSpike failed:', error.message);
  console.error(error.stack);
  process.exitCode = 1;
});
