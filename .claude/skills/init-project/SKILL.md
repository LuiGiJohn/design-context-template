---
name: init-project
description: Scaffold a new two-context design project from this template. Reads project.config.yaml, substitutes every {{PLACEHOLDER}}, selects scaffolding by ds_mode (consume|build), and renders ds-context/ + studio-context/ into two ready-to-use repos. Use when the user says "init the project", "scaffold the contexts", "set up a new design project from the template", "render the template", or after they fill in project.config.yaml. Idempotent — safe to re-run after editing the config.
---

# init-project — render the template into two working contexts

This template is a **factory** for the two-context design system used on APS/Aster Pay:
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

## 3 · Mode-specific wiring (`ds_mode`)
**consume** — a published DS already exists:
- Keep the studio's `skills/` **mirrors** (`ds-tokens.md`, `ds-components.md`, `figma-gotchas.md`).
  Their header note says "read-only snapshot; refresh after each publish". Leave them as scaffolds with
  a TODO banner: the user runs the DS context's inventory snippet against `figma_source_key` to populate them.
- The studio `CONTEXT.md` "Project facts" shows the real `library_key` + `version` and the consume banner.
- DS context is still rendered (you may need to author *additions*), but its README leads with
  "consuming an existing system — author only deltas."

**build** — no DS yet:
- DS context leads: "bootstrapping a new design system from scratch." `library_key` shows
  `(set after first publish)`; `figma_source_key` shows `(created during setup)`.
- Studio's mirrors are rendered as **empty scaffolds** with a banner: "DS not yet published — mirrors
  fill in after the DS context's first publish, then run /rebind."
- Add a one-line note in the studio README: screens may stub components until the DS publishes them.

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
