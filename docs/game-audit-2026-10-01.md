# Emberline audit — October 1, 2026

Scope: combat resolution, abilities and upgrades, campaign/endless state, progression saves, HUD consistency, keyboard/pointer controls, modal behavior, responsive layouts, artwork, and reduced motion. Existing auth and app-data checks are included in the source test suite. Changes preserve the preceding generated-art and combat-reaction work.

## Fixed findings

| Priority | Finding and player consequence | Correction |
| --- | --- | --- |
| High | A landed splash projectile remained alive, repeatedly damaging enemies and creating burn patches. | Consume the projectile at its first splash impact. Regression checks advance through subsequent frames. |
| High | Ground splash could damage high-flying Wisps despite tower restrictions. | Filter splash and active-power targets by supported air class. Low-flying Moths remain valid targets. |
| High | The damage camp preparation set a value that combat never read. | Apply its 10% bonus to damage and show it in tower power. Clear it on the next road reset. |
| High | Rimebind's advertised longer chill changed an unused strength value. | Carry its 1.5× duration to impact and active Frost powers. |
| High | Keyboard C could reload an already charged ability after its timer expired. | Enforce loaded-charge guards in the engine. Refresh HUD readiness when a charge is consumed. |
| High | Enemies advanced while Orders or Bestiary obscured the battlefield. | Suspend simulation while those dialogs are open, preserving the player's manual pause setting. |
| Medium | Global Space hijacked native buttons and disclosure summaries. | Preserve native activation, modified shortcuts, and editable controls; ignore repeated global commands. |
| Medium | Warded enemies could be rooted by Nova/Briar. | Respect resistance when applying active roots. |
| Medium | Bonus timber lives exceeded the displayed healing cap and could not be restored. | Track the current road's bonus in maximum lives and clear it on reset. |
| Medium | Boss HP/phase and loaded charges were missing from HUD change detection. | Notify React when their displayed values change. |
| Medium | Tower power/rate/reach omitted omens, Emberlit power, kindred tempo, and the first-ember rite. Placement previews omitted waterline reach. | Share Emberlit damage rules and include relevant bonuses in displayed stats and placement range. Ward aura uses actual sight range. |
| Medium | Moth-only waves rejected valid Mortar/Pike/Cinder cover. | Use the same low/high air coverage rules for the forecast and wave gate. |
| Medium | Recaps recorded the next forecast's omen instead of the one just held. | Capture the omen before changing phase. |
| Medium | Endless records were not saved immediately on a held night. | Persist the new record when the wave finishes. |
| Low | A new road retained partial farming and hover state. | Clear both with the field. Reject fractional/nonfinite build coordinates. |
| Low | Decorative portal, keep, prop, bond, and placement effects continued under reduced motion. | Freeze decorative time while retaining essential combat feedback. A ready-state canvas comparison verifies stable pixels. |
| Low | Bestiary and perk descriptions disagreed with supported counters and tier bonuses; endless sidebar promised another campaign road. | Correct Wisp counters, describe perk benefits per tier, pluralize reaction counts, and use night labels without a next-road promise in endless mode. |

## Verification

- 168 source tests, including 18 new regression/stability tests. The full campaign stability test runs all 46 waves in both normal and hard mode (92 simulations), checks termination and finite resources/positions, and enforces projectile/burn caps.
- Typecheck, lint, production build, auth invariant, and diff whitespace checks.
- The required web-game client runs two input/screenshot iterations beyond the title.
- The repeatable Chrome playtest covers 1440×1000, 1280×720, 390×844, 320×568, 844×390, and 390×844 with reduced motion. It exercises menus, keyboard tabs, placement, coverage, reactions, Orders suspension, pause, focus, scout, upgrades, pace, and stall transitions.
- An actual five-wave opening-road playthrough reaches the market, purchases a relic, saves progress, chooses a camp, and enters Pine Cut. Additional scenarios cover genuine defeat/retry, bonus timber lives, saved endless entry, and active combat on every route.
- Screenshots and structured results: `output/audit/`. Run `npm run test:game:browser` with a local server and installed Chrome. Advanced-route and endless entry tests use isolated save fixtures; they do not edit a player's browser profile.

## Limits and remaining work

- `npm run test:scripts` passes 193/197. Four existing failures require the absent `.grok/skills/og/SKILL.md` and `.grok/skills/og/references` fixtures. These contracts were not weakened or replaced with invented files.
- The production build skips the optional database migration when `DATABASE_URL` is unset.
- The external web-game client logs a start-button selector timeout warning after the title transitions. It exits successfully and captures active combat in both iterations; the project browser suite independently completes all 17 scenarios with no browser errors.
- Browser evidence is local Chrome. Physical touch, Safari, battery use, GPU performance, and a complete human difficulty assessment of all roads remain unverified. The 92-wave simulation uses upgraded towers and extra lives to test stability.
- No commit, push, or deployment was performed.
