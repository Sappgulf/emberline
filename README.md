# Emberline

Dusk woodland tower defense. Hold eight maps. Plant eight towers on the grass beside the road.

## Play

```bash
npm install
npm test
npm run dev
```

Open `http://localhost:8080`. `npm test` covers the watch engine (build, waves, relics, leaks) plus the existing auth/app-data checks.

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
- **Mark:** Tap a creep. Towers in range focus it and hit 18% harder.
- **Hard watch:** 14 lives, tougher creeps, richer bounties. Shells splinter into a grub. Three hounds run as a pack.
- **Forge:** Damage, Rate, or Reach. Highest of the three is the form: Timber → Bound → Tempered → Crowned.
- **Emberlit:** At Crowned, choose one of two awakenings for each tower (C key ability, two branch buttons).
- **Abilities:** Every tower has an active power on a cooldown — Volley, Siege shell, Nova, Overcharge, Briar, Sanctum, Brace, Firestorm.
- **Watch hall:** Marks earned from held roads and bosses buy permanent perks. Hold all eight roads to unlock the endless Long Night.
- **Tools:** Horn (burn the road + slow), Mend (lives + drag), Move, Sell. Pause is pause. 1× / 2× / 3× is speed.
- **Relics** persist between maps (including Watch cord, Gate flint, and Lantern wick). Stall prices drop each wave.

## Chronicle

The Bestiary now has two tabs: the field guide and the Chronicle, whose pages open as you hold roads, carry relics, and walk the Long Night.

## Stack

TanStack Start, React, Canvas 2D.
