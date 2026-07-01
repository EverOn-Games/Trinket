# Trinket — Design Pattern Synthesis
**Mapping external app-design analyses to Trinket's decisions**
Version 0.1 · 27 June 2026

---

## Sources and how to read them

Five video transcripts from a single design agency (the host's name and the agency name are rendered inconsistently in the auto-transcripts). They are lead-generation content: every video closes on a pitch for the agency's free strategy calls, and they select for survivors and breakouts. The headline statistics (18.7x revenue, 636% LTV uplift, conversion-by-price-tier, 77% three-day churn) arrive without disclosed methodology, so treat every number in this doc as directional rather than citable. RevenueCat category benchmarks stay the defensible anchor for anything touching the financial model.

The pattern logic underneath the hype is mostly sound, and several patterns describe products close enough to Trinket to be useful reference points. The purpose of this doc is sorting, because a large share of what these videos promote hardest are mechanics already on Trinket's forbidden list. Knowing which bucket each pattern falls into is the value.

---

## 1. Reference points that validate the build

**Tiimo — the load-bearing comparison.** Closest existing product to Trinket's category, and it won iPhone App of the Year in 2025 doing precisely the core bet: visual time blocks over text rows for neurodivergent users, "not Notion with a different font." This confirms the category is real and rewarded. It also moves the goalposts. Visual-first for ADHD no longer differentiates on its own, because Tiimo already got there and got the trophy. Trinket's wedge has to be the layer Tiimo lacks: the companion and the shame-free re-entry model. Any deck or grant doc should state that distinction plainly, since an evaluator who knows Tiimo will ask exactly this.

**MacroFactor — the thesis proven in another category.** They stripped shame from macro tracking, built the algorithm to assume users miss targets, and got two payoffs: cleaner data than competitors, plus a moat that guilt-based rivals could not replicate (because their user-submitted databases fill with gamed logs). The second payoff is the one to carry into Trinket's funding narrative. The shame-free choice produces a more defensible product, and MacroFactor lets that argument rest on an outside proof point.

**Carrot Weather and Day One — character and craft carrying a commodity layer.** Carrot puts a reactive character in front of the same forecast data Apple Weather uses; Day One enriches commoditized journal text with sensory layers (weather, location, photos, timeline). For Trinket the task list is the commodity and the companion is the part nobody copies in a weekend. One caveat on Carrot: it works by insulting the user. Trinket runs the opposite tone register, so take the structural lesson (the character is the product, not decoration) and drop the voice.

---

## 2. Patterns the videos celebrate that Trinket must invert

Revisit this section before any design review. The mechanics below are presented as wins in the source material. Each maps to something already excluded from Trinket, for reasons that are ethical and reputational at once given the ATTENTIO and Fundacja ADHD affiliations attached to the launch.

| Mechanic | Source app | How the videos rank it | Why it is out for Trinket |
|---|---|---|---|
| Dying / wilting companion | Forest | Called the strongest pattern in the set | Mechanically almost identical to Trinket (living companion plus object permanence), but weaponized. Trinket keeps the companion idling and warm on return. |
| Cohort absence calendar | Ladder | Growth and retention driver | Public guilt. Absence made visible to thousands of strangers is social shaming with extra steps. |
| Streak you protect | Snapchat | Identity and stored value | Streak punishment. Breaking it is engineered to feel like losing something owned. |
| Celebration tied to behavior frequency | Robin Hood confetti | Held up as a ceremony win | Tied to action frequency. Earned a $7.5M fine for exactly this. Manipulative by regulatory finding, not just by opinion. |
| Guilt notifications, red over-target numbers | Category default (MacroFactor's foil) | Treated as normal adherence pressure | The precise thing MacroFactor removed and Trinket refuses. |

The Forest row is the one to internalize. Forest and Trinket share the same engine: a living companion plus object permanence. The entire difference is that Forest makes leaving kill the companion, while Trinket keeps it present and warm regardless of return gaps. The most-praised mechanic across these videos being the one Trinket has to reverse is a signal that the whitespace is real, not a reason to reconsider.

---

## 3. Open decisions, not yet settled

**Onboarding length.** The honest tension: Cal AI's 20-plus-step quiz and Noom's 113 screens work because they earn a personalized first experience and filter for serious buyers. Trinket needs some setup, because implementation intentions require user input to mean anything. A long flow also fights the audience directly, since low friction tolerance is close to a defining trait of the population. Working resolution: earn the personalization with the minimum number of screens, and justify every additional step against drop-off more strictly than a general consumer app would.

**Gift-or-receipt boundary.** Anticipation, reveal, celebration is fine when it marks a real accomplishment the user actually made. It curdles into slot-machine logic or streak-protection quickly. The line to hold: celebrate what the user did, and never manufacture loss-aversion or escalating pressure to keep them transacting. Same line that separates Trinket's design from the forbidden list in Section 2.

**Pricing.** The "weekly is the new monthly" claim cuts against the current model (roughly 60% annual mix, blended ARPU ~$6.80). Don't adopt it on a video's say-so. Community-led acquisition changes the intent profile of whoever reaches the paywall versus a paid-traffic app, so the weekly-first assertion is a market-timing claim to test against Trinket's own category rather than a default to inherit.

---

## 4. Durable findings worth keeping (especially for the financial model)

Separated out because these survive the skepticism and several are model-relevant. None of them depend on the unsourced headline statistics.

- Trial framing moves LTV far more than headline price. This shows up repeatedly and is structural.
- Paywall transparency (stating when the user will be charged and for what) raises conversion and lowers churn. Well-documented in the Blinkist redesign.
- Testing velocity correlates with revenue. Run paywall experiments rather than treating the paywall as a set-and-forget checkout screen.
- Plan structure (count and trial framing) outweighs price changes for conversion uplift.

These are consistent with RevenueCat benchmarks. Keep them, and keep treating the 18.7x, 636%, and conversion-by-tier figures as directional only.

---

## Strategic takeaway in one paragraph

Tiimo proved that visual-first ADHD design is a real, award-winning category and, in doing so, made it table stakes. Trinket's defensible position is the companion layer plus the shame-free re-entry model, neither of which Tiimo has. The same shame-free design choice does triple duty: it is the ethical foundation, the competitive wedge over Tiimo, and (per MacroFactor) the source of a data and retention moat that guilt-based competitors structurally cannot copy. That convergence is the spine of the positioning for the deck, the grant narrative, and the marketing plan alike.
