# TEMPLATE-GUIDE.md — placeholder reference + maintenance

How the template renders, every `{{PLACEHOLDER}}` it knows, and how to evolve the template itself
without breaking projects already stamped from it.

## How rendering works

`.tmpl` files carry `{{PLACEHOLDER}}` tokens. `/init-project` (or `scripts/init-project.mjs`):
1. reads `project.config.yaml`, builds the placeholder → value map,
2. validates the required fields for the chosen `ds_mode`,
3. walks `ds-context/` + `studio-context/`, rendering `*.tmpl` (substitute + drop suffix) and copying
   every other file verbatim into the two target repos.

**Rule of thumb for authoring template files:**
- A value that differs per project → put it in the config, reference it as `{{PLACEHOLDER}}`, name the
  file `*.tmpl`.
- A file that's identical across every project (a heuristic canon, a Figma gotcha, the inventory
  snippet) → ship it **without** `.tmpl`; it's copied verbatim.

## Placeholder reference

| Placeholder | Source (`project.config.yaml`) | Notes |
|---|---|---|
| `{{PROJECT_NAME}}` | `project.name` | product/org name |
| `{{SYSTEM_NAME}}` | `project.system_name` | DS short name (was "APS") |
| `{{SYSTEM_FULL_NAME}}` | `project.system_full_name` | expansion |
| `{{BRAND_SHORT}}` | `project.brand_shorthand` | was "AP" |
| `{{PARENT_ORG}}` | `project.parent_org` | optional; blank → clause dropped |
| `{{DOMAIN}}` | `project.domain` | e.g. "fintech" |
| `{{GITHUB_OWNER}}` | `project.github_owner` | repo owner |
| `{{DS_MODE}}` | `ds_mode` | `consume` \| `build` |
| `{{DS_FIGMA_KEY}}` | `design_system.figma_source_key` | build: "(created during setup)" |
| `{{DS_LIBRARY_KEY}}` | `design_system.library_key` | build: "(set after first publish)" |
| `{{DS_VERSION}}` | `design_system.version` | |
| `{{DS_PUBLISHED_DATE}}` | `design_system.published_date` | |
| `{{FONTS}}` | `design_system.fonts` | preload list before text ops |
| `{{TOKEN_PREFIXES}}` | `design_system.token_prefixes` | joined `, ` |
| `{{CONSUMER_FIGMA_KEY}}` | `consumer.figma_file_key` | studio write surface |
| `{{CONSUMER_FILE_NAME}}` | `consumer.file_name` | |
| `{{FRAME_W}}` / `{{FRAME_H}}` | `consumer.frame.width/height` | device frame |
| `{{PAGE_BG_TOKEN}}` | `consumer.frame.bg_token` | |
| `{{PROTOTYPE_NAME}}` | `prototype.name` | kebab-case |
| `{{PROTOTYPE_DESC}}` | `prototype.description` | |
| `{{DS_REPO}}` / `{{STUDIO_REPO}}` | `repos.*` | rendered repo names |
| `{{USER_METHODOLOGY}}` … `{{USER_FORMAT}}` | `user_preferences.*` | personal defaults |

## What's generic vs. project-data

**Generic (verbatim, reusable as-is):**
- studio canons: `ux-flow-review`, `usability-analytics`, `rebind` (procedure)
- DS skills: `figma-gotchas`, `component-authoring-standards`, `spiels`
- tools: `inventory-snippet.js`, `doc-drift-checker.py`
- all agent + command bodies (they reference placeholders for names/keys, but the *workflow* is generic)
- the prototype harness (lives in the `usability-prototype` skill, not vendored here)

**Project-data scaffolds (you populate per project), marked `*`:**
- `ds-context/skills/ds-tokens.md`, `ds-components.md` — your token/component catalog
- `studio-context/skills/ds-tokens.md`, `ds-components.md`, `figma-gotchas.md` — read-only mirrors of the above
- `studio-context/skills/screens.md` — your screen recipes
- `ds-context/manifest/` — your published-state baseline

These ship as **format scaffolds with a TODO banner**, not empty files — the schema is documented so
the first real entry is copy-paste.

## Updating the template (and propagating to projects)

- **Improve a generic part** (canon, gotcha, agent prompt): edit it here. New projects pick it up on
  init. Existing projects: copy the changed file across, or re-run init into a scratch dir and diff.
- **Add a new placeholder**: add the field to `project.config.yaml` (+ the example), add a row to the
  table above and in the skill's map table, then reference `{{NEW}}` in the relevant `.tmpl`.
- **Add a new agent/command/skill**: drop it in the right context folder. If its body has
  project-specific strings, name it `*.tmpl`; otherwise ship it verbatim.
- **Keep the example honest**: `project.config.example.yaml` must always render cleanly. After any
  schema change, dry-run it: `node scripts/init-project.mjs --dry --out /tmp/render-check`.

## The two contexts at a glance

See `docs/ARCHITECTURE.md` for the boundary diagram + the define→build→validate→handoff pipeline,
and each context's own `CONTEXT.md` / `CLAUDE.md` / `AGENTS-HANDOFF.md` (rendered from `.tmpl`) for
the full operating manual.
