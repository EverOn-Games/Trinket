---
status: pending
phase: 06-onboarding
source: [06-SUMMARY.md]
started: 2026-07-05T00:00:00Z
updated: 2026-07-05T00:00:00Z
---

## Current Test

[queued — runs after 05-UAT]

## Tests

### 1. Fresh start lands in onboarding, fully skippable, zero permission dialogs
expected: On a fresh install (or cleared app data), the app opens into a 3-screen onboarding (what Trinket is + care disclaimer → optional first task → meet the mascot). Every screen is skippable. NO notification or microphone permission dialog appears anywhere in the flow.
result: [pending]

### 2. Optional first task becomes an inert dump item
expected: Typing a first task and continuing lands on Home; the task shows up in Brain dump as a normal item (nothing nags about it). Leaving it empty/skipping is treated as an equally valid path — same destination, no guilt copy.
result: [pending]

### 3. Onboarding never reappears
expected: Kill the app and reopen — you land directly on Home. Onboarding is one-way.
result: [pending]

## Summary

total: 3
passed: 0
issues: 0
pending: 3
skipped: 0

## Gaps

[none yet]
