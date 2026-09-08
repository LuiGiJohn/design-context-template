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
// --only ds,studio,engineering — render a subset. Useful when a project starts on
// one arm (e.g. code first, Figma files not created yet) and adds the rest later.
// Validation follows: a context you aren't rendering can't block you on its fields.
const ONLY = (() => {
  const i = args.indexOf('--only');
  if (i < 0) return ['ds', 'studio', 'engineering', 'growth'];
  const picked = (args[i + 1] || '').split(',').map((s) => s.trim()).filter(Boolean);
  const KNOWN = ['ds', 'studio', 'engineering', 'growth'];
  const bad = picked.filter((s) => !KNOWN.includes(s));
  if (bad.length) { console.error(`✗ --only: unknown context(s) ${bad.join(', ')}. Use ${KNOWN.join(', ')}.`); process.exit(1); }
  if (!picked.length) { console.error(`✗ --only needs at least one of: ${KNOWN.join(', ')}`); process.exit(1); }
  return picked;
})();

let yaml;
try { const m = await import('js-yaml'); yaml = m.default ?? m; }
catch { console.error('✗ js-yaml not found. `npm i -g js-yaml`, or run the /init-project skill instead.'); process.exit(1); }

const cfg = yaml.load(readFileSync(CFG, 'utf8'));

// ── placeholder map ──────────────────────────────────────────────────────────
const p = cfg.project, d = cfg.design_system, r = cfg.repos, u = cfg.user_preferences;
// consumer/prototype describe the Figma side. `--only engineering` projects may not
// have them yet, so tolerate their absence rather than throwing on a nested read.
const c = cfg.consumer || {}, pr = cfg.prototype || {};
c.frame ??= {};
const e = cfg.engineering || {};

// ── platform switch (web | native) ───────────────────────────────────────────
// The code arm ships in two flavours. Files whose *structure* is shared live in
// engineering-context/ and vary only through the placeholders below; the handful
// whose content genuinely diverges (developer, release-engineer, their commands,
// the release runbook, .gitignore) live in engineering-context/_platform/<platform>/
// and are overlaid on top of the base at render time.
//
// Defaults to `native` so projects stamped before this switch existed (which have
// no engineering.platform) render exactly as they did.
// Which org groups this project staffs. Roles whose `group:` is not enabled don't render at all —
// that is how one template serves a design-only engagement and a full company without forking.
const ORG_GROUPS = (cfg.org?.groups) || ['design-system','leadership','studio','app-builder','app-publisher','marketing','operations'];

const PLATFORM = e.platform || 'native';
const PLATFORM_DEFAULTS = {
  native: {
    APP_KIND: 'native app',
    APP_STACK: 'Expo / React Native',
    APP_ID_LABEL: 'package',
    APP_ID_FALLBACK: '(set during setup)',
    RELEASE_PROJECT_LABEL: 'EAS project',
    RELEASE_PROJECT_FALLBACK: '(set after first EAS build)',
    RELEASE_TARGET: 'EAS + the store',
    VERIFY_GATE: 'device',
    VERIFY_GATE_DESC: "real-hardware verification of what emulators can't prove",
    COMPONENT_KIND: 'React Native components',
    PROTO_CONSUMER: 'the usability prototype (Expo web export → Vercel)',
    DEPLOY_UNIT: 'signed artifact',
    RELEASE_CONFIRM: 'the store track',
    PLATFORM_TARGETS: 'iOS + Android',
    DS_PARITY_CMD: 'npm run tokens:sync -- --check && npm run storybook:test',
    BUILD_CHECK_CMD: 'npm run typecheck && npm run lint && npm test && npm run check:release',
  },
  web: {
    APP_KIND: 'web app',
    APP_STACK: 'Next.js / React',
    APP_ID_LABEL: 'production domain',
    APP_ID_FALLBACK: '(set during setup)',
    RELEASE_PROJECT_LABEL: 'hosting project',
    RELEASE_PROJECT_FALLBACK: '(set on first deploy)',
    RELEASE_TARGET: 'the hosting provider + the production domain',
    VERIFY_GATE: 'browser',
    VERIFY_GATE_DESC: "real-browser verification of what a dev server can't prove",
    COMPONENT_KIND: 'React components',
    PROTO_CONSUMER: 'the usability prototype',
    DEPLOY_UNIT: 'immutable deployment',
    RELEASE_CONFIRM: 'the live production URL',
    PLATFORM_TARGETS: 'the supported browser matrix',
    DS_PARITY_CMD: 'npm run tokens:sync -- --check && npm run storybook:test',
    BUILD_CHECK_CMD: 'npm run typecheck && npm run lint && npm test && npm run build',
  },
}[PLATFORM] ?? {};

// Any derived string above can be overridden per project — the platform defaults are
// the common case, not a straitjacket. A native project that builds locally in Xcode
// instead of on EAS sets release_target/release_project_label here rather than
// inheriting "EAS + the store". Keys are the lower_snake_case form of the placeholder.
for (const [key, value] of Object.entries(e)) {
  const upper = key.toUpperCase();
  if (upper in PLATFORM_DEFAULTS && value) PLATFORM_DEFAULTS[upper] = value;
}

