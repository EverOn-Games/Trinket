# Trinket: Mascot "Ever-Present" Feasibility and Companion Design

**Status:** Reference synthesis, v0.1
**Date:** 2 July 2026
**Scope:** Conclusions from a working session on two linked questions. First, whether an ever-present animated mascot is technically feasible across Android, iOS, and React Native. Second, how the ADHD retention rationale reshapes what the mascot should actually do.

---

## TL;DR

1. A truly "alive everywhere" mascot is achievable **only on Android**, via the supported floating-overlay permission. **iOS forbids it** at the OS level. The asymmetry is structural and cannot be worked around.
2. Every system-presence feature (overlay, widgets, Live Activities) is **native work**. React Native runs the main app but cannot implement any of these in its JS layer.
3. The lock screen has **no official third-party API**. Both known workarounds are traps: one relies on accessibility (which Google is actively shutting down in 2026), the other is a full lock-screen replacement carrying heavy permissions and an OEM-fragility maintenance burden.
4. The retention rationale contains an internal contradiction. Object permanence and dopamine argue *for* presence; **PDA argues against it**. An ever-present, hard-to-ignore, prompting mascot is close to worst-case for a demand-avoidant user, and would cause the very drop-off it aims to prevent.
5. Resolution: **"present but never demanding / companion, not coach."** The right lever for this audience is not more presence forced harder, it is the right *kind* of presence plus removal of shame and friction. That reframe also makes the expensive lock-screen engineering largely unnecessary.

---

## Part 1: Platform feasibility

### "Ever-present" is actually three different surfaces

The phrase bundles three distinct OS capabilities with very different rules:

1. **Floating overlay over other apps** (the chat-head model: the mascot follows you across the whole OS).
2. **Home-screen widget** (sits among the app icons).
3. **Lock-screen presence.**

They must be treated separately, because the answer differs for each.

### iOS

- **Floating overlay over other apps: impossible.** The sandbox does not permit an app to draw outside its own bounds while another app is foregrounded. No entitlement or library changes this.
- **Widgets: interactive yes, animated no.** WidgetKit widgets are refreshed snapshots on a timeline. Since iOS 17 they support tap interactivity (buttons and toggles via App Intents), so a *tappable, state-changing* mascot works. Continuous looping animation does not. Refresh frequency is rate-limited by the system.
- **Live Activities / Dynamic Island: closest option, but constrained.** This is the only persistent live surface on the lock screen and Dynamic Island. Limits: roughly 8 hours active and up to about 12 hours total before the system dismisses it; purpose-bound to genuine ongoing events (a purely decorative use risks App Store rejection); the Island hardware exists only on iPhone 14 Pro and the 15/16/17 lines (older and SE devices get the lock-screen banner, not the pill); animation is limited SwiftUI.

Practical iOS toolkit: an in-app mascot, a static or interactive widget, and event-bound Live Activities tied to something Trinket genuinely tracks (a focus session, a live daily streak, a timer). Contained, not omnipresent.

### Android

- **Floating overlay over other apps: yes.** Via `SYSTEM_ALERT_WINDOW` / `TYPE_APPLICATION_OVERLAY`, the same mechanism as Messenger chat heads. Behavior is unchanged across Android 14, 15, and 16. Caveats: the user must grant it manually in special-access settings; Android 15 and 16 show a persistent notification while an app draws over others; Google Play scrutinizes this permission at review, so a clear legitimate justification is needed. A Lottie or sprite animation can render inside the overlay.
- **Home widget: interactive yes, smooth animation limited.** Tap actions have always worked (PendingIntent; Glance supports actionable elements). Continuous smooth animation is constrained by RemoteViews for battery reasons (frame-swaps on a timer at best).
- **Lock screen: no official third-party widget API.** Android removed lock-screen widgets in Lollipop (2014) and never restored them. Android 14 lock-screen customization covers clocks and shortcut slots, not arbitrary widgets. The overlay window does not draw over the keyguard.

### Lock-screen workarounds, and why both are traps

Two real approaches exist. Neither is a clean foundation for a consumer mascot app.

