# Emberline

Dusk woodland tower defense. Hold eight maps. Plant eight towers on the grass beside the road.

## Play

```bash
npm install
npm test
npm run dev
```

Open `http://localhost:8080`. `npm test` covers the watch engine (build, waves, relics, leaks) plus the existing auth/app-data checks.

## Test the game

With the local server running, `npm run test:game:browser` runs the installed Chrome browser through six layouts, the opening road, market and camp, defeat/retry, saved endless entry, and all eight campaign routes. It saves screenshots and a verdict in `output/audit/`. An optional local URL can be passed with `npm run test:game:browser -- http://localhost:8080`.

`npm run test:game:live` checks the public deployment using fresh desktop and phone sessions, two real waves, Rally, the battle ledger, and delivered artwork hashes. It does not seed saves. Pass a local production-preview URL to check it before release.

`npm test` also simulates every campaign wave in normal and hard mode and checks combat, healing, save records, and HUD synchronization. The campaign simulation uses a strengthened test arsenal to verify stability; it is not a difficulty assessment. See [the October audit](docs/game-audit-2026-10-01.md) for findings and verification limits.

## Watch

- **Towers:** Longbow, Mortar, Frost, Spark, Bramble, Ash Ward, Watch Pike, Cinder Brazier. Pike unseals after Keep Stair; Cinder after River Ford.
- **Prey:** Moths fly low (mortar/pike/cinder can reach them). Knaves dodge the first shot unless Frost, Bramble, or a mark catches them. Ashfangs howl on the first bite and speed the pack.
- **Bosses:** From the river onward each road has a named boss with a taunt, a half-health second phase, and its own ground effect. Watch the boss bar over the board.
- **Elites:** From the second road some prey run shielded, frenzied, warded, or hollow, with a colored aura and a richer bounty.
- **Camps:** After each held road, choose a camp preparation for the next one — gold, lives, damage, cheap horn oil, an extra scout, or a watch mark.
- **Rites:** At the brief choose spare purse, spare timber, or first ember.
- **Scout:** Once a wave, K marks the toughest body.
- **Lines:** Pair adjacent Bow + Frost (Windcut), Mortar + Ward (Ashring), Spark + Bramble (Stormroot), or Pike + Cinder (Brand) for +8% damage to both. Two of the same kind beside each other fire 10% faster.
- **Sets:** Relic pairs unlock set bonuses — Winter vigil, Forge fire, Watchlight, Keepfield, and Bounty belt.
- **Focus fire:** Tap a live creep during a wave. Towers prioritize it and hit 10% harder for four seconds; tap again to apply the stronger manual Mark priority.
- **Reactions:** Frost chill followed by Mortar or Pike triggers Shatter; root followed by Mortar or Cinder triggers Kindle. Both deal +30% hit damage, with a shared two-second cooldown per enemy. Use Briar or upgraded Thorns to set up roots. The forecast's Tower reactions guide explains the combinations; wave recaps count triggers.
- **Rally:** Kills earn 5 resolve, reactions earn 10, and breaches cost 20. At 100 resolve, press V or tap Rally for +25% firing speed for six seconds. Resolve carries between waves on the same road. Pause and reading Orders freeze the effect.
- **Battle ledger:** Open the forecast or Orders ledger for damage and kills by tower kind, elapsed combat time, and Rally uses. Damage counts health actually removed after armor and wards, excluding overkill; burning ground stays credited to its source. The ledger remains available in the market and after a hold or defeat.
- **Arrival plan:** Open the briefing, forecast, or Orders to see when each enemy kind enters the gate. During a wave, times and counts come from the actual remaining queue. Pause and Orders stop the clock.
- **Impact:** Roots and Bloodthorn bleeding apply when shots land. Resistant enemies ignore roots; repeated Bloodthorn hits refresh bleed duration without delaying its damage ticks.
- **Placement:** Hover grass to see how many road tiles are in reach. Highlighted road tiles show coverage for both a placement preview and a selected tower.
- **Mark:** Tap the focused creep again, press K for the scout's toughest target, or use Scout Flare for a four-second road-wide damage window.
- **Hard watch:** 14 lives, tougher creeps, richer bounties. Shells splinter into a grub. Three hounds run as a pack.
- **Forge:** Damage, Rate, or Reach. Highest of the three is the form: Timber → Bound → Tempered → Crowned.
- **Emberlit:** At Crowned, choose one of two awakenings for each tower (C key ability, two branch buttons).
- **Abilities:** Every tower has an active power on a cooldown — Volley, Siege shell, Nova, Overcharge, Briar, Sanctum, Brace, Firestorm.
- **Watch hall:** Marks earned from held roads and bosses buy permanent perks. Hold all eight roads to unlock the endless Long Night.
- **Tools:** Horn (burn the road + slow), Scout flare (R during a wave; mark every live enemy for four seconds and deal +22% damage), Mend (lives + drag), Move, Sell. Pause is pause. 1× / 2× / 3× is speed.
- **Relics** persist between maps (including Watch cord, Gate flint, and Lantern wick). Stall prices drop each wave.

## Chronicle

The Bestiary now has two tabs: the field guide and the Chronicle, whose pages open as you hold roads, carry relics, and walk the Long Night.

## Stack

TanStack Start, React, Canvas 2D.

Battlefield art and animation provenance: [imagegen prompts](art/imagegen/battlefield-polish-v1.md). The forest texture is cached, and grub crawl frames follow movement distance. Reduced motion disables gait, recoil, and expanding reaction animations while preserving combat feedback.

The [watch upgrade art](art/imagegen/watch-upgrade-v2.md) adds four-frame runner gallops and ash terrain for Ember Copse and Ash Hollow. Focused enemies show health, armor, and active statuses; the forecast warns when enemies approach the keep.
