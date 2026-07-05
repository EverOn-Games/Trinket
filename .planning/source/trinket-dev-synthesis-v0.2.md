# Trinket. Development Synthesis v0.2 (Phase 1 features)

**Version:** v0.2, extends v0.1
**Purpose:** Briefing for Claude Code sessions building the Phase 1 feature set on top of the shipped MVP. Covers the two remaining mechanics (Soft landing, Bridge), the light mode switch, and the three out-of-app presence surfaces (home screen widgets, Live Activities, Android system overlay). Section 2 constraints from v0.1 still apply and are extended here for surfaces that reach outside the app.

**Read alongside:** `trinket-dev-synthesis-v0.1.md` (MVP spec, hard constraints, mascot state machine), Claude Design output (dark-mode tokens), `trinket-model-biznesowy-v0.4.xlsx` (retention is the primary revenue driver, which is what this phase serves).

**Companion form is still under test.** The circle-vs-character question is open and going to the beta cohorts. Build every surface in this document companion-agnostic, the same way the MVP mascot state machine is. Three features here are sensitive to the outcome and are flagged inline: widget art, overlay presence, and Live Activity art. A glowing abstract form is cheaper to render and lands more softly on a lock screen or overlay than a detailed character, so the form decision and these surfaces inform each other.

---

## 1. Phase overview

Phase 1 does two things. It completes the transition-support half of the product (Soft landing and Bridge, the second core moment: moving between tasks), and it extends the companion's presence beyond the single app screen (widgets, lock screen, overlay). Both serve retention, which the model treats as roughly twice the lever that acquisition cost is on year-three revenue.

Light mode ships in this phase as a standalone piece of work, since the MVP shipped dark-only.

## 2. Constraints carried forward, plus the out-of-app surface rule

All v0.1 hard constraints hold without change: shame-free design (no streaks, no punitive states, warm re-entry, no guilt notifications), PDA-aware grammar (the companion reacts, it does not initiate or demand; UI offers, it does not instruct), the AI boundary (input processing only, no generated guidance), local-first privacy under GDPR Article 9, and the wellness copy boundary.

Phase 1 adds one rule, because every feature here reaches outside the app screen:

> **A surface the user summoned is companionship. A surface the user did not summon is surveillance.** Every out-of-app surface (notification, widget, lock screen activity, overlay) must be user-invited or user-configured, silent about absence, and dismissable at zero cost.

Concrete consequences:
- No surface ever references time away, missed sessions, or inactivity
- No surface shows a streak, a count that can imply falling behind, or a red badge
- Every surface has a one-step, permanent-until-reinvited dismissal, and dismissing it produces no follow-up
- A persistent presence (widget, overlay, lock screen) shows the companion in a resting or present state, with no state in the asset set that could read as disappointed or waiting-for-you

## 3. Soft landing (Miękkie lądowanie)

**What it is.** A user-configured heads-up that a planned change of activity is approaching, giving runway before the switch instead of an abrupt stop. The user sets these up for themselves. The app reflects the user's own intention back to them at the time they chose.

**Why it stays inside the constraints.** The alert carries information the user asked for. It is the user's plan spoken back, closer to Starter's optional notification than to an app-imposed reminder. It gives a gentle approach to a transition rather than a demand to transition now.

**Flow:**
1. Setup: from a task, a session, or a standalone entry, the user defines a landing: the upcoming activity and how much runway they want (for example 10 minutes before). Runway lengths are suggestions, freely set.
2. Delivery: at the chosen time, a low-salience notification arrives, phrased as information. Acceptable: "In 10 minutes: you planned to move to [activity]." Not acceptable: any imperative, any "time to," any implication of failure if ignored.
3. Optional second touch at the transition moment itself, again informational, again opt-in.
4. Dismissal: swiping it away ends it. No "you ignored your landing" state exists.

**Copy rules.** Informational, second person, the user's own words where possible. No exclamation-driven urgency. No mascot speech that issues an instruction (the PDA constraint applies to notification text too).

**Data:** `landings`: id, activity_label, source_task_id?, lead_minutes, fire_at, optional_transition_touch (bool). No completion tracking. Whether the user acted on a landing is not recorded, because recording it invites a pressure surface later.

## 4. Bridge (Pomost)

**What it is.** A short optional ritual that eases the gap between finishing one thing and starting the next. Grounded in the self-compassion literature (Wakelin et al. 2022). Offered at transition points, never imposed.

**Where it appears.** Most naturally at the end of a Co-pilot session, offered as one path among equals (end and rest, end and bridge to the next thing, or just end). Also reachable on its own when the user feels stuck between tasks.

