# Enemy support readability — 2026-10-02

Shamans now expose their next heal through a focused countdown, heal amount, and radius. A green casting arc fills during the last 0.6 simulation seconds; focusing a shaman reveals its actual 1.45-tile heal radius. The initial 1.2-second delay, subsequent 1.8-second interval, ground-only targeting, and existing heal strength are preserved. Witch salt halves both the actual heal and the displayed amount.

Recovery rings and floating numbers appear only when health is restored, using the actual gain after the health cap. Reduced motion retains a static recovery ring and the meaningful casting cue. Simulation suspension freezes casting and recovery timing.

The Horn now respects hollow enemies' existing slow immunity while retaining damage and its road burn. Focused prey show ordinary slows and slow/root immunity. Snapshot invalidation includes displayed status and song data, so expired statuses disappear even when health does not change.

A crowded-wave playtest exposed pointer rounding: clicking a shaman could focus a nearby wisp closest to the tile center. Pointer focus now uses continuous board coordinates, while building, occupied-tower selection, and movement retain grid coordinates. Existing cell-based focus remains available.

## Coverage

Six source cases cover capped recovery, salt, full/dead/air/distant targets, recovery expiry, pause, status expiry without damage, continuous pointer focus, and Horn resistance. The new local-only `test:game:support` browser suite seeds isolated campaign progress, plays through the first two Pine Cut waves, and observes a real authored shaman in wave three on desktop and phone. It checks focus, countdown reset, pause, salt, reduced motion, geometry, and browser errors.

Renderer recovery captures use an isolated fixture with the actual engine and renderer. They establish visual feedback, not natural campaign balance. Browser verification uses installed Chrome, not physical-device Safari or touch hardware. The existing October audit records unrelated legacy script fixtures and dependency findings.

## Observed checks

- 203/203 source tests pass, including the campaign stability simulation. Typecheck, lint, auth invariant, production build, script syntax, and whitespace checks pass. The optional database migration skips without `DATABASE_URL`.
- Both support cases pass against the final production preview (1440×1000 and 390×844 with reduced motion and salt). Real authored enemies are focused, countdowns freeze on pause and reset on casting, the panel stays in the viewport, and browser error arrays are empty. Screenshots were inspected.
- An isolated actual-engine/renderer fixture restores 10 HP to injured ground targets, emits truthful numbers, and displays static recovery rings under reduced motion; the image was inspected.
- All 19 broad browser cases pass against the final production build, including six responsive/reduced-motion layouts, opening-road progression, defeat/retry, saved endless entry, sightline recovery, and all eight campaign entries. Error arrays are empty. The required web-game client completed two iterations with inspected gameplay images and JSON, and no error artifacts. As in the previous round, a local Node preload selected installed Chrome for the unchanged client. Its single-Bow capture intentionally leaks; the broad opening-road hold uses the full defense.
- Removed reproducible build output after verification when the machine ran out of disk space; source and QA evidence were preserved. Release verification follows deployment.
