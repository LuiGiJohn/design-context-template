# HANDOFF — start a new project from this template

Clone this template (GitHub → **Use this template**, or `gh repo clone LuiGiJohn/design-context-template
my-new-project`), open the clone in Claude Code, and paste the prompt below. Fill in whatever you
already know; it tells Claude to interview you for the rest, then render the two contexts.

See `README.md` for the quickstart, `docs/ARCHITECTURE.md` for the two-context boundary + pipeline,
and `TEMPLATE-GUIDE.md` for the placeholder reference.

---

## The kickoff prompt (copy-paste into a fresh session)

```text
You're helping me stand up a NEW design project from the design-context-template
(github.com/LuiGiJohn/design-context-template). This repo IS that template — a factory that
renders two Claude Code contexts: a DS context (authors + publishes a design system) and a
studio context (consumes it to build screens + run usability-validated prototypes).

GROUND RULES (my working prefs): lead-to-peer, brief, no filler. Plan in yaml. Straight
conversation, no tappable buttons. Disclose constraints honestly — no oversell.

STEP 1 — Orient. Read, in this order: README.md, docs/ARCHITECTURE.md,
.claude/skills/init-project/SKILL.md, project.config.yaml, project.config.example.yaml.
Confirm in one line that you understand the two-context architecture and the ds_mode switch.

STEP 2 — Pick the mode.
  - consume = a design system already exists + is published (I'll give you its library_key +
    source file key). Studio points at it and builds screens immediately.
  - build   = no design system yet. DS context authors one from scratch; studio consumes as it grows.
Ask me which, if I haven't said.

STEP 3 — Fill project.config.yaml. Here's what I know so far (interview me for anything missing,
and DON'T guess — leave blanks and tell me what you need):
  - ds_mode:            <consume | build>
  - project name / org: <…>
  - system short-name:  <e.g. ACME-DS>
  - domain:             <e.g. fintech / healthcare booking>
  - github owner:       <…>
  - repo names:         <ds_context repo>, <studio_context repo>
  - consumer Figma key: <the screen write-surface file>
  - if consume → library_key + DS source file key
  - fonts + frame size: <or use the 402×874 default>

STEP 4 — Validate. Before rendering, check the required fields for the chosen mode (consume
requires library_key AND figma_source_key). If anything's missing, STOP and list it.

STEP 5 — Render. Confirm the target directory with me first (default: siblings of this template,
named by the repo names). Then run /init-project (or: npm i --no-save js-yaml &&
node scripts/init-project.mjs --out <dir>).

STEP 6 — Verify + report. Confirm: 0 leftover .tmpl files, 0 unsubstituted {{TOKENS}}, and both
rendered CONTEXT.md files read correctly for the mode. Then give me the next steps (git init/push
each repo; consume → populate the studio skill mirrors from the published DS; build → author the
DS, publish v0.1, paste keys back, re-run /init-project).

Flag honestly anything that doesn't render cleanly — that's a template bug to fix in the .tmpl,
not the rendered copy.
```

---

## After init — where to go next

- **consume mode** — open the studio context; populate the skill mirrors (`skills/ds-tokens.md`,
  `ds-components.md`, `figma-gotchas.md`) from the published DS via `tools/inventory-snippet.js`,
  then start building screens with `ux-designer` → `ui-designer`.
- **build mode** — open the DS context; author tokens + components with `ds-steward` /
  `component-designer`, publish v0.1, paste `library_key` + source key back into
  `project.config.yaml`, and re-run `/init-project` (idempotent) so the studio picks them up.

Either way, each rendered repo boots from its own `CONTEXT.md` + `CLAUDE.md`.