**Flow:**
1. Offer: after a session, or on demand, a Bridge is presented as an option. Declining is one tap and carries no cost or comment.
2. The ritual: a brief guided sequence, a small number of steps, built from static content (breathing beat, a self-compassion line drawn from a fixed localized library, a single-sentence framing of the next first action). No generated text.
3. Handoff: the Bridge can end by opening a Starter for the next task, or by starting a new Co-pilot session, or by simply closing. The user picks.

**Constraint watch.** A ritual is at risk of hardening into an obligation. Guard against it: no Bridge streak, no "you skipped your bridge," no counter of bridges completed. The Bridge is available when wanted and invisible when not.

**Self-compassion content.** A fixed, localized (PL/EN) library of short lines, reviewed for tone, rotated so they do not feel mechanical. Static assets, not AI. Keep the library in version control so tone stays controlled.

**Data:** `bridges` (optional, only if a quiet history is wanted): id, from_session_id?, started_at, completed (bool), next_action (starter | session | none). If storing `completed` risks becoming a pressure surface, omit it.

## 5. Light mode

**Scope.** Add a light theme and a switch. Dark stays the default. The MVP shipped dark-only with tokens extracted from the Claude Design system.

**Approach.** Author light mode as a real theme with its own tokens, not a mechanical inversion of the dark palette. The product's visual anchor is a warm, night-cozy register; the light theme needs its own warm, earthy palette that holds the same character in daylight rather than a flat inverted one. This was the earlier Option B (light tokens authored deliberately) over Option C (auto-invert), and it holds.

**Switch behavior.** Follow the system appearance by default, with a manual override in settings (System, Light, Dark). Persist the override locally.

**Token work.**
- Extend the `theme/` module to a light token set parallel to the existing dark set
- Every screen already reads tokens (per v0.1); audit for any hardcoded dark values that slipped in and route them through tokens
- Companion rendering must read on light backgrounds. If the companion is the glowing form, verify the glow holds contrast on light surfaces. If it is a character, verify the art and its shadow work on light. This ties to the open form decision.
- Lottie assets: confirm each state reads in both themes, or provide theme-aware color layers

**Verification:** every screen in both themes, both locales, plus the out-of-app surfaces from section 6 in both themes where the OS exposes appearance to them.

## 6. Presence beyond the app

Three surfaces extend the companion outside the app screen. They share the section 2 out-of-app rule and a common shape: the companion is present, entry into a session is one tap, and nothing references absence.

Platform reality up front: none of these can run continuous animation, and all of them require native extension code. See section 7.

### 6a. Home screen widgets

**Purpose.** Ambient presence on the home screen plus a one-tap way into a Co-pilot session. A widget puts the companion in view without an overlay and without watching the user, which makes it the gentlest of the three surfaces.

**Content by size:**
- Small: companion in a resting state (static), tap opens directly into session start
- Medium: companion plus a one-tap Brain dump entry alongside the session entry
- No size shows counts, streaks, history, or anything that can read as a scoreboard

**State.** A widget may reflect coarse context that is not about the user's performance, for example time of day shifting the companion's resting art (awake by day, dozing by night). It never reflects how long since the user last opened the app.

**Platform:**
- iOS: WidgetKit, SwiftUI, timeline-driven, static art per entry, deep link into the session route
- Android: Glance (Jetpack Compose) preferred, RemoteViews as fallback, deep link into the session route
- Companion art in the widget depends on the form decision (glow renders trivially as static; a character needs a clean static pose from the asset set)

### 6b. Live Activities and the active-session surface

**Purpose.** During a Co-pilot session, show the companion's presence on the lock screen and Dynamic Island so the user sees it is with them without unlocking. This is a direct extension of the async body-double idea: the presence persists while the phone is down.

**Behavior:**
- Shows elapsed presence, or the user's chosen timer if they set one. Absent a chosen timer, show elapsed time as presence, not a countdown that implies a deadline.
- No idle-shaming: if the user set no timer, there is no "you have been away" or "still going?" state
- Ends when the session ends. One tap returns to the app.

**Platform:**
- iOS: ActivityKit, iOS 16.1+, Dynamic Island on supporting devices, Lock Screen elsewhere. Update budget is limited and there is no continuous animation; update at sensible intervals.
- Android: a foreground service with an ongoing notification carries the same role (you need a foreground service for an accurate session timer regardless). Custom notification layout showing companion presence and elapsed time, with a tap back into the session.
- The active-session foreground service on Android is also the prerequisite for 6c.

### 6c. System overlay (Android only)

**Purpose and hard boundary.** iOS blocks drawing outside the app sandbox, so this is Android-only. The purpose is narrow: let the companion's presence persist in a corner while the user works in a different app during an active Co-pilot session, so the body-double presence is not lost the moment they leave Trinket.

