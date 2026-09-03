#!/usr/bin/env node
/**
 * Rewrites the Expo web export so it works from a subpath (e.g. GitHub Pages'
 * https://user.github.io/repo/app/), not just from a domain root.
 *
 * `expo export -p web` bakes root-absolute paths like "/assets/..." and
 * "/_expo/..." straight into index.html AND into the JS bundle itself (font
 * and image URLs are string literals inside the code, not just markup). A
 * <base href> tag cannot fix that — it only affects *relative* URLs, and these
 * are absolute. So this rewrites "/assets/ and "/_expo/ to "./assets/ and
 * "./_expo/ everywhere in dist/, which resolves correctly regardless of how
 * deep the subpath is - no repo name needs to be hardcoded here.
 *
 * Run after `expo export -p web`, before uploading dist/ anywhere.
 */
import fs from 'node:fs';
import path from 'node:path';

const distDir = path.resolve(import.meta.dirname, '..', 'dist');

const REPLACEMENTS = [
  [/"\/_expo\//g, '"./_expo/'],
  [/"\/assets\//g, '"./assets/'],
  [/'\/_expo\//g, "'./_expo/"],
  [/'\/assets\//g, "'./assets/"],
  [/(src|href)="\/_expo\//g, '$1="./_expo/'],
  [/(src|href)="\/assets\//g, '$1="./assets/'],
];

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full);
    } else if (/\.(js|html|css|json)$/.test(entry.name)) {
      const before = fs.readFileSync(full, 'utf8');
      let after = before;
      for (const [pattern, replacement] of REPLACEMENTS) {
        after = after.replace(pattern, replacement);
      }
      if (after !== before) {
        fs.writeFileSync(full, after);
        console.log(`  rewrote ${path.relative(distDir, full)}`);
      }
    }
  }
}

if (!fs.existsSync(distDir)) {
  console.error(`No dist/ folder at ${distDir}. Run "expo export -p web" first.`);
  process.exit(1);
}

console.log(`Rewriting absolute asset paths to relative in ${distDir}...`);
walk(distDir);
console.log('Done.');
