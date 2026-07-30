---
name: init-project
description: Scaffold a new two-context design project from this template. Reads project.config.yaml, substitutes every {{PLACEHOLDER}}, selects scaffolding by ds_mode (consume|build), and renders ds-context/ + studio-context/ into two ready-to-use repos. Use when the user says "init the project", "scaffold the contexts", "set up a new design project from the template", "render the template", or after they fill in project.config.yaml. Idempotent — safe to re-run after editing the config.
---

# init-project — render the template into two working contexts

This template is a **factory** for a two-context design system proven in production:
a **DS context** (authors + publishes a design system) and a **studio context** (consumes it
to build screens + run usability-validated prototypes). This skill stamps out a fresh pair for
a new project from `project.config.yaml`.

## 0 · Preconditions
- `project.config.yaml` exists at the template root and is filled in. If key REQUIRED fields are
  blank, STOP and list exactly which ones (see the validation table below). Don't guess values.
- You know the **target directory** for the two rendered repos. Default: the template's parent
  directory (siblings of the template), named by `repos.ds_context` / `repos.studio_context`.
  Confirm with the user before writing outside the template folder.

## 1 · Read + validate the config
Read `project.config.yaml`. Build the placeholder map (left = token in `.tmpl` files, right = config path):

| Placeholder | Config path | Required when |
|---|---|---|
| `{{PROJECT_NAME}}` | `project.name` | always |
| `{{SYSTEM_NAME}}` | `project.system_name` | always |
| `{{SYSTEM_FULL_NAME}}` | `project.system_full_name` | always |
| `{{BRAND_SHORT}}` | `project.brand_shorthand` | always |
| `{{PARENT_ORG}}` | `project.parent_org` | optional (blank → omit the clause) |
| `{{DOMAIN}}` | `project.domain` | always |
| `{{GITHUB_OWNER}}` | `project.github_owner` | always |
| `{{DS_MODE}}` | `ds_mode` | always (`consume`\|`build`) |
| `{{DS_FIGMA_KEY}}` | `design_system.figma_source_key` | **consume**: required · **build**: may be blank |
| `{{DS_LIBRARY_KEY}}` | `design_system.library_key` | **consume**: required · **build**: blank until first publish |
| `{{DS_VERSION}}` | `design_system.version` | always |
| `{{DS_PUBLISHED_DATE}}` | `design_system.published_date` | consume: required |
| `{{FONTS}}` | `design_system.fonts` | always |
| `{{TOKEN_PREFIXES}}` | `design_system.token_prefixes` (join `, `) | always |
| `{{CONSUMER_FIGMA_KEY}}` | `consumer.figma_file_key` | always |
| `{{CONSUMER_FILE_NAME}}` | `consumer.file_name` | always |
| `{{FRAME_W}}` / `{{FRAME_H}}` | `consumer.frame.width/height` | always |
| `{{PAGE_BG_TOKEN}}` | `consumer.frame.bg_token` | always |
| `{{PROTOTYPE_NAME}}` | `prototype.name` | always |
| `{{PROTOTYPE_DESC}}` | `prototype.description` | always |
| `{{DS_REPO}}` | `repos.ds_context` | always |
| `{{STUDIO_REPO}}` | `repos.studio_context` | always |
| `{{USER_*}}` | `user_preferences.*` | always (prefilled) |

**Validation gate.** In `consume` mode, `design_system.library_key` AND `design_system.figma_source_key`
must be non-empty (the studio has nothing to consume without them). In `build` mode they may be blank.
If validation fails, print the missing list and STOP.

## 2 · Render each context
For each of `ds-context/` and `studio-context/`, copy the tree into the target repo dir:
- **`*.tmpl` files** → strip the `.tmpl` suffix and replace every `{{PLACEHOLDER}}` with its config value.
- **non-`.tmpl` files** (the generic canons, tools, harness) → copy **verbatim** (they're already project-agnostic).
- Preserve directory structure and `.claude/` layout exactly.
- If `{{PARENT_ORG}}` is blank, also remove the now-empty "(an `<org>` …)" parenthetical it leaves behind.

## 3 · Verify mode rendered correctly (`ds_mode`)
**The templates self-wire by mode — do NOT hand-inject banners.** Every `.tmpl` already carries the
`{{DS_MODE}}` value and the empty-key fallbacks, so substitution alone produces the right per-mode
text. Your job here is to **verify** the render, not to edit it. After Step 2, confirm:

**consume** — a published DS already exists (`library_key` + `figma_source_key` were required):
- studio `CONTEXT.md` "Project facts" shows the real `library_key` + `version` and the consume banner.
- the studio `skills/` mirrors (`ds-tokens.md`, `ds-components.md`, `figma-gotchas.md`) render with their
  dual-mode banner intact — they are read-only snapshots the user populates by running the DS context's
  `tools/inventory-snippet.js` against `figma_source_key`.

**build** — no DS yet (`library_key`/`figma_source_key` may be blank):
- DS + studio `CONTEXT.md` show `library_key → (set after first publish)` and
  `figma_source_key → (created during setup)`.
- the studio mirrors show the same dual-mode banner — its "in build mode this is empty until the DS
  context's first publish" line is the live guidance; nothing to add.

If any of the above did NOT render (e.g. a banner missing, a key not substituted), that's a template
bug — fix the `.tmpl`, not the rendered copy, so the next project inherits the fix.

## 4 · Prototype harness
The instrumented React/Vite usability harness is **not vendored** in this template — it is bundled by
the global **`usability-prototype`** skill (cohort split · Clarity heatmaps · PostHog time-on-task ·
SEQ · `/results` dashboard · access gate · Vercel deploy). Render
`studio-context/prototypes/README.md.tmpl` → a pointer that tells the builder to invoke that skill
with `prototype.name` + `prototype.description` + the analytics env-var names from the config. Do not
hand-recreate the harness here.

## 5 · Post-render report
Print a table: each rendered file, mode chosen, and any placeholder left intentionally blank
(e.g. `library_key` in build mode). Then print the next steps:
1. `git init` each rendered repo (or push to `github_owner/<repo>`).
2. **consume**: populate the studio skill mirrors from the published DS (inventory snippet).
   **build**: open the DS context, author tokens/components, publish, paste keys back, re-run this skill.
3. Open each repo in Claude Code — `CONTEXT.md` + `CLAUDE.md` boot the session.

## Idempotency
Re-running over an existing render is safe: re-substitute and overwrite the rendered files. Never
touch a rendered repo's `.git/`, `.env`, `.vercel/`, or `node_modules/`. If a rendered file was
hand-edited after init, warn before overwriting it.
