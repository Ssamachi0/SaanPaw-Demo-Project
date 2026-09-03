#!/usr/bin/env node
/**
 * Rewrites the Expo web export so it works from a subpath (e.g. GitHub Pages'
 * https://user.github.io/repo/app/), not just from a domain root.
 *
 * `expo export -p web` emits root-absolute paths - "/favicon.ico" in the HTML,
 * and "/assets/..." / "/_expo/..." baked into the JS bundle as string literals
 * (font and image URLs live in the code, not just the markup). A <base href>
 * tag cannot fix those: it only affects *relative* URLs, and these are absolute.
 *
 * So this makes them relative, which resolves correctly at any subpath depth -
 * no repo name needs to be hardcoded. Run after `expo export -p web`.
 */
import fs from 'node:fs';
import path from 'node:path';

const distDir = path.resolve(import.meta.dirname, '..', 'dist');

/**
 * HTML: any root-absolute src/href becomes relative. Safe to apply broadly,
 * because these attributes are unambiguously URLs.
 */
const HTML_RULES = [[/\b(src|href)="\/(?!\/)/g, '$1="./']];

/**
 * JS: only the two known asset roots. A blanket rewrite here would corrupt
 * unrelated string literals - regex fragments like "/g are common in bundles.
 */
const JS_RULES = [
  [/"\/_expo\//g, '"./_expo/'],
  [/"\/assets\//g, '"./assets/'],
  [/'\/_expo\//g, "'./_expo/"],
  [/'\/assets\//g, "'./assets/"],
];

function rewrite(file, rules) {
  const before = fs.readFileSync(file, 'utf8');
  let after = before;
  for (const [pattern, replacement] of rules) after = after.replace(pattern, replacement);
  if (after === before) return false;
  fs.writeFileSync(file, after);
  console.log(`  rewrote ${path.relative(distDir, file)}`);
  return true;
}

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (entry.name.endsWith('.html')) rewrite(full, HTML_RULES);
    else if (/\.(js|css)$/.test(entry.name)) rewrite(full, JS_RULES);
  }
}

if (!fs.existsSync(distDir)) {
  console.error(`No dist/ folder at ${distDir}. Run "expo export -p web" first.`);
  process.exit(1);
}

console.log(`Rewriting absolute asset paths to relative in ${distDir}...`);
walk(distDir);

// Fail loudly rather than shipping a build that 404s only once deployed.
const leftovers = [];
for (const file of fs.readdirSync(distDir)) {
  if (!file.endsWith('.html')) continue;
  const html = fs.readFileSync(path.join(distDir, file), 'utf8');
  const found = html.match(/\b(?:src|href)="\/(?!\/)[^"]*"/g);
  if (found) leftovers.push(`${file}: ${found.join(', ')}`);
}
if (leftovers.length) {
  console.error('\nERROR: root-absolute URLs remain and will 404 on a subpath:');
  for (const l of leftovers) console.error(`  ${l}`);
  process.exit(1);
}

console.log('Done. No root-absolute URLs remain.');
