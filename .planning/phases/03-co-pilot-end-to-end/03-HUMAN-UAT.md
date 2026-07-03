---
status: partial
phase: 03-co-pilot-end-to-end
source: [03-VERIFICATION.md]
started: 2026-07-03T03:25:00Z
updated: 2026-07-03T03:55:00Z
---

## Current Test

number: 5
name: Screen-reader pass over the one-liner "Start" CTA enabled/disabled state
expected: |
  A screen-reader user (VoiceOver/TalkBack) can tell when the one-liner "Start"
  button is disabled (before the field has focus) vs enabled — not only inferred
  from color. Fix candidate: add accessibilityState={{ disabled: !hasFocusedOneLiner }}.
awaiting: user response

## Tests

### 1. Real force-quit / OS-kill session survival
expected: Start a Co-pilot session, force-kill the app process (not just background it), reopen the app. If killed within ~12h, Home shows the warm resume card (continuity copy — never "interrupted"/"paused"). Resume returns to the active screen with elapsed correctly derived from the real startedAt (including dead time). A pointer last alive > ~12h ago shows NO resume card — it is already folded into History as an ordinary row.
result: pass

### 2. Mascot animation smoothness in the new Co-pilot hosting contexts (real low/mid-tier Android)
expected: Mascot renders smoothly (no dropped frames/jank) in presence on the active screen, transitioning to dozing after ~30 min, waking on tap, and playing the acknowledge one-shot at End. No stutter during the Reanimated elapsed/remaining crossfade or the mascot's own state-fade.
result: pass

### 3. Dozing + wake-on-touch over real elapsed time with genuine backgrounding
expected: Start a session, lock the phone / switch apps for 30+ real minutes, return. Mascot is dozing; tapping returns it to presence smoothly. Elapsed timer shows the correct real-world duration immediately on return, no visible catch-up lag or incorrect jump.
result: pass

### 4. Visual/tonal check of resume card and ending moment (shame-free / PDA intent)
expected: The resume card and the ending moment (acknowledgment + mood check) read as warm and pressure-free on an actual device screen — not clinical, not guilt-inducing, no visual emphasis implying evaluation/judgment.
result: issue
reported: "Tone feels ok. But when ending a session, the mood-emoji screen appears for only ~1 second and then auto-redirects to the start screen — the mood check can't actually be used."
severity: major
note: "Tone sub-check passed; the reported defect is the ending moment's mood-check auto-dismiss, not the copy."

### 5. Screen-reader pass over the one-liner "Start" CTA enabled/disabled state (03-REVIEW.md IN-02, unfixed)
expected: A screen-reader user (VoiceOver/TalkBack) can tell when the one-liner "Start" button is disabled (before the field has focus) vs enabled — not only inferred from color. Fix candidate: add `accessibilityState={{ disabled: !hasFocusedOneLiner }}` to the Pressable.
result: [pending]

## Summary

total: 5
passed: 3
issues: 1
pending: 1
skipped: 0
blocked: 0

## Gaps

- truth: "Ending a session always shows a warm acknowledgment with a usable, skippable one-tap 3-level mood check (PILOT-05, D-13); the mood check must remain until the user taps a mood or Skip — it must not auto-dismiss."
  status: failed
  reason: "User reported (Test 4, on-device): the mood-emoji screen appears ~1s then auto-redirects to Home. Root cause: EndingPhase wires the Mascot `acknowledge` one-shot's onStateAnimationComplete → finishEnding() → router.replace('/'), so navigation is driven by the (short placeholder) animation length. D-13 'Pattern 3' treated animation-conclusion as an implicit skip, but on real hardware the ~1s placeholder makes the mood check unusable."
  severity: major
  test: 4
  artifacts: ["src/app/co-pilot.tsx (EndingPhase, handleAnimationComplete)"]
  missing: ["mood check must persist until an explicit mood tap or Skip; decouple navigation from acknowledge-animation completion"]
