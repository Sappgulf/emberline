# Emberline

Dusk woodland tower defense. Hold eight roads with eight tower types, choose relics and camp preparations, and build a watch that can survive the Long Night.

**[Play Emberline](https://emberline-xi.vercel.app)** · [Report an issue](https://github.com/Sappgulf/emberline/issues)

## Hold the road

Plant towers on the grass beside the route, then adapt their placement, targeting, and upgrades to the next wave.

- Eight tower types with damage, rate, and reach upgrades.
- Campaign roads with bosses, elites, and between-road camp choices.
- Tower pairings, relic sets, elemental reactions, focus fire, and Rally.
- Normal and hard watches, plus an unlockable endless Long Night.
- Forecasts and a battle ledger to understand the wave and your defenses.

Watch Pike and Cinder Brazier unlock during the campaign. Permanent Watch Hall perks carry progression beyond an individual road.

## Play and controls

The hosted game is the quickest way to start. Read the briefing and Orders for the current watch's controls and rules.

- Tap a live enemy to focus fire; tap it again to apply the stronger manual Mark.
- **K:** use the scout's mark.
- **V:** Rally when resolve is full.
- **C:** activate the selected tower's ability.
- Use the command deck for targeting, upgrades, moving, selling, and speed.

Pause and Orders stop combat time. Reduced-motion support preserves combat feedback while disabling selected animations.

## Run locally

```sh
git clone https://github.com/Sappgulf/emberline.git
cd emberline
npm install
npm run dev
```

Open **http://localhost:8080**. The development launcher applies the application's environment configuration.

## Checks

```sh
npm test
npm run test:scripts
npm run typecheck
npm run lint
```

With a local server running:

```sh
npm run test:game:browser
npm run test:game:support
```

The browser suite covers game journeys and responsive layouts; the support suite focuses on healing, casting, pause, and board geometry. `npm run test:game:live` is a separate public-deployment smoke check.

The engine's campaign simulations use a strengthened test arsenal to check stability. They do not establish that the campaign's difficulty is balanced. See the [game audit](docs/game-audit-2026-10-01.md) for recorded findings and verification limits.

## Technology and artwork

TanStack Start, React, TypeScript, and Canvas 2D. The repository also includes application data, authentication, and migration tooling.

Artwork provenance is recorded in the [battlefield art notes](art/imagegen/battlefield-polish-v1.md) and [watch upgrade art notes](art/imagegen/watch-upgrade-v2.md).

## Contributing

When reporting a game issue, include the road, wave, mode, browser, and steps to reproduce it. Screenshots of the forecast or battle ledger can help explain what happened.

## Detailed reference

See the [game and testing guide](GAME_GUIDE.md) for tower reactions, targeting, relics, campaign rules, and browser-check coverage.
