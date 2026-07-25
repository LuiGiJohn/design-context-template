#!/usr/bin/env node
/**
 * init-project.mjs — optional, non-AI fallback for the /init-project skill.
 *
 * Reads project.config.yaml, renders ds-context/ + studio-context/ into the target repos,
 * substituting {{PLACEHOLDER}} tokens and stripping the .tmpl suffix. Non-.tmpl files are
 * copied verbatim. Mode-specific text (consume/build banners, empty-key fallbacks) is baked into
 * the .tmpl files and resolves through substitution — no post-processing here or in the skill.
 *
 * Usage:  node scripts/init-project.mjs [--out <dir>] [--config <path>] [--dry]
 *   --out     target parent dir for the two repos (default: template's parent dir)
 *   --config  config file to read (default: project.config.yaml) — CI points this at the example
 *   --dry     print what would be written, write nothing
 *
 * Requires js-yaml:  npm i -g js-yaml   (or run from a dir where it's installed)
 * If js-yaml is unavailable, drive the /init-project skill instead — Claude parses YAML natively.
 */
import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const args = process.argv.slice(2);
const DRY = args.includes('--dry');
const OUT = (() => { const i = args.indexOf('--out'); return i >= 0 ? args[i + 1] : dirname(ROOT); })();
const CFG = (() => { const i = args.indexOf('--config'); return i >= 0 ? args[i + 1] : join(ROOT, 'project.config.yaml'); })();

let yaml;
try { const m = await import('js-yaml'); yaml = m.default ?? m; }
catch { console.error('✗ js-yaml not found. `npm i -g js-yaml`, or run the /init-project skill instead.'); process.exit(1); }

const cfg = yaml.load(readFileSync(CFG, 'utf8'));

// ── placeholder map ──────────────────────────────────────────────────────────
const p = cfg.project, d = cfg.design_system, c = cfg.consumer, pr = cfg.prototype, r = cfg.repos, u = cfg.user_preferences;
const e = cfg.engineering || {};
const MAP = {
  PROJECT_NAME: p.name, SYSTEM_NAME: p.system_name, SYSTEM_FULL_NAME: p.system_full_name,
  BRAND_SHORT: p.brand_shorthand, PARENT_ORG: p.parent_org || '', DOMAIN: p.domain, GITHUB_OWNER: p.github_owner,
  DS_MODE: cfg.ds_mode,
  DS_FIGMA_KEY: d.figma_source_key || '(created during setup)',
  DS_LIBRARY_KEY: d.library_key || '(set after first publish)',
  DS_VERSION: d.version, DS_PUBLISHED_DATE: d.published_date || 'unpublished',
  FONTS: d.fonts, TOKEN_PREFIXES: (d.token_prefixes || []).join(', '),
  CONSUMER_FIGMA_KEY: c.figma_file_key, CONSUMER_FILE_NAME: c.file_name,
  FRAME_W: c.frame.width, FRAME_H: c.frame.height, PAGE_BG_TOKEN: c.frame.bg_token,
  PROTOTYPE_NAME: pr.name, PROTOTYPE_DESC: pr.description,
  DS_REPO: r.ds_context, STUDIO_REPO: r.studio_context, ENGINEERING_REPO: r.engineering_context || '',
  COMPONENT_LIB: e.component_lib || 'ui', NATIVE_STACK: e.native_stack || 'Expo / React Native',
  APP_PACKAGE_ID: e.app_package_id || '(set during setup)', EAS_PROJECT: e.eas_project || '(set after first EAS build)',
  USER_METHODOLOGY: u.methodology, USER_COMMUNICATION: u.communication, USER_CODE_STYLE: u.code_style,
  USER_MENTORSHIP: u.mentorship, USER_HONESTY: u.honesty, USER_FORMAT: u.format,
};

// ── validation ───────────────────────────────────────────────────────────────
const missing = [];
for (const k of ['name','system_name','system_full_name','brand_shorthand','domain','github_owner']) if (!p[k]) missing.push(`project.${k}`);
for (const k of ['ds_context','studio_context']) if (!r[k]) missing.push(`repos.${k}`);
if (!c.figma_file_key) missing.push('consumer.figma_file_key');
if (cfg.ds_mode === 'consume') {
  if (!d.library_key) missing.push('design_system.library_key (required in consume mode)');
  if (!d.figma_source_key) missing.push('design_system.figma_source_key (required in consume mode)');
}
if (missing.length) { console.error('✗ Missing required config:\n  - ' + missing.join('\n  - ')); process.exit(1); }

const subst = (s) => s.replace(/\{\{(\w+)\}\}/g, (m, k) => (k in MAP ? String(MAP[k]) : m));
// Tidy the one artifact a blank optional value (e.g. parent_org) leaves in prose:
// "(  fintech)" → "(fintech)". Scoped to "open-paren + spaces" so it can't corrupt
// code like foo() or markdown-table padding (behavior-preserving even inside code).
const cleanup = (s) => s.replace(/\(\s+/g, '(');

function renderTree(srcDir, dstDir) {
  for (const name of readdirSync(srcDir)) {
    if (['node_modules', '.git', 'dist', '.vercel'].includes(name)) continue;
    const src = join(srcDir, name);
    if (statSync(src).isDirectory()) { renderTree(src, join(dstDir, name)); continue; }
    const isTmpl = name.endsWith('.tmpl');
    const outName = isTmpl ? name.slice(0, -5) : name;
    const dst = join(dstDir, outName);
    const body = isTmpl ? cleanup(subst(readFileSync(src, 'utf8'))) : readFileSync(src);
    if (DRY) { console.log('  would write', relative(OUT, dst)); continue; }
    mkdirSync(dirname(dst), { recursive: true });
    writeFileSync(dst, body);
    console.log('  ✓', relative(OUT, dst));
  }
}

console.log(`init-project · mode=${cfg.ds_mode} · out=${OUT}${DRY ? ' (dry run)' : ''}`);
console.log(`→ ${r.ds_context}`);     renderTree(join(ROOT, 'ds-context'), join(OUT, r.ds_context));
console.log(`→ ${r.studio_context}`); renderTree(join(ROOT, 'studio-context'), join(OUT, r.studio_context));
// The engineering context (coded component library + native app + release) is OPTIONAL — rendered only
// when repos.engineering_context is set. Design-only projects omit it and get the two Figma contexts.
if (r.engineering_context) { console.log(`→ ${r.engineering_context}`); renderTree(join(ROOT, 'engineering-context'), join(OUT, r.engineering_context)); }
console.log('Done. Next: git init each repo; populate DS skill mirrors; open in Claude Code.');
