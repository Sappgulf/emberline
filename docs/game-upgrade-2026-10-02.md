# Watch upgrade — 2026-10-02

## Implemented

- Rally: kills +5 resolve, impact reactions +10, breaches −20; capped at 100. V or the command button grants all towers +25% firing rate for six simulation seconds. Loaded shots shorten without a free reset. Resolve carries between waves; the active effect ends with the wave and the road/retry clears it. Pause and overlays freeze combat and Rally; an active Rally cannot stack.
- Battle ledger: real health removed after armor and wards, capped at remaining health to exclude overkill, grouped by tower kind or watch/field effects. Direct attacks, chains, splash, bleeding, and owned burning ground are attributed; dodges and duplicate kills are excluded. Ongoing burns do not retrigger impact reactions. Reports retain wave time, Rally uses, and a leading defense after a hold; the current ledger is also accessible in Orders, the market, and defeat/victory.
- Focus feedback: focused enemy health, armor, and active status readouts, clearer health/status bars, and a forecast warning with actual lives at risk for enemies near the keep.
- Art and motion: four runner gallop poses follow movement distance; ash ground distinguishes Ember Copse and Ash Hollow. Cached terrain invalidates when the ash asset loads. Rally adds warm tower auras and two short audio cues. Decorative gait and pulses respect reduced motion.
- Responsive command grids accommodate nine buttons. Browser coverage checks that Send wave stays within the viewport after normal scrolling.

## Verification

- All 178 source tests pass, including ten new Rally/ledger regression tests. Typecheck, lint, auth invariant, production build, and diff checks pass.
- All 17 browser scenarios pass against the built production preview: six layouts/reduced-motion configurations, a five-wave opening-road hold and market/camp transition, genuine defeat/retry, saved endless entry, and every campaign route. It checks earned Rally, pause and Orders timer suspension, report disclosure keyboard behavior, reset on the next road, errors, and document geometry.
- The required web-game client completed two gameplay screenshot/state iterations against the production preview; both reached real wave combat with placed defenses and a populated ledger. Screenshots were inspected.
- The release smoke passes against the local production preview on desktop and phone. `npm run test:game:live` provides a separate release check for desktop and phone, two waves, an earned/used Rally, focused health, paused timers, accessible reports, clean browser diagnostics, and exact delivered art hashes. It uses fresh contexts, normal gameplay, and no seeded saves.
- Evidence is saved under ignored `output/audit/`, `output/upgrade-client/`, and `output/live-smoke/`. Art source files, exact prompts, conversion settings, and hashes are in [watch-upgrade-v2.md](../art/imagegen/watch-upgrade-v2.md).

## Limits

Browser validation uses local Chrome, not physical-device Safari or measured hardware performance. The campaign simulation verifies stability with a strengthened test arsenal; it does not establish full human campaign balance or Rally difficulty tuning. The optional database migration skips when `DATABASE_URL` is unset. Existing legacy script-fixture failures and unrelated dependency advisories remain recorded in the [October audit](game-audit-2026-10-01.md).
