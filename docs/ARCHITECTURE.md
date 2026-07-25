# ARCHITECTURE — the two-context design pipeline

This template encodes one idea: **separate the people/agents who *make* a design system from the
people/agents who *use* it to build product** — and make the seam between them explicit, so the
system can't silently drift.

```
┌─────────────────────────────┐        publish library + skills/manifest        ┌──────────────────────────────┐
│   DS CONTEXT  ({{DS_REPO}})  │ ──────────────────────────────────────────────▶ │  STUDIO CONTEXT ({{STUDIO}}) │
│                             │                                                  │                              │
│  authors + PUBLISHES the    │                                                  │  CONSUMES the published lib  │
│  design system:             │                                                  │  to build + validate product│
│   • tokens / variables      │                                                  │   • ux-designer  (define)    │
│   • components / variants    │                                                  │   • ui-designer  (compose)   │
│   • bindings / manifest      │                                                  │   • flow-reviewer (gate)     │
│   • drift / i18n (spiels)    │ ◀──────────────────────────────────────────────│   • prototype (usability gate)│
│                             │     "gap found while building a screen" =        │   • data-analyst (validate)  │
│  ds-steward · component-     │     token/component REQUEST (never hand-built)   │   • consumer-migrator (rebind)│
│  designer · brand-designer   │                                                  │                              │
└─────────────────────────────┘                                                  └──────────────────────────────┘
                       ▲                                                                          │
                       └──────────────────── DESIGN.md = shared ground truth, both read ──────────┘
```

## Why two contexts (not one)

- **Different write surfaces.** The DS context writes the *source* Figma file; the studio writes the
  *consumer* file + code. Mixing them is how a one-off hand-built row becomes permanent drift.
- **Different cadence.** The DS publishes on its own version line; the studio consumes whatever's
  published. Decoupling lets screens keep moving while the system evolves underneath.
- **Different review lens.** The DS judges token/component *construction*; the studio judges screen
  *composition* and flow *sequencing*. Same heuristics, different altitude.

## The pipeline (studio slice)

```yaml
1_ux:        flows + state matrix + acceptance criteria + functional copy        (ux-designer)
2_gap?:      new pattern/component needed? → REQUEST to the DS context; wait or stub
3_ui:        compose the DS into the screen; render-verify each phase             (ui-designer)
4_gates:     design-review self-check (zero blockers) + binding audit (zero unbound)
4b_review:   INDEPENDENT heuristic evaluation                                     (flow-reviewer)
4c_evidence: INDEPENDENT evidence + ethics gate (mechanism/calibration/anti-pattern) (behavioral-scientist)
5_proto:     build + instrument the coded prototype; run the usability test       (usability-prototype)
6_analyze:   benchmark behavior vs UX norms → evidence                            (data-analyst)
6b_validate: usability GATE — validate screens vs the evidence; pass → handoff    (ux-designer)
7_handoff:   hand VALIDATED screens to product + engineering / go live
feedback:    any "DS is missing X" → DS context builds + publishes → studio consumes (loop)
             DS republished → refresh mirrors, then /rebind to confirm it's consumed
```

## The three gates before handoff

1. **Design-review lens** (zero blockers) — the `ux-flow-review` canon, applied at build time.
2. **Binding audit** (zero unbound on new frames) — nothing hand-styled escapes the token system.
3. **Usability-validation gate** — the flow is tested as a coded prototype (task success /
   time-on-task / SEQ + heatmaps) *before* it reaches product + engineering. A failure routes **back**
   to ux/ui, never forward. This is the gate the Figma checks can't be: it proves the design works for
   real users, not just that it's faithful and compliant.

## Shared building blocks (why behavior never drifts)

- **`ux-flow-review`** — the single heuristic-evaluation canon (5 frameworks + domain overlay + WCAG
  2.2 AA). Loaded by `ui-designer` (self-check), `flow-reviewer` (gate), and `/design-review`. Defined once.
- **`usability-analytics`** — the empirical-validation canon (metrics + benchmarks + triangulation).
  `data-analyst` runs it; `ux-designer` validates against its verdicts. Expert review + data are complementary.
- **`rebind`** — the consume-verification procedure. After a DS publish, swap stale instances onto the
  fresh main and re-audit, so you *know* the change is actually used (instances cache old layout until swapped).
- **`behavioral-science-principles.md`** — the evidence + ethics canon (this project's behavioral
  mechanisms + calibration + anti-pattern refusal list). `behavioral-scientist` owns + gates against it;
  the `ux-flow-review` domain overlay cites it. Three complementary review gates guard handoff:
  `flow-reviewer` (can they use it), `behavioral-scientist` (why does it work + is it honest),
  `data-analyst` (does it test well).

## `consume` vs `build`

- **consume** — the DS already exists. Studio points at `library_key` and builds. The DS context is
  still rendered (for authoring deltas), but the action starts in the studio.
- **build** — the DS context bootstraps a new system, publishes v0.1, and the studio consumes it as it
  grows. Early screens may stub not-yet-published components; `/rebind` reconciles after each publish.

## The engineering context (OPTIONAL third arm — code)

The two contexts above are Figma-centric: they design. A third context, **`engineering-context`**, turns
the design into **shipping software** — rendered only when `repos.engineering_context` is set (design-only
projects omit it). It owns three roles:

- **`component-engineer`** — the ONE coded implementation of the DS: a React Native component library
  (`{{COMPONENT_LIB}}`) + Storybook, with tokens GENERATED from the Figma DS (never hand-typed).
- **`app-engineer`** — the native app (Expo / React Native), composing the shared library into the
  validated screens; owns storage, navigation, native modules, and device verification.
- **`build-uploader`** — the signed build, versioning, data-safety declarations, and store upload +
  track promotion, under a verify-by-artifact discipline.

```
DS CONTEXT (Figma) ──published DS──▶ component-engineer ──▶ {{COMPONENT_LIB}} + Storybook
                                                                    │  (one coded library)
                    ┌────────────────────────────────────────────────┼──────────────────────────────┐
                    ▼                                                                                  ▼
STUDIO CONTEXT: screens ──▶ prototype (Expo web export → Vercel, consumes {{COMPONENT_LIB}})            app-engineer ──▶ build-uploader
                    │                    usability gate (product-designer + data-analyst)              (native app)      (EAS + store)
                    └───────────── the validated flow is the app's spec ────────────────────────────────┘
```

**The one idea that makes this pay off: one coded library, three consumers** (Storybook, the prototype,
the app). The prototype is an Expo web export of the *same* components the app ships, so what you
usability-test is what you ship — prototype→app rework drops from "re-implement" to "wire native
concerns." It adds three gates to the pipeline: **parity** (code matches Figma, verified in Storybook),
**device** (real-hardware checks emulators can't prove), and **release** (verify-by-artifact + honest
declarations + upload confirmed by re-reading the store). Full manual: `engineering-context/AGENTS-HANDOFF.md`.
