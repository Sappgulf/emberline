# Tactical sightlines and targeting — 2026-10-02

This pass makes tower placement and targeting decisions explicit.

- Aim now has four direct choices in the existing command deck. Selected towers keep independent modes; changing one no longer changes the default for later plants. Deselect all towers to change that default. First follows road progress toward the keep, Last favors the gate, Near favors distance to the tower, and Tough retains the engine's health and threat scoring. Focus and manual marks still override those modes when in range.
- Middle-click cycles from the selected tower's own mode once. Right-click deselects without changing aim. The native selector owns its keyboard input and exposes the scope in its accessible name and tooltip.
- Flying waves now require a compatible tower that can actually reach a road segment. The check uses the combat range calculation, including terrain, omens, upgrades, relics, and Emberlit modifiers. High and low flying prey keep their existing strike rules. This is a reach check, not an assessment of damage or difficulty.
- Placement and movement previews warn when no road is reachable. Selected towers expose road reach and tile counts; the range ring turns red when disconnected. Disconnected placements remain allowed for future upgrades.
- The deterministic time bridge now paints the battlefield before returning. It shares the normal renderer's resize and pixel-density logic, so state captures and canvas pixels describe the same simulated frame.
- Taller portrait phones keep the existing two-row command deck pinned inside the viewport. The Send Wave control remains visible when the tray scrolls or packet selection changes; short phones retain their compact command row.
- Canvas banners now wrap measured words inside the board's margins. The regression observes actual drawing calls to verify the complete warning text and line bounds; it preserves normal drawing and restores the observer immediately. Reduced motion also removes the banner's scale entrance.

## Regression coverage

Eight engine cases cover selected versus future-plant targeting, cycling, phase guards, all four priorities, focus overrides, continuous segment geometry, flight compatibility, range upgrades, movement, selling, and range relics. Browser cases exercise native selector input, middle/right click, and same-call canvas repainting across six layouts. Two isolated local saves enter Pine Cut to prove an unreachable Bow blocks launch and a Reach upgrade restores it on desktop and phone.

Browser evidence is captured with installed Chrome and the required web-game client. It does not establish physical-device touch, Safari support, battery usage, or campaign balance. The campaign stability test retains its explicit strengthened arsenal. Pre-existing tooling and dependency limits remain recorded in the October audit.

## Observed checks

- 197/197 source tests passed. Typecheck, lint, auth invariant, production build, script syntax, and diff whitespace checks passed.
- The full local browser audit passed 19 cases. After the final banner rendering change, both focused sightline recovery cases passed again, including complete text and actual canvas bounds.
- Fresh local production-preview smoke sessions at 1440×1000 and 390×844 held two waves with 20 lives, activated Rally, checked native aiming, pause/Orders, ledger values, and delivered asset hashes. Browser error arrays were empty.
- The required game client completed two gameplay iterations; image and JSON captures agreed, and no error artifact was emitted. A test-only Node preload selected installed Chrome and removed the bundled SwiftShader launch arguments; the client and choreography were unchanged. Two slower bundled-shell attempts were stopped.
