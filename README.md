# Emberline

Dusk woodland tower defense. Hold five maps. Plant six towers on the grass beside the road.

## Play

```bash
npm install
npm test
npm run dev
```

Open `http://localhost:8080`. `npm test` covers the watch engine (build, waves, relics, leaks) plus the existing auth/app-data checks.

## Watch

- **Towers:** Longbow, Mortar, Frost, Spark, Bramble, Ash Ward
- **Forms:** Timber → Bound → Tempered → Crowned → Emberlit
- **Tools:** Horn (burn the road + slow), Mend (lives + drag), Move, Sell. Pause is pause. 1× / 2× / 3× is speed.
- **Relics** persist between maps (including Watch cord and Gate flint). Stall prices drop each wave.

## Stack

TanStack Start, React, Canvas 2D.
