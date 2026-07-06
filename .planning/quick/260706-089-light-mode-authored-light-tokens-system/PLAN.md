---
gsd_artifact: plan
quick_id: 260706-089
slug: light-mode-authored-light-tokens-system
created: 2026-07-06
mode: quick
requirements: [POLI-01]
---

# Quick Task: Light mode (v0.2 §5)

Authored light token set (Option B — deliberate, from the founder's mockup
CREAM/LIGHT reference in design/DESIGN-SYSTEM.md, never an inversion),
System/Light/Dark switch in Settings persisted as settings-store themeMode
(default 'system'; dark stays the brand fallback when the OS expresses no
preference), ThemeProvider resolution via pure resolveThemeTokens(), new
onAccent token fixing the latent cream-on-terracotta contrast issue at all
20 text-on-accent call sites (espresso in both themes — zero dark-mode
visual change), app.json userInterfaceStyle dark→automatic (PREBUILD
REQUIRED), mascot-on-light visual verification via headless Chromium.
