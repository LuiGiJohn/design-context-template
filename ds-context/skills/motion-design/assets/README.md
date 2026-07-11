# Motion assets

Production motion assets referenced by this system's components + prototypes live here.
Binary assets (`.lottie`, `.json`, `.gif`, poster `.png`) go in this folder; document each
one's component usage in `skills/ds-components.md`.

The template ships the **motion-design framework only** — no assets. Author your project's
motion assets (e.g. a brand loader) in LottieFiles Creator or equivalent, drop them here, and
add a row to the table below.

| File | Role | Specs |
|---|---|---|
| _(none yet)_ | — | — |

## Conventions
- Keep the **canonical runtime** as the actual asset file (`.lottie` / `.json`), not a re-implementation.
- Figma can't host a live Lottie in a published component — ship a static hero-frame poster (`.png`)
  as the raster placeholder on the Figma component, and document the runtime handoff (the real
  `.lottie`) in the component's `skills/ds-components.md` entry.
- Note the known Figma limitation: its static export/thumbnail pipeline can't rasterize animated GIFs
  (a static PNG renders where a GIF renders blank) — hence the still-poster + separate demo-card split.
- Name assets by what they are, not by a version (`brand-loader.lottie`, not `loader-v3.lottie`).