// Pre-switch field names still work: native_stack → app_stack, app_package_id →
// app_id, eas_project → release_project. Anya and WAIS re-render byte-identical.
const APP_STACK = e.app_stack || e.native_stack || PLATFORM_DEFAULTS.APP_STACK;
const APP_ID = e.app_id || e.app_package_id || PLATFORM_DEFAULTS.APP_ID_FALLBACK;
const RELEASE_PROJECT = e.release_project || e.eas_project || PLATFORM_DEFAULTS.RELEASE_PROJECT_FALLBACK;

const MAP = {
  PROJECT_NAME: p.name, SYSTEM_NAME: p.system_name, SYSTEM_FULL_NAME: p.system_full_name,
  BRAND_SHORT: p.brand_shorthand, PARENT_ORG: p.parent_org || '', DOMAIN: p.domain, GITHUB_OWNER: p.github_owner,
  DS_MODE: cfg.ds_mode,
  DS_FIGMA_KEY: d.figma_source_key || '(created during setup)',
  DS_LIBRARY_KEY: d.library_key || '(set after first publish)',
  DS_VERSION: d.version, DS_PUBLISHED_DATE: d.published_date || 'unpublished',
  FONTS: d.fonts, TOKEN_PREFIXES: (d.token_prefixes || []).join(', '),
  CONSUMER_FIGMA_KEY: c.figma_file_key || '(created during setup)', CONSUMER_FILE_NAME: c.file_name,
  FRAME_W: c.frame.width, FRAME_H: c.frame.height, PAGE_BG_TOKEN: c.frame.bg_token,
  PROTOTYPE_NAME: pr.name, PROTOTYPE_DESC: pr.description,
  DS_REPO: r.ds_context, STUDIO_REPO: r.studio_context, ENGINEERING_REPO: r.engineering_context || '',
  COMPONENT_LIB: e.component_lib || 'ui',
  PLATFORM, APP_STACK, APP_ID, RELEASE_PROJECT,
  APP_KIND: PLATFORM_DEFAULTS.APP_KIND,
  APP_ID_LABEL: PLATFORM_DEFAULTS.APP_ID_LABEL,
  RELEASE_PROJECT_LABEL: PLATFORM_DEFAULTS.RELEASE_PROJECT_LABEL,
  RELEASE_TARGET: PLATFORM_DEFAULTS.RELEASE_TARGET,
  VERIFY_GATE: PLATFORM_DEFAULTS.VERIFY_GATE,
  VERIFY_GATE_DESC: PLATFORM_DEFAULTS.VERIFY_GATE_DESC,
  COMPONENT_KIND: PLATFORM_DEFAULTS.COMPONENT_KIND,
  PROTO_CONSUMER: PLATFORM_DEFAULTS.PROTO_CONSUMER,
  DEPLOY_UNIT: PLATFORM_DEFAULTS.DEPLOY_UNIT,
  RELEASE_CONFIRM: PLATFORM_DEFAULTS.RELEASE_CONFIRM,
  PLATFORM_TARGETS: PLATFORM_DEFAULTS.PLATFORM_TARGETS,
  DS_PARITY_CMD: e.ds_parity_cmd || PLATFORM_DEFAULTS.DS_PARITY_CMD,
  BUILD_CHECK_CMD: e.build_check_cmd || PLATFORM_DEFAULTS.BUILD_CHECK_CMD,
  GROWTH_REPO: r.growth_context || '',
  // Deprecated aliases — kept so pre-switch .tmpl files still resolve.
  NATIVE_STACK: APP_STACK, APP_PACKAGE_ID: APP_ID, EAS_PROJECT: RELEASE_PROJECT,
  USER_METHODOLOGY: u.methodology, USER_COMMUNICATION: u.communication, USER_CODE_STYLE: u.code_style,
  USER_MENTORSHIP: u.mentorship, USER_HONESTY: u.honesty, USER_FORMAT: u.format,
};

// ── validation ───────────────────────────────────────────────────────────────
const missing = [];
for (const k of ['name','system_name','system_full_name','brand_shorthand','domain','github_owner']) if (!p[k]) missing.push(`project.${k}`);
if (ONLY.includes('ds') && !r.ds_context) missing.push('repos.ds_context');
if (ONLY.includes('studio') && !r.studio_context) missing.push('repos.studio_context');
// In `build` mode the Figma files do not exist yet — that is the whole point of the mode,
// and it already relaxes the DS keys below. The consumer file is no more real at that point,
// so requiring it here made a genuinely new project unrenderable.
if (ONLY.includes('studio') && cfg.ds_mode !== 'build' && !c.figma_file_key) missing.push('consumer.figma_file_key');
if (ONLY.includes('ds') && cfg.ds_mode === 'consume') {
  if (!d.library_key) missing.push('design_system.library_key (required in consume mode)');
  if (!d.figma_source_key) missing.push('design_system.figma_source_key (required in consume mode)');
}
if (ONLY.includes('engineering') && r.engineering_context && !['web', 'native'].includes(PLATFORM)) {
  missing.push(`engineering.platform must be "web" or "native" (got "${PLATFORM}")`);
}
if (ONLY.includes('growth') && !r.growth_context && (cfg.org?.groups || []).some((g) => ['marketing', 'operations'].includes(g))) {
  missing.push('repos.growth_context (required when the marketing or operations groups are enabled)');
}
if (missing.length) { console.error('✗ Missing required config:\n  - ' + missing.join('\n  - ')); process.exit(1); }

