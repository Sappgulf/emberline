Original prompt: ok keep working. more upgrades across the game

## 2026-09-06 — upgrade pass

- Baseline: `main` is clean at `dc1321f`; the current shipped build already includes the campaign route rail, threat forecast, tower intel, and live wave progress HUD.
- Scope: audit the live title → brief → ready → wave journey, then improve one coherent gameplay/UI slice without obscuring the board.
- Planned: inspect between-wave decision clarity, combat feedback, keyboard/focus flow, and mobile composition; add focused tests and browser proof for any changed behavior.
- Verification target: game tests, typecheck, lint, production build, desktop/mobile browser screenshots, geometry, and console logs.

- Completed: tactical counter-plan guidance, real tower packet sprites with Air/Ground roles, live wave progress copy, a wave-result recap, an accessible banner announcer, and deterministic `render_game_to_text` / `advanceTime` hooks for automation-capable browsers.
- Found and fixed during live QA: the recap could stack beneath selected-tower intel and clip at the bottom edge; tower intel now yields that slot while a recap is visible, leaving the bottom action tray intact.
- Verified: 82 tests pass, typecheck passes, lint passes, production build passes, desktop title-to-combat-to-recap flow is clean, mobile 390x844 has `390x844` document geometry with no overflow, and browser console logs are empty.
- Tooling note: the in-app browser’s `window` is sealed, so it cannot accept the optional global automation hooks; the engine text contract is covered directly by the new unit test.

## 2026-09-06 — asset, campaign, and game-feel pass

- Completed: added a versioned sprite asset contract for future Blender/image exports, map-specific field profiles and route markers, ambient map atmosphere, a fuller bitmap Bestiary, boss telegraph feedback, and distinct upgrade/combo/boss/wave-clear cues.
- Completed: surfaced the field identity in both briefing and live threat intelligence, added relic marks, and kept the board renderer Canvas 2D so art can be replaced without baking UI semantics into pixels.
- Found and fixed during live QA: narrow layouts let the threat card cover too much of the board; mobile now compresses secondary forecast copy and anchors the board to the lower band while retaining the enemy count, field note, and counter plan.
- Verified: 83 tests pass, typecheck passes, lint passes, production build passes, refreshed desktop and 390x844 mobile title → brief → ready flows pass with no document overflow, all Bestiary bitmap assets load at 320px natural width, and the fresh preview serves the current hashed bundles.
- Tooling note: no callable Blender MCP was exposed during this session; the later built-in imagegen pass below provides the generated menu art.

## 2026-09-06 — generated menu backdrop pass

- Generated with the built-in imagegen skill: a dark-fantasy dusk watch panorama with a left foreground tower, right ridge keep, ember road, calm centered negative space, no text, no logo, and no watermark.
- Saved project assets: `public/ui/menu-backdrop-v3.png` and compressed `public/ui/menu-backdrop-v3.webp`; `v2` remains available for rollback.
- Wired both desktop and mobile shell backgrounds to the WebP-first `v3` asset with a PNG fallback.
- Verified: production build passes, fresh hashed preview serves `menu-backdrop-v3.webp`, desktop and 390x844 title/brief/ready flows remain readable and overflow-free, and the Bestiary still loads all seven bitmap cards.
- Tooling note: no callable Blender MCP is exposed in this session; the asset contract remains ready for a future Blender export without changing game code.

## 2026-09-06 — Blender Lab MCP bridge setup

- Installed the official Blender Lab MCP server from `projects.blender.org/lab/blender_mcp` at revision `4309a396`, with the MCP SDK pinned to `<2` because the current server still uses the MCP 1.x `FastMCP` API.
- Installed and enabled the `MCP` extension in Blender `5.2.1 LTS`, enabled Blender Online Access, and persisted preferences; the bridge listens only on `127.0.0.1:9876`.
- Configured `/Users/austinbeatty/.codex/config.toml` with a `blender` MCP server entry pointing to `/Users/austinbeatty/.local/bin/blender-mcp`.
- Verified through the MCP protocol: 26 Blender tools enumerate and `execute_blender_code` returns the live scene version, scene name, and object count.
- Note: the current Codex task keeps its initial tool snapshot; restart/reload Codex before expecting a new callable `blender` tool namespace in the UI.

