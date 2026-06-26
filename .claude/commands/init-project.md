---
description: Render this template into two working contexts (DS + studio) from project.config.yaml
---

Invoke the `init-project` skill. Read `project.config.yaml`, validate it for the chosen `ds_mode`,
then render `ds-context/` and `studio-context/` into the target repos — substituting every
`{{PLACEHOLDER}}` and selecting scaffolding by mode. Report what was written and the next steps.

Do not duplicate the workflow here — the skill owns it.
