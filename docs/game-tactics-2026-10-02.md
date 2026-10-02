# Gate forecasts and impact timing — 2026-10-02

## Changes

- Arrival plan in the briefing, forecast, and Orders. It groups enemies by kind and shows their first/last entry times. During combat it uses the actual pending spawn queue; entered enemies leave the forecast. A clear gate can still leave enemies on the road. Times follow simulation pace, pause, and menu suspension. The forecast stays collapsed until requested, and short landscape layouts retain access through Orders.
- Roots and Bloodthorn bleeding are captured on projectiles and applied on successful impact, instead of at launch. Changing or selling a tower does not change an already fired shot. Resistant enemies ignore projectile roots, including Frost splash; Rimebind's root duration applies consistently across its splash.
- Repeated Bloodthorn hits refresh bleed duration without restarting the half-second tick cadence. Bleeding gains a focused status label and a static red battlefield cue.
- Bramble catches a knave on impact. A caught first attack consumes the first-shot dodge, while resistant prey can still dodge a Frost shot that cannot chill them. Dead or dodged targets receive no projectile status.

## Evidence and checks

Four of the initial five new impact regression checks failed against the previous implementation: premature roots, roots bypassing resistance, premature bleeding, and Kindle before the setup projectile arrived. The corrected implementation passes all 189 source tests, including eleven new tests for impact timing, captured shot effects, resistant splash, bleed refresh, dead/dodged targets, knave catch, grouped forecasts, the actual queue, pause/menu behavior, and reset/next-wave reports.

Typecheck, lint, auth invariant, production build, and diff checks pass. All 17 browser scenarios pass against the production preview. The required game client reached real combat in both production-preview screenshot/state iterations, which were inspected. An isolated renderer fixture exercised the actual engine impact path and verified the bleeding drop beside a rooted enemy’s health bar; it is a visual fixture, not a balance test. Browser coverage checks native Space disclosure behavior, forecast counts before and after a hold, and suspended arrival countdowns during Orders, alongside the existing responsive/combat/market/campaign audit. The release smoke passes on desktop and phone against the production preview and checks briefing forecasts and Orders on desktop and phone using ordinary gameplay and fresh sessions, without seeded saves.

Evidence is under ignored `output/audit/`, `output/tactics-client-prod/`, and `output/live-smoke/`.

## Limits

Chrome browser automation does not establish physical-device Safari compatibility or human campaign balance. The combat fixes change status timing and enforce existing resistance rules; no tower prices, base damage, spawn plans, or progression costs were changed. The optional migration skips without `DATABASE_URL`. Earlier legacy script-fixture failures and dependency review gaps remain documented in [the October audit](game-audit-2026-10-01.md).