## 2026-09-06 — imagegen + Blender crest and intelligence-card pass

- Generated with the built-in imagegen skill: a low-contrast dark-fantasy field-ledger texture with charcoal navy, moss, umber, and restrained copper cartography; no text, labels, logos, or watermark.
- Saved project assets: `public/ui/intel-card-v1.png` and compressed `public/ui/intel-card-v1.webp`.
- Authored through the installed official Blender Lab MCP bridge: a forged copper-and-moss Emberline shield with an emissive ember core, saved as `art/blender/emberline-crest-v1.blend` and rendered to the transparent `public/ui/emberline-crest-v1.png` bitmap.
- Wired the intelligence texture behind threat/tower intel surfaces and the crest into the title and briefing overlays while preserving the Canvas 2D board and DOM text semantics.
- Verified: 83 tests pass, typecheck passes, lint passes, production build passes, fresh desktop preview resolves `intel-card-v1.webp`, title and briefing overlays load the 768px crest, and the compact preview has no document overflow.
- Tooling note: the repository Playwright client is available but its cached Chromium executable is not installed in this environment; the live in-app browser supplied the title → brief → ready screenshot and interaction proof instead.

## 2026-09-06 — Blender route marker family pass

- Authored five transparent 256px route seals through the Blender Lab MCP bridge: lantern road, pine cut, keep stair, river ford, and ember copse.
- Saved the editable scene as `art/blender/emberline-route-markers-v1.blend` and shipped the cacheable renders as `public/assets/sprites/route-*-v1.png`.
- Wired route markers by stable map ID so the campaign rail and field-note cards share the same place-specific art without changing Canvas 2D rendering or input mapping.
- Verified: all five route images load in the fresh preview, title → brief → ready shows the active marker in both rail and intelligence card, locked markers retain their de-emphasis, and the ready board remains overflow-free.
- Source gates after wiring: 83 tests pass, typecheck passes, lint passes, production build passes, and `git diff --check` is clean.

## 2026-09-06 — Blender relic token family pass

- Authored eleven transparent 128px menu tokens through Blender: purse, timber, whetstone, oil, cold iron, scout glass, salt, ember, adze, cord, and flint.
- Saved the editable scene as `art/blender/emberline-relic-tokens-v1.blend` and shipped the small renders under `public/assets/relics/relic-*-v1.png`.
- Replaced the shop's Unicode relic marks with decorative Blender renders while retaining the existing accessible name, cost, and effect labels.
- Kept relic art in its own `relicUrl()` contract so combat and route-marker revisions remain independent.
- Source gates after wiring: 83 tests pass, typecheck passes, lint passes, production build passes, and `git diff --check` is clean.

## 2026-09-06 — responsive command deck pass

- Reworked the lower action row into compact label/value controls for Aim, Pace, Horn, Stall, and Mend so their current mode, cost, cooldown, or unlock condition stays visible at narrow widths.
- Added state-aware accessible names and tooltips, including the first-wave Stall unlock, full-keep Mend state, and live Horn cooldown/cost guidance.
- Kept `Send wave` as the only wide primary action and made its state explicit with `Wave active`, `Air check`, or the next wave number.
- Verified in the live in-app browser at the compact viewport: Pause showed the paused plaque, Resume restored play, Wave 3 resolved into a recap, Stall changed to Open between waves, and the refreshed command deck remained legible.
- Source gates after wiring: 83 tests pass, typecheck passes, lint passes, production build passes, and `git diff --check` is clean.

## 2026-09-06 — relic card readability finish

- Framed the transparent relic renders at 2.35rem inside the existing shop cards, adding a quiet copper glow and a held-state grayscale treatment without changing the underlying item data or purchase rules.
- Rebuilt and restarted the persistent local preview after the adjustment.
- Verified in the live roadside stall: Copper purse, Spare timber, Whetstone, Horn oil, and Keep adze are visibly rendered; each visible relic image reports `complete=true` with a natural size of 128×128; labels, costs, and effects remain accessible.
- Final source gates: 83 tests pass, typecheck passes, lint passes, production build passes, and `git diff --check` is clean.

## Loose ends

## 2026-09-06 — full visual and gameplay audit pass