**1. Accessibility overlay (e.g. zwander's Lock Screen Widgets).** Uses an AccessibilityService to draw an overlay on top of the keyguard. It works, but this is precisely the pattern Google is closing down. As of 2026, only genuine accessibility tools may use the accessibility API; misuse can lead to app suspension or developer-account termination; enforcement tightened around a January 2026 date; and Android's Advanced Protection Mode now auto-revokes accessibility permission from apps not classified as accessibility tools. High policy risk, and the permission can be stripped on hardened devices.

**2. Full lock-screen replacement (the "Glance AI Lockscreen" / `setShowWhenLocked` approach).** No accessibility service. It combines `setShowWhenLocked()` (a first-class Activity API, API 27+) to draw over the keyguard, a `NotificationListenerService` used as a *process anchor* (the OS keeps the process alive so screen-state receivers survive a recents-swipe), a `SYSTEM_ALERT_WINDOW` overlay layer, and BroadcastReceivers on screen-off, screen-on, user-present, and home events. It is cleverer and avoids the accessibility landmine, but:

- It replaces the **entire** lock screen. You then own the whole lock experience (notifications, media, unlock UX), which is a far larger product than "a mascot that visits the lock screen."
- **Heavy, scary permissions.** Notification Listener access can read every notification, including messages, banking, and 2FA codes. Asking a companion app for that plus draw-over-other-apps reintroduces exactly the friction and user fear the mascot was meant to avoid. Using notification access purely as a keep-alive, with no genuine notification feature, is itself a Play-policy risk.
- **OEM fragility.** Samsung, Xiaomi, and Oppo/Vivo skins aggressively kill background processes and vary keyguard behavior; the keep-alive guarantee is fragile. The approach carries a long list of edge cases (duplicate activities, home-key handling, child windows appearing behind the keyguard, flicker, Direct Boot). This is an ongoing maintenance treadmill.
- It is all native Kotlin/Compose, and does nothing for iOS.

### React Native verdict

React Native cannot exceed platform capabilities. Division of labor:

- **Main app:** fine in RN.
- **Android floating overlay:** community libraries exist but are Android-only and variable in quality. Expect to vet one carefully or write a thin native (Kotlin) module, likely needing a bare or dev-client workflow rather than Expo managed.
- **Widgets (both platforms):** cannot be written in RN. They render in a separate process natively (SwiftUI/WidgetKit on iOS, RemoteViews/Glance on Android). RN can share data and trigger reloads, but the widget UI is native.
- **Live Activities:** native SwiftUI UI; RN and Expo modules can start, stop, and update them.

All system-presence features are native work regardless of the RN decision.

### Feasibility scorecard

| Surface | iOS | Android |
|---|---|---|
| Floating overlay over other apps | No, sandbox forbids | Yes, `SYSTEM_ALERT_WINDOW` (user grant + Play scrutiny) |
| Home widget, tappable/interactive | Yes, App Intents (iOS 17+) | Yes, PendingIntent / Glance |
| Home widget, continuously animated | No | Limited, RemoteViews constraints |
| Lock-screen presence, official | No (Live Activities is nearest, time-limited) | No API since Lollipop |
| Lock-screen presence, workaround | n/a | Accessibility hack (policy risk) or full replacement (heavy) |
| Built in React Native's JS layer | No, native | No, native |

---

## Part 2: The strategic "why" and its internal contradiction

The point of the presence push is to mitigate ADHD retention drop, attributed to three drivers. The key finding is that **they do not all point the same way.**

### Object permanence: supports presence

The community term is metaphorical, not the literal developmental sense. People with ADHD know unseen things still exist; they simply stop holding them in active awareness, which is a working-memory and executive-function issue. "Out of sight, out of mind" is the more accurate phrasing. This genuinely supports a persistent on-screen cue as an external-memory scaffold.

### Dopamine: supports presence, with two asterisks

Immediate, novel, salient reinforcement suits ADHD reward systems, so a reactive, rewarding mascot is well-founded. Two cautions:

1. **Habituation is fast.** Novelty is the active ingredient and it wears off quickly. Sustained effect needs built-in variability, not a fixed loop.
2. **Ethics.** Building compulsion loops for a population with reward-system differences risks a slot-machine dynamic. The respected apps in this space (Finch, Forest, Tiimo, Focus Bear) deliberately stay gentle: no punishing streaks, no shame on lapse.

### PDA: fights the design (the important one)

Pathological Demand Avoidance is an anxiety-driven, involuntary resistance to demands, including gentle or self-imposed ones. For this profile, the standard toolkit (structure, explicit expectations, reminders) is counterproductive and increases anxiety and avoidance; the recommended approach is low-demand, autonomy-first, and collaborative. An ever-present mascot that prompts and is hard to ignore is close to worst-case: it becomes the demand the user avoids by avoiding the app.

Calibration: PDA is not a formal DSM or ICD diagnosis and the research base is still developing; it is usually framed as an autism profile, though a 2020 study found ADHD a stronger predictor than autism. The design implication holds regardless. A meaningful share of the ADHD audience will have demand-avoidant traits, you cannot identify which users, so the safe design must work for both.

---

## Part 3: Design resolution ("present but never demanding / companion, not coach")

### Core reframe

A coach points its attention *at* you (watching your performance). A companion mostly points its attention *away* (doing its own thing, glad when you show up). Nearly every concrete behavior follows from this, and it is what defuses the PDA threat response, because nothing is being asked.

### Interaction grammar

- **Default state: "living its own life."** Most of the time the mascot is pottering, napping, reacting to time of day or weather, not engaging the user. This satisfies object permanence (persistent visibility) at zero demand cost.
- **Notices you, does not summon you.** On arrival it reacts warmly. The reward is parasocial (being greeted by something glad to see you), which is renewable and never punishing, unlike points or streaks.
- **Task-shaped things are pull, not push, and depersonalized.** Language is observational or first-person, never imperative, and about the *task* rather than the *person* ("the reading's still sitting there," not "you need to read"). Every offer carries a free, zero-cost "later" or "no." Offer choices where possible to restore a sense of control.
- **Co-experiences events, never grades you.** On completion it reacts to the *event* (celebration, excitement), never evaluates the *person* ("great job staying consistent" implies a standard to fall short of). Same beat, different emotional contract.

### Forbidden mechanics

No wilting or dying pet. No streak that breaks and punishes. No guilt notification ("we miss you"). No escalating nags. No accumulating shame badges. No "falling behind." Each of these converts the companion into a coach the moment the user lapses, and a lapsing user under a guilt mechanic uninstalls to stop the bad feeling. For this audience that is the literal retention-killer the product set out to solve.

### Re-entry is the actual retention mechanic

For ADHD and PDA users, retention does not live in preventing the gap. The gap is inevitable, and shaming it is fatal. It lives in making the *return* feel good and cost nothing. After a long absence, the mascot is simply happy the user is back, with no catch-up wall and no penance. Easy re-entry beats hard retention for this group. Design this first.

### Hand the user the dial

Let the user set the mascot's energy (chatty to near-silent), mute it without losing it, choose what it may surface, reskin its mood. For a demand-avoidant user, being given the controls is itself the therapeutic affordance. The target feeling is "keeping a pet on my terms," not "being managed by an app."

### Pressure-test against the three drivers

- **Object permanence:** passing. Continuous passive visibility is the default state.
- **Dopamine:** passing. Arrival warmth plus the mascot's own variable little life (anti-habituation), and no reward contingent on compliance, so nothing to game or feel shamed by.
- **PDA:** passing. No demands, depersonalized language, choices over commands, always-free dismissal, user control, shame-free lapses.

### Remaining tension

"Present but never demanding" can decay into "present but useless" if the mascot becomes pure decoration. Resolution: help is always available and inviting but never initiated against the user. Strong pull, zero push. Too far toward push triggers PDA; too far toward ambience produces a screensaver.

---

## Part 4: What this means for the build decision

The lock-screen investigation was chasing maximum presence for retention. But if the correct design is low-demand, ignorable presence, then the heavy, fragile, permission-hungry lock-screen replacement is optimizing for intrusiveness against a population that punishes intrusiveness. A gentle home-screen widget (interactive, low-friction, cross-platform, store-safe) plus a mascot whose entire personality is "no pressure" likely serves users better and costs a fraction to build and maintain.

Decision to settle before choosing a screen: is Trinket's mascot emotionally a companion or a coach? That answer determines almost everything downstream, including whether the lock-screen path is worth pursuing at all. Working principle from this session: companion, not coach.

---

## Open items

- **Mascot state diagram** (offered, not yet produced): modes such as idle-living, noticing, offering, co-experiencing, and resting, with transitions and what each mode may do. Useful as the system-level view to pressure-test edges, and as a handoff artifact for a developer or animator.
- Confirm the platform target strategy given the above: Android-flagship overlay versus cross-platform symmetric widget plus gentle presence.
- Fold the relevant conclusions into the existing design synthesis document.

---

## Key sources referenced

- iOS Live Activities constraints (ActivityKit time limits), current as of iOS 26.
- Android `SYSTEM_ALERT_WINDOW` behavior across Android 14 to 16.
- Google Play accessibility-service policy tightening, 2026.
- "Glance AI Lockscreen" lock-screen-replacement write-up (`setShowWhenLocked` plus `NotificationListenerService` anchor plus overlay).
- ADHD "object permanence" as working-memory and executive-function phenomenon (Talkiatry, Simply Psychology, and others).
- PDA and the low-demand approach (PDA Society; EDA-QA validation notes; clinical overviews); 2020 study on ADHD as a stronger PDA predictor than autism.