**This is the highest-risk surface for the target population.** An always-on floating thing that watches the user is exactly the pattern to avoid. The design that stays inside the constraints:
- Overlay appears only during an active Co-pilot session, never as an always-on presence
- It is small, in a resting or present state, movable, and dismissable in one step
- Dismissing it ends the overlay for that session and does not end the session or nag
- It shows presence only. No timer pressure, no messages, no prompts, nothing that reads as monitoring
- It is off by default and offered once, plainly, as an option for people who want the companion alongside their work

**Permission reality.** `SYSTEM_ALERT_WINDOW` (Display over other apps) requires an explicit user grant through a system settings screen (`Settings.canDrawOverlays`, `ACTION_MANAGE_OVERLAY_PERMISSION`). It is a heavyweight permission and users are right to be cautious. Onboard it only at the point the user opts into the overlay, with a plain explanation of what draws and when, and full function without it.

**Cost.** The overlay runs on the session foreground service (6b) and consumes battery while active. Keep it session-scoped partly for this reason.

## 7. Native architecture implications

The MVP rule (stay in the app process, no native modules beyond well-maintained community ones) relaxes here, because widgets, Live Activities, and overlays are native extensions by construction. Plan for it.

- **Expo path:** these cannot ship through the managed workflow in Expo Go. Move to Expo development builds with config plugins, or bare workflow. Community config-plugin approaches exist for app targets and Live Activities; evaluate maintenance state before adopting, and be ready to write and maintain the native pieces directly.
- **iOS:** a Widget Extension (SwiftUI, WidgetKit) and a Live Activity (ActivityKit) target, sharing an app group with the main app for state and deep links. Session route deep-linkable.
- **Android:** a Glance/RemoteViews widget, a foreground service with a custom ongoing notification for the active session, and an overlay service behind the `SYSTEM_ALERT_WINDOW` permission. Session route deep-linkable.
- **Shared:** define the deep-link contract for "open into a session" and "open into brain dump" once, and have every surface use it. Keep companion art export in a form that serves static native rendering (the form decision affects how easy this is).
- **Skill/expertise note:** this is the native-heavy slice flagged for the Phase 1.5 senior hire. Sequence accordingly if that hire is landing during this phase.

## 8. Build order proposal

1. Light mode: extend `theme/` to a parallel light token set, audit hardcoded values, add the System/Light/Dark switch, verify every screen in both themes and locales. Self-contained and unblocks the theme audit that the native surfaces also depend on.
2. Bridge: in-app, no native work, completes the session-end flow with an offered ritual. Static self-compassion library in version control.
3. Soft landing: user-configured informational notifications, reusing the notification plumbing from Starter.
4. Move the build to Expo development builds / bare, establish the deep-link contract and app group, before any native surface.
5. Home screen widgets (both platforms): the gentlest surface, and it exercises the native extension setup and deep links.
6. Active-session surface: Android foreground service and ongoing notification first (also the overlay prerequisite), then iOS Live Activity.
7. Android system overlay: last, behind its permission, session-scoped, off by default.

## 9. Validation targets

Phase 1 is retention work, so measure retention movement against the MVP baseline, and watch for the failure mode where an out-of-app surface reads as pressure and drives people away.

- D30 retention: improvement over the MVP baseline (the model's central lever)
- Session re-entry: share of sessions started from a widget or lock screen surface, as a signal that ambient presence helps people return
- Soft landing and Bridge: qualitative read from the cohorts on whether transition support helps or feels like nagging
- Surface opt-out rates: high opt-out on any surface, especially the overlay, is the early warning that it reads as surveillance rather than company. Instrument opt-in and opt-out per surface.
- Uninstall-after-permission: watch whether the overlay permission prompt correlates with uninstalls, and pull the prompt earlier or later based on it

## 10. Open decisions (do not block on these)

- Companion form (circle vs minimal named character vs raccoon), still going to beta. Affects widget art, Live Activity art, and how softly the overlay lands. Build companion-agnostic.
- Light mode default: ship following system appearance, revisit if cohorts prefer a different default
- Overlay inclusion at all: if beta signals that any persistent out-of-app presence reads as monitoring for this population, the overlay is the first feature to cut. Treat it as the most droppable item in the phase.
- Widget state richness: whether time-of-day companion state is worth the timeline cost, or a single resting pose suffices
- Expo dev build vs bare workflow: decide at step 4 based on the maintenance state of available config plugins

---

*Trinket development synthesis v0.2 (Phase 1 features), extends v0.1*
*EverOn Games sp. z o.o. / Trinket founding team*