- Audited the live title, briefing, ready, paused, active-wave, wave-recap, Bestiary, roadside-stall, relic-purchase, and compact command-deck states in the in-app browser.
- Found and fixed a real Bestiary usability defect: the close control was below the tall guide content, so opening the overlay focused and scrolled the dialog to the bottom. The close control now sits in the overlay's top-right, keeping the first guide rows visible and readable.
- Found and fixed a real SSR hydration defect: saved progress was read during the first client render, causing React error #418 when the client showed Continue before the server did. Save hydration now runs in the client mount effect.
- Verified the Canvas 2D board, route rail, forecast/intel stack, tower selection and placement, pause/resume, keyboard 3x speed, wave launch/recap, stall purchase state, and Blender relic bitmap delivery through real browser interactions.
- Verified the compact viewport has no horizontal document overflow; a fresh preview tab reports no browser warnings or errors. Source gates: 83 tests pass, typecheck passes, lint passes, production build passes, and `git diff --check` is clean.

- Keep the next pass focused on one or two high-value player-facing systems; avoid adding persistent panels that compete with the playfield. Commit/deploy remains intentionally pending until requested for this slice.

## 2026-09-06 — themed typography, HUD, and menu spacing pass

- Generated with the built-in imagegen skill: a text-free charcoal, moss, umber, and restrained-ember ledger surface for readable game UI backing.
- Saved project assets: `public/ui/ledger-surface-v1.png` and compressed `public/ui/ledger-surface-v1.webp`; wired them into the command tray, packet cards, plaques, and modal backing without baking text into the bitmap.
- Completed: tightened the Emberline typography system with themed display fallbacks, inherited control fonts, tabular HUD numerals, smoothing, balanced modal headings, and a full-width primary title action with compact secondary menu actions.
- Completed: grouped selected-tower identity and upgrade controls into a framed strip, improved tray hint hierarchy, kept the route rail readable, and added a dedicated 641–720px layout band so the in-app browser no longer uses dense desktop threat spacing just above the phone breakpoint.
- Verified in the live in-app browser at 641x814: title menu, campaign ledger, briefing, ready field, and active 3x wave remain readable; `The Low Road` no longer truncates, the threat card stays contained, the objective remains visible, document geometry reports `641x814`, fonts report `loaded`, and browser diagnostics are empty.
- Source gates: 86 tests pass, typecheck passes, lint passes, production build passes, and `git diff --check` is clean. The build skipped the optional database migration because `DATABASE_URL` is unset.

## 2026-09-06 — field rules, objectives, and campaign ledger pass

- Completed: added five map-specific field rules — Lantern Aura, Pine Fog, Stone Latch, Ford Banks, and Emberfall — with combat modifiers rendered as board telegraphs and surfaced in the field note.
- Completed: added live field objectives with progress, completion state, reward copy, and an objective reward cue; the selected-tower intel now exposes the active field branch alongside Power, Tempo, and Reach.
- Completed: added the title-screen campaign ledger with held/current/ahead route states, locked-route guards, route markers, objective summaries, and direct transition into the selected map briefing.
- Verified in the live in-app browser: campaign ledger opened with two available routes and disabled locked cards; Low Road briefing exposed Lantern Aura; ready state showed `0/1` and `+35g`; a real Longbow placement beside the lamp changed the objective to `1/1 OBJECTIVE SECURED` and exposed the Lantern Aura tower branch; wave launch reached 3x speed and resolved to `ROAD CLEAR` with the next-wave controls unlocked.
- Responsive/diagnostic proof: compact 641x814 viewport reported no document overflow (`641x814`), and the browser diagnostic buffer was empty after the pass.
- Source gates: 86 tests pass, typecheck passes, lint passes, production build passes, and `git diff --check` is clean. The build correctly skipped the optional database migration because `DATABASE_URL` is unset.

## 2026-09-06 — full motion, atlas, and ship pass

