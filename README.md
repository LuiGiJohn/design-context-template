# design-context-template

A reusable factory for a **two-context design pipeline** — the same architecture proven on
APS / Aster Pay, genericized so you can stand up a new project in minutes.

Each project gets **two repos / Claude Code contexts**:

| Context | Owns | Write surface |
|---|---|---|
| **DS context** (`{{ds_context}}`) | the design system itself — tokens, components, variants, bindings, manifest, publish, drift, i18n | the DS Figma source (authored via `use_figma`) |
| **studio context** (`{{studio_context}}`) | consumer **screens** composed from the DS + an instrumented **prototype** that usability-validates them before handoff | the consumer Figma file + `prototypes/` (React/Vite) |

The boundary is the whole point: the DS context **publishes** a library; the studio **consumes** it.
A gap found while building a screen routes **back** to the DS context as a token/component request —
never hand-built in the studio. That single rule is what keeps the system from drifting.

## Two modes — the `ds_mode` switch

- **`consume`** — a design system already exists and is published. You supply its `library_key` +
  source key; the studio points at it and starts building screens immediately.
- **`build`** — no design system yet. The DS context authors one from scratch; the studio consumes it
  as it grows. You publish v0.1, paste the keys back, and re-run init.

One template, both paths. Switch by editing one line in `project.config.yaml`.

## Quickstart

```
1. cp project.config.yaml  →  fill it in   (see project.config.example.yaml for a worked example)
2. /init-project                            (or: node scripts/init-project.mjs)
3. → renders {{ds_context}}/ and {{studio_context}}/ as two ready repos
4. git init each, open in Claude Code — CONTEXT.md + CLAUDE.md boot the session
```

That's it. Everything project-specific lives in `project.config.yaml`; everything reusable
(agent roster, heuristic canons, Figma gotchas, the prototype harness) ships generic.

## What's in the box

```
HANDOFF.md                     ← copy-paste kickoff prompt for a fresh session (start here)
project.config.yaml            ← fill this in (the single source of truth)
project.config.example.yaml    ← the APS setup, worked end-to-end
TEMPLATE-GUIDE.md              ← placeholder reference + how to extend/update the template
docs/ARCHITECTURE.md           ← the two-context boundary, the pipeline, the gates
.claude/skills/init-project/   ← /init-project — reads config, renders both contexts
scripts/init-project.mjs       ← optional non-AI renderer (needs js-yaml)

ds-context/      ← design-system authoring skeleton
  agents:   ds-steward · component-designer · brand-designer
  commands: /design-system-check · /binding-audit · /drift-check
  skills:   ds-tokens* · ds-components* · figma-gotchas · component-authoring-standards · spiels
  tools:    inventory-snippet.js · doc-drift-checker.py
  manifest: schema + empty baseline

studio-context/  ← screens + prototype skeleton
  agents:   ux-designer · ui-designer · flow-reviewer · consumer-migrator · data-analyst
  commands: /design-review · /consumer-audit · /rebind · /usability-report
  skills:   ux-flow-review · usability-analytics · rebind · screens* + DS mirrors
  prototypes/ → pointer to the usability-prototype harness skill
```
`*` = project-data scaffolds you populate per project; everything else is reusable as-is.

## Reusing across many projects

Run the quickstart once per product. The template never changes between projects — only
`project.config.yaml` does. Improvements to the *generic* parts (a sharper heuristic canon, a new
gotcha, a better agent prompt) belong **here in the template**, then flow to new projects on their
next init. Project-specific learnings stay in that project's rendered repos. See `TEMPLATE-GUIDE.md`.
