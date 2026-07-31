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
| `{{SYSTEM_NAME}}` | `project.system_name` | DS short name (e.g. "APS") |
| `{{SYSTEM_FULL_NAME}}` | `project.system_full_name` | expansion |
| `{{BRAND_SHORT}}` | `project.brand_shorthand` | e.g. "AP" |
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
| `{{ENGINEERING_REPO}}` | `repos.engineering_context` | code repo; **omit the field → no engineering context rendered** |
| `{{COMPONENT_LIB}}` | `engineering.component_lib` | shared component package (default `ui`) |
| `{{PLATFORM}}` | `engineering.platform` | `web` \| `native` (default `native`) — picks the code arm's overlay |
| `{{APP_STACK}}` | `engineering.app_stack` | e.g. "Expo SDK 57 / React Native 0.86", "Next.js 16 / React 19" |
| `{{APP_ID}}` | `engineering.app_id` | native package id, or the web production domain |
| `{{RELEASE_PROJECT}}` | `engineering.release_project` | EAS project slug, or the hosting project |

**Derived from `platform`** (not settable directly — they exist so one shared file reads correctly on
both platforms):

| Placeholder | `native` | `web` |
|---|---|---|
| `{{APP_KIND}}` | native app | web app |
| `{{APP_ID_LABEL}}` | package | production domain |
| `{{RELEASE_PROJECT_LABEL}}` | EAS project | hosting project |
| `{{RELEASE_TARGET}}` | EAS + the store | the hosting provider + the production domain |
| `{{VERIFY_GATE}}` | device | browser |
| `{{VERIFY_GATE_DESC}}` | real-hardware verification of what emulators can't prove | real-browser verification of what a dev server can't prove |
| `{{COMPONENT_KIND}}` | React Native components | React components |
| `{{PROTO_CONSUMER}}` | the usability prototype (Expo web export → Vercel) | the usability prototype |
| `{{DEPLOY_UNIT}}` | signed artifact | immutable deployment |
| `{{RELEASE_CONFIRM}}` | the store track | the live production URL |

**Overriding a derived value.** The table is the common case, not a straitjacket — set the
lower_snake_case key under `engineering:` to override any row. A native project that builds locally in
Xcode rather than on EAS, for example:

```yaml
engineering:
  platform:               "native"
  release_target:         "a locally signed build + App Store Connect"
  release_project_label:  "Xcode project"
  release_confirm:        "the build's status in App Store Connect"
```

**Deprecated aliases, still resolving:** `{{NATIVE_STACK}}` → `{{APP_STACK}}`, `{{APP_PACKAGE_ID}}` →
`{{APP_ID}}`, `{{EAS_PROJECT}}` → `{{RELEASE_PROJECT}}`. The old config field names
(`native_stack`, `app_package_id`, `eas_project`) are read as fallbacks, so a project stamped before the
platform switch existed re-renders byte-identically. Prefer the new names in new configs.
| `{{USER_METHODOLOGY}}` … `{{USER_FORMAT}}` | `user_preferences.*` | personal defaults |

The `engineering` block + `repos.engineering_context` are **optional** — set them to render the third
(code) context; omit `repos.engineering_context` for a design-only project (init renders just the two
Figma contexts). The engineering placeholders fall back to sensible defaults if the block is absent.

## The platform switch (`web` | `native`)

The code arm ships in two flavours. Most of it is identical — the roster, the pipeline, the three gates,
the one-library-three-consumers rule — so those files live once in `engineering-context/` and vary only
through the derived placeholders above. The handful whose content genuinely diverges lives in
**`engineering-context/_platform/<platform>/`** and is **overlaid on the base** at render time:

```
engineering-context/
├── AGENTS-HANDOFF.md.tmpl          ← shared (placeholders do the platform work)
├── CLAUDE.md.tmpl                  ← shared
├── README.md.tmpl                  ← shared
├── .claude/agents/component-engineer.md.tmpl   ← shared
├── .claude/commands/component-build.md.tmpl    ← shared
├── skills/shared-component-library.md.tmpl     ← shared
└── _platform/
    ├── native/   app-engineer (Expo/RN) · build-uploader (EAS + store) · app-build · release ·
    │             release-runbook · .gitignore
    └── web/      app-engineer (Next.js) · build-uploader (host deploy) · app-build · release ·
                  release-runbook · .gitignore
```

Init renders the base first (skipping `_platform`), then the chosen overlay on top; **the overlay wins on
any path collision**. Both variants produce the same file names, so the roster, the commands, and the
skills are the same three agents and three commands either way — only their bodies change.

**Adding a platform-varying file:** put it in BOTH `_platform/web/` and `_platform/native/` at the same
relative path. If you find yourself copying 90% of a file between the two, it belongs in the shared base
with a placeholder instead — that is the whole point of the derived table.

**Adding a third platform** (say `desktop`): add a `PLATFORM_DEFAULTS` entry in `init-project.mjs` and a
`_platform/desktop/` folder with the same six files. Nothing else changes.

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
- `studio-context/skills/behavioral-science-principles.md` — your domain's behavioral mechanisms + anti-patterns (the `behavioral-scientist` evidence base; the `ux-flow-review` domain overlay cites it)
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

## The contexts at a glance

- **`ds-context`** (Figma) — authors + publishes the design system.
- **`studio-context`** (Figma) — builds the consumer screens + the usability prototype.
- **`engineering-context`** (code, OPTIONAL) — the coded component library + Storybook, the app
  (Expo/RN or Next.js, per `engineering.platform`), and the release. Rendered only when
  `repos.engineering_context` is set.

See `docs/ARCHITECTURE.md` for the boundary diagram + the intake→build→validate→ship pipeline, and each
context's own `CONTEXT.md` / `CLAUDE.md` / `AGENTS-HANDOFF.md` (rendered from `.tmpl`) for the full
operating manual.

**Prototype↔app alignment (the reason the engineering context pays off):** the studio's usability
prototype renders the **same `{{COMPONENT_LIB}}` components the app ships** — `component-engineer` builds
the library once, and both the prototype and the app consume it. What you usability-test is what you
ship, so prototype→app rework is near-zero. On `platform: native` that means an Expo web export of the
RN components; on `platform: web` the prototype and the app are both web, so it needs no export step at
all. Design-only projects skip this and keep the standalone web prototype.