- Generated with the built-in imagegen skill: a low-contrast dark-fantasy campaign atlas with charcoal ink, moss, umber, dusk river blue-green, restrained copper cartography, a winding ember road, sparse pines, contour lines, and no text or UI baked into the art.
- Saved project assets: `public/ui/campaign-atlas-v1.png` and compressed `public/ui/campaign-atlas-v1.webp`; wired the atlas behind the DOM campaign ledger so route cards remain readable and semantic.
- Completed: added an accessible Momentum streak chip driven by the existing combat streak, breathing wave progress, threat-tier motion/glow, campaign atlas texture, and reduced-motion gates for all new animation.
- Verified in the live in-app browser at 641x814: title crest/menu, campaign ledger, Low Road briefing, ready HUD, active wave, accelerated 3x pace, and wave resolution all rendered without document overflow; fonts reported `loaded` and browser diagnostics were empty.
- Source gates before ship: 86 tests, typecheck, lint, production build, and `git diff --check` all pass. The build skipped the optional database migration because `DATABASE_URL` is unset.
- First ship commit: `fccce96` (`Polish Emberline UI motion and campaign atlas`) pushed to `origin/main`.
- Vercel preview: `https://emberline-7x18ihi8n-sappgulf-9169s-projects.vercel.app` (deployment `dpl_rpKdG65PkzWkQkurVzPgVi2i4g1n`, ready). This record-only update is followed by the final provenance commit and redeploy.

## 2026-09-06 — overlay resilience and final ship audit

- Fixed the placement intent lifecycle in the live build: rejected path taps keep the selected packet available, while a successful plant clears packet intent and leaves tower inspection active.
- Hardened long overlays with a sticky close affordance so Bestiary content can scroll at compact widths without hiding the exit action; campaign and stall layouts remain contained without document overflow.
- Re-verified in the in-app browser at 641x814: title, Bestiary open/scroll/close, campaign ledger, Low Road briefing, ready board, valid placement, invalid tap persistence, Escape cancel, pause/resume, 3x combat, wave recap, stall purchase, and return-to-road.
- Final live diagnostics: canvas `572x396` at `x=34.5`, `scrollWidth=641`, `scrollHeight=814`, fonts `loaded`, and no browser console logs.
- Source gates before ship: 87 tests, typecheck, lint, production build, and `git diff --check` all pass. The build skipped the optional database migration because `DATABASE_URL` is unset.
- Ship commit: `5724dc1` (`Polish Emberline overlays and placement flow`) pushed to `origin/main`.
- Vercel preview: `https://emberline-8t9x0xep1-sappgulf-9169s-projects.vercel.app` (deployment `dpl_B6GpHXwJAMTJaytsrJ1Xe2tBWuaM`, ready). This record update is followed by the final provenance push and redeploy.

## 2026-09-10 — mobile clarity and first-watch guidance pass

- Completed: added player-facing placement feedback for invalid grass, road, sealed, occupied, and unaffordable placements while preserving packet intent after rejected taps.
- Completed: synchronized placement range previews with the Pine Fog field modifier and Scout Glass relic bonus; air-required waves now hold until an air-capable tower is planted.
- Completed: added a compact title ledger, first-watch three-step briefing, active-wave live cue, stronger mobile command state, and a dawn summary without competing with the board.
- Verified in the live in-app browser and Playwright at 1280px, 390x844, and 320x568: title → brief → ready, invalid placement copy, Pine Cut air check, successful Bow placement, active wave, no document overflow, and no console errors.
- Source gates: 89 tests, typecheck, lint, production build, and `git diff --check` all pass. The build skipped the optional database migration because `DATABASE_URL` is unset.

## 2026-09-10 — campaign state and smallest-phone finish

- Completed: tightened the 320px returning-player menu so Continue, Campaign, and Bestiary remain fully legible without shrinking the primary Hold the line action.
- Completed: added an explicit available campaign state for the next unlocked route, keeping route rail, campaign cards, and engine selection behavior consistent while replaying a held map.
- Verified locally in the in-app browser and Playwright at 320x568: returning-player title, campaign copy, available Ember Copse selection, and transition to `Begin Ember Copse` all work without document overflow.

## 2026-09-10 — cross-app keyboard and accessibility pass

- Completed: made Campaign a true modal keyboard boundary so Space cannot restart a saved watch and Escape closes the route picker.
- Completed: let native focus traversal own Tab inside every modal phase and while footer buttons are focused, while keeping canvas tower inspection on Tab.
- Completed: aligned compact HUD and campaign labels with stateful accessible names and singular relic grammar.
- Verified locally in the in-app browser and Playwright at 390x844: saved campaign route selection, Campaign Space/Escape behavior, focus traversal, ready HUD labels, and no document overflow.

