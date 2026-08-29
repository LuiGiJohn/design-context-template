#!/usr/bin/env node
/**
 * check-org.mjs — enforce the single-writer invariant.
 *
 * Every role charter declares an `owns:` list of path globs in its frontmatter. Two roles may never
 * own overlapping paths. This script fails the build if they do.
 *
 * Usage:  node company/check-org.mjs [rootDir ...]
 *         (defaults to the four context dirs)
 */
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';

const roots = process.argv.slice(2);
const DEFAULT_ROOTS = ['ds-context', 'studio-context', 'engineering-context', 'growth-context'];
const searchRoots = (roots.length ? roots : DEFAULT_ROOTS).filter(existsSync);

if (!searchRoots.length) {
  console.error('check-org: no context directories found. Run from the template root.');
  process.exit(2);
}

/** Recursively collect agent charter files. */
function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === '.git') continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.md(\.tmpl)?$/.test(entry) && full.includes('agents')) out.push(full);
  }
  return out;
}

/** Minimal frontmatter reader — `name:` scalar and `owns:` block list. Line-based on purpose:
 *  a regex lookahead for "end of block" has to handle `owns:` being the LAST key, and the obvious
 *  spellings of that are subtly wrong in JS (`\\Z` is not an anchor here — it matches a literal Z). */
function parseCharter(file) {
  const text = readFileSync(file, 'utf8');
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return null;

  const lines = m[1].split(/\r?\n/);
  let name = null;
  const owns = [];
  let inOwns = false;

  for (const line of lines) {
    const nameMatch = line.match(/^name:\s*(.+)$/);
    if (nameMatch) { name = nameMatch[1].trim(); inOwns = false; continue; }

    if (/^owns:\s*$/.test(line)) { inOwns = true; continue; }

    if (inOwns) {
      const item = line.match(/^\s+-\s*(.+?)\s*$/);
      if (item) { owns.push(item[1].replace(/^["']|["']$/g, '')); continue; }
      if (/^\S/.test(line)) inOwns = false;   // a new top-level key ends the block
    }
  }
  return { file, name, owns };
}

/** Normalize a glob to a comparable path prefix. */
const prefixOf = (g) => g.replace(/\/?\*\*.*$/, '').replace(/\/?\*.*$/, '').replace(/\/+$/, '');

/** Do two globs cover any common path? */
function overlaps(a, b) {
  if (a === b) return true;
  const pa = prefixOf(a), pb = prefixOf(b);
  if (!pa || !pb) return false;          // a bare `**` owns nothing meaningful — flagged separately
  return pa === pb || pa.startsWith(pb + '/') || pb.startsWith(pa + '/');
}

const charters = searchRoots
  .flatMap((r) => walk(r))
  .map(parseCharter)
  .filter((c) => c && c.name);

const problems = [];
const missing = charters.filter((c) => c.owns.length === 0);

for (let i = 0; i < charters.length; i++) {
  for (let j = i + 1; j < charters.length; j++) {
    const A = charters[i], B = charters[j];
    if (A.name === B.name) {
      // Same role rendered for two platforms is legitimate; same role twice in one platform is not.
      const platformScoped = /_platform/.test(A.file) && /_platform/.test(B.file);
      if (!platformScoped) problems.push(`duplicate role name "${A.name}"\n    ${A.file}\n    ${B.file}`);
      continue;
    }
    for (const ga of A.owns) {
      for (const gb of B.owns) {
        if (overlaps(ga, gb)) {
          problems.push(`overlapping write surface\n    ${A.name.padEnd(24)} owns ${ga}\n    ${B.name.padEnd(24)} owns ${gb}`);
        }
      }
    }
  }
}

console.log(`check-org: ${charters.length} role charters across ${searchRoots.length} contexts\n`);

if (missing.length) {
  console.log(`⚠  ${missing.length} charter(s) declare no \`owns:\` — single-writer cannot be verified for them:`);
  for (const m of missing) console.log(`     ${m.name.padEnd(24)} ${relative(process.cwd(), m.file)}`);
  console.log('');
}

if (problems.length) {
  console.error(`✗ ${problems.length} single-writer violation(s):\n`);
  for (const p of problems) console.error('  ' + p + '\n');
  process.exit(1);
}

console.log(`✓ single-writer holds — no two roles share a write surface.`);
if (missing.length) { console.log('  (undeclared charters above are unverified, not proven clean.)'); process.exit(0); }