const subst = (s) => s.replace(/\{\{(\w+)\}\}/g, (m, k) => (k in MAP ? String(MAP[k]) : m));
// Tidy the one artifact a blank optional value (e.g. parent_org) leaves in prose:
// "(  fintech)" → "(fintech)". Scoped to "open-paren + spaces" so it can't corrupt
// code like foo() or markdown-table padding (behavior-preserving even inside code).
const cleanup = (s) => s.replace(/\(\s+/g, '(');

function renderTree(srcDir, dstDir) {
  for (const name of readdirSync(srcDir)) {
    // `_platform` holds the per-platform overlays; it is never rendered as part of
    // the base walk — renderTree is called on the chosen variant explicitly below.
    if (['node_modules', '.git', 'dist', '.vercel', '_platform'].includes(name)) continue;
    // A role charter declares its `group:`; skip it when that group isn't staffed.
    // Uses srcDir (the directory being walked) — `src` below is not yet initialized here.
    if (name.endsWith('.md.tmpl') && srcDir.includes('agents')) {
      // Parse the WHOLE frontmatter block, not a fixed-size slice — a long `description:`
      // pushes `group:` past any byte cutoff and truncates the value mid-word.
      const fm = readFileSync(join(srcDir, name), 'utf8').match(/^---\r?\n([\s\S]*?)\r?\n---/);
      const g = fm && fm[1].match(/^group:\s*(.+)$/m);
      if (g && !ORG_GROUPS.includes(g[1].trim())) { console.log(`  – ${name.replace(/\.tmpl$/, '')} (group ${g[1].trim()} not staffed)`); continue; }
    }
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

const only = ONLY.length === 3 ? '' : ` · only=${ONLY.join(',')}`;
console.log(`init-project · mode=${cfg.ds_mode} · platform=${PLATFORM} · out=${OUT}${only}${DRY ? ' (dry run)' : ''}`);

if (ONLY.includes('ds')) { console.log(`→ ${r.ds_context}`); renderTree(join(ROOT, 'ds-context'), join(OUT, r.ds_context)); }
if (ONLY.includes('studio')) { console.log(`→ ${r.studio_context}`); renderTree(join(ROOT, 'studio-context'), join(OUT, r.studio_context)); }

// The engineering context (coded component library + app + release) is OPTIONAL — rendered only when
// repos.engineering_context is set. Design-only projects omit it and get the two Figma contexts.
// It renders in two passes: the shared base, then the `platform` overlay on top. The overlay wins on
// any path collision, which is how a web project gets a Vercel release runbook where a native one
// gets EAS, without either variant duplicating the shared roster docs.
if (ONLY.includes('engineering') && r.engineering_context) {
  const dst = join(OUT, r.engineering_context);
  console.log(`→ ${r.engineering_context} (base)`);
  renderTree(join(ROOT, 'engineering-context'), dst);
  const overlay = join(ROOT, 'engineering-context', '_platform', PLATFORM);
  if (!existsSync(overlay)) { console.error(`✗ No overlay for platform "${PLATFORM}" at ${overlay}`); process.exit(1); }
  console.log(`→ ${r.engineering_context} (platform: ${PLATFORM})`);
  renderTree(overlay, dst);
}

// The growth context (marketing + operations) is OPTIONAL — rendered only when repos.growth_context
// is set. A design-only or pre-launch project omits it; it becomes relevant the moment there is
// something shipped to market and support.
if (ONLY.includes('growth') && r.growth_context) {
  console.log(`→ ${r.growth_context}`);
  renderTree(join(ROOT, 'growth-context'), join(OUT, r.growth_context));
}

// company/ is ORG-level, not per-repo: the org chart, the gates, the handoff contracts and the
// single-writer checker. It renders once, ALONGSIDE the repos rather than inside any one of them,
// because a contract owned by one party to it is not a contract.
if (existsSync(join(ROOT, 'company'))) {
  console.log('→ company/ (org chart · gates · handoffs)');
  renderTree(join(ROOT, 'company'), join(OUT, 'company'));
}

console.log('Done. Next: git init each repo; populate DS skill mirrors; open in Claude Code.');
console.log('Verify the org: node company/check-org.mjs');