## 2026-09-10 — modal return-focus pass

- Completed: restored focus to the Campaign launcher after closing the route picker with Escape or Close.
- Completed: applied the same return-focus contract to the Bestiary launcher so both title-screen overlays behave consistently.
- Verified locally in Playwright at 390x844: Campaign and Bestiary open/close flows returned focus to their launchers and retained viewport bounds without overflow.
- Source gates: 90 tests, typecheck, lint, production build, and `git diff --check` pass. The build skipped the optional database migration because `DATABASE_URL` is unset.

## 2026-09-10 — wave orders and upgrade-readability pass

- Completed: added deterministic optional Watch orders that reward clean holds, Wisp clears, Shaman kills, or Emberlord kills from each wave plan; targeted orders track progress live and settle at wave clear.
- Completed: surfaced Watch order status and bonus in the threat forecast, with compact-viewport fallback hiding secondary intel at 360x640 while preserving the board and command deck.
- Completed: upgrade actions now preview the next form transition (`→ Bound`, `→ Tempered`, or `→ Crowned`) and announce their effect through accessible labels.
- Verified locally in the in-app browser and Playwright at 390x844, 360x640, and 1440x900: order forecast, upgrade preview, responsive fallback, board bounds, and zero browser errors.
- Source gates: 93 tests, typecheck, lint, production build, and `git diff --check` pass. The build skipped the optional database migration because `DATABASE_URL` is unset.

## 2026-09-10 — watch-chain and truthful recap pass

- Completed: added a run-scoped Watch Chain that increases the next held order payout by +6g per consecutive success, capped at +18g, and resets when an order is missed or a field is cleared.
- Completed: wave settlement now records clean, frayed, or shaken line quality; the progress rail and recap no longer call a wave “road clear” after breaches.
- Completed: moved the wave recap above the forecast detail between waves, added order payout/chain confirmation, and reused the generated Emberline crest as the order seal without adding a new image dependency.
- Verified in the live in-app browser: a clean first wave showed `ROAD CLEAR`, `ORDER HELD · +22G · CHAIN 1`, and the next preview showed `CHAIN 1 · +28G`; an unguarded second wave showed `KEEP SHAKEN` and `ORDER MISSED · CHAIN RESET`.
- Verified with Playwright fallback because the IAB exposed no viewport override: 390x844 and 320x568 screenshots keep the board, packet row, and send action within exact document bounds; zero console errors or warnings.
- Source gates: 94 tests, typecheck, lint, production build, and `git diff --check` all pass. The build skipped the optional database migration because `DATABASE_URL` is unset.
- Tooling note: live imagegen was not called because `OPENAI_API_KEY` is not set in this shell; the existing accepted crest asset remains the isolated fallback.

## 2026-09-10 — dawn completion-state art pass

- Generated with the built-in imagegen skill: a text-free dawn watchtower overlook with a winding ember road, distant keep, dark pines, and restrained charcoal/umber/copper color treatment. The existing `menu-backdrop-v3.png` served as the style reference; its composition was preserved.
- Saved project assets: `public/ui/dawn-watch-v1.png` and compressed `public/ui/dawn-watch-v1.webp`. The generated scene is versioned and does not overwrite the accepted backdrop.
- Completed: added a `dispatch-dawn` surface used only by the completed-campaign `won` overlay, keeping all normal play, briefing, campaign, and shop surfaces unchanged while giving the five-map finish a distinct dawn payoff.
- Verified locally in the in-app browser after restarting the documented Vite server: title → briefing → ready, exact board/tray geometry at 1280×720, and no Browser diagnostics. Verified with Playwright fallback because the IAB exposes no viewport override: 390×844, 320×568, and 1440×900 screenshots show no document overflow or clipping; mobile console has 0 errors and 0 warnings.
- Asset delivery check: both `/ui/dawn-watch-v1.webp` and `/ui/dawn-watch-v1.png` return HTTP 200 with the expected image MIME types. Source gates: 94 tests, typecheck, lint, production build, and `git diff --check` pass. The build skips the optional database migration because `DATABASE_URL` is unset.

## 2026-09-10 — compact wave recap and responsive intel handoff

