# Emberline

Dusk woodland tower defense. Hold six maps. Plant six towers on the grass beside the road.

## Play

```bash
npm install
npm test
npm run dev
```

Open `http://localhost:8080`. `npm test` covers the watch engine (build, waves, relics, leaks) plus the existing auth/app-data checks.

## Watch

- **Towers:** Longbow, Mortar, Frost, Spark, Bramble, Ash Ward
- **Lines:** Pair adjacent Bow + Frost (Windcut), Mortar + Ward (Ashring), or Spark + Bramble (Stormroot) towers for +8% damage to both. Two of the same kind beside each other fire 10% faster.
- **Mark:** Tap a creep. Towers in range focus it and hit 18% harder.
- **Hard watch:** 14 lives, tougher creeps, richer bounties. Shells splinter into a grub. Three hounds run as a pack.
- **Forge:** Damage, Rate, or Reach. Highest of the three is the form: Timber → Bound → Tempered → Crowned → Emberlit. Emberlit is unique per tower.
- **Tools:** Horn (burn the road + slow), Mend (lives + drag), Move, Sell. Pause is pause. 1× / 2× / 3× is speed.
- **Relics** persist between maps (including Watch cord and Gate flint). Stall prices drop each wave.

## Stack

TanStack Start, React, Canvas 2D.