- Completed: added a compact post-wave hold strip to the collapsed mobile threat forecast so hold quality, cleared count, breaches, and order outcome remain visible before the next send decision.
- Completed: made the forecast breakpoint handoff explicit; compact mobile intel re-expands when the viewport crosses into desktop so a hidden toggle can never strand the detailed forecast.
- Completed: clear transient placement rejection banners after a successful plant, move, tower inspection, or move-cancel so the board and live announcement never describe the previous invalid tap.
- Completed: made the desktop selected-tower intel card an interactive contained scroll surface, keeping its lower path and line details reachable without changing the compact mobile tray.
- Verified with the project Playwright fallback at exact 390×844, 320×568, and 1440×900 viewports: a real wave clear produced `KEEP SHAKEN · 2 cleared · 6 breaches · Order missed`, the full recap reopened from `Show details`, and both mobile sizes remained overflow-free with zero console errors or warnings.
- Verified responsive resize behavior from 390px to 1440px and back, preserving expanded desktop intel and compact mobile intel. The required game-playtest client also completed its action choreography with canvas screenshots and no error artifacts after pointing its missing Chromium revision at the installed local headless binary.
- Source gates: 95 tests, typecheck, lint, auth invariant, production build, and `git diff --check` all pass. The build skips the optional database migration because `DATABASE_URL` is unset.

## 2026-09-10 — counter-plan action pass

- Completed: made the threat forecast's Counter plan actionable; each recommendation now selects the matching packet through the existing `chooseKind` engine path and exposes pressed state to assistive tech.
- Completed: synced the packet tray to the same `wavePreview`-derived counter list with a restrained `COUNTER` marker and accessible recommendation wording, keeping the selected packet glow as the stronger state.
- Completed: changed the forecast container from a status live region to a labeled region with a polite live wave title so interactive counter controls remain visible in the accessibility tree.
- Verified locally in the in-app browser: fresh title → brief → ready, forecast counter button exposure, keyboard activation selecting Bow, packet selection handoff, marker rendering, and zero local error/warn diagnostics.
- Verified with Playwright fallback because the IAB exposes no viewport override: 320×568, 390×844, and 1440×900 screenshots show no document overflow or clipping; the desktop snapshot exposes the counter as a real button. Source gates: 94 tests, typecheck, lint, production build, and `git diff --check` pass. The build skips the optional database migration because `DATABASE_URL` is unset.

## 2026-09-10 — complementary tower bond pass

- Completed: added three positional combat bonds to the existing Line system: Bow + Frost (`Windcut`), Mortar + Ward (`Ashring`), and Spark + Bramble (`Stormroot`). Each active bond adds 8% damage to both adjacent towers.
- Completed: made bond state derive from live tower positions, so planting, moving, selling, and undoing stay synchronized without new persistent state. Placement/move feedback, the Canvas link, selected-tower intel, the mobile footer, and `render_game_to_text()` all read the same engine result.
- Verified with the required `web_game_playwright_client.js` choreography against local Vite: completed successfully with canvas screenshots and no error artifacts.
- Verified with Playwright fallback because the Browser plugin is not available in this environment and the IAB exposes no viewport override: exact 320×568, 390×844, and 1440×900 runs placed a real Bow/Frost adjacent pair, asserted `selectedTower.bond.id === "windcut"` and `bonus === 0.08`, confirmed the mobile footer and desktop intel row, and found zero document overflow plus zero console errors/warnings.
- Verified in the live in-app browser: title → briefing → ready, real Bow/Frost placement, `BONDED WITH BOW · WINDCUT +8% POWER`, `Bond: Windcut +8%`, and empty error/warn diagnostics. Production smoke at the same exact widths passed against `https://emberline-xi.vercel.app`.
- Source gates: 96 tests, typecheck, lint, auth invariant, production build, and `git diff --check` all pass. The build skips the optional database migration because `DATABASE_URL` is unset.
- Released commit `853b8b6` (`Add complementary tower bonds`) to `origin/main`; Vercel deployment `dpl_EsiuekAohdnSsMJM7x77dEeoib6b` is READY and aliased to `https://emberline-xi.vercel.app`.
- Remaining QA: exact viewport checks use the regular Playwright fallback because the Browser plugin is unavailable; the in-app browser has no viewport override, and real iOS Safari/device performance remains unverified.
