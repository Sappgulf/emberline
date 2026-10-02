# Emberline watch upgrade art v2

Generated on 2026-10-02 using the built-in imagegen tool. The existing runner illustration was supplied as an identity reference. PNG originals are retained beside optimized WebP runtime assets; no provider credentials or new runtime dependency are required.

## Runner gallop prompt

Use case: stylized-concept. Asset type: four-frame running sprite atlas for Emberline, a painterly woodland tower defense game. Reference image is creature identity and style only: preserve the lean orange fox, long ears, tawny fur, pointed snout and dark feet. Create a landscape atlas with exactly FOUR equally sized foxes running RIGHT, in one horizontal row and four sequential gallop poses. Equal invisible cells, centers at 12.5%, 37.5%, 62.5%, 87.5% canvas width. Exactly same creature scale, head size, body length and baseline in all frames. Fit each complete fox within central 72% of its cell with transparent gaps, leave generous margins for ears and tail. Only legs, slight torso flex and tail animate; do not enlarge or dramatically rotate creatures. All foxes' feet on same baseline at 75% canvas height, entire bodies between 32% and 75% canvas height. Hand-painted storybook dark fantasy with crisp readable silhouette, muted amber fur and warm highlights. No frame labels, no borders, no text, no road, no shadows. Truly transparent background. Output a production sprite sheet with four clean separated aligned frames.

Reference: `public/assets/sprites/runner.png`; transparent background requested.

## Ash ground prompt

Use case: stylized-concept. Asset type: seamless repeating top-down terrain texture for Emberline, a hand-painted woodland tower defense game. Create a square tile of scorched woodland ground: muted charcoal earth, broken flat shale, pale gray ash dust, a few rusty fallen leaves and tiny ember-orange fissures. Painterly storybook dark fantasy, viewed precisely straight down, no horizon, no perspective structures. Quiet low-contrast granular detail across whole tile so small game units remain legible. Ember fissures are sparse subtle warm accents, not a carpet of fire. Soft diffuse lighting; values readable medium dark slate, sepia and muted copper. Seamlessly repeating edges on all four sides. No roads, trees, structures, creatures, icons, borders, labels, text or watermark. Fill the whole square with the texture. This is actual battlefield floor for the Ember Copse and Ash Hollow campaign maps, not concept scenery.

## Source and delivery

- Runner generation: `/Users/austinbeatty/.codex/generated_images/01a0fa74-2533-7fc3-a9de-a17b7a639548/exec-64b1f861-d3e0-4e55-91a5-bc383c9d2b86.png`.
- Ash generation: `/Users/austinbeatty/.codex/generated_images/01a0fa74-2533-7fc3-a9de-a17b7a639548/exec-2a21ef9e-8df8-4c80-bca2-00e335e66e4b.png`.
- Source copies: `public/assets/sprites/runner-gallop-v1.png` and `public/assets/tiles/ash-floor-v1.png`.
- Runner delivery: `public/assets/sprites/runner-gallop-v1.webp`, 2172×724, four equal cells, quality 90 with alpha, about 167 KB.
- Ground delivery: `public/assets/tiles/ash-floor-v1.webp`, 768×768, quality 84, about 177 KB.
- Conversion: installed `cwebp`. Runner frames follow distance traveled and share a vertical crop. Reduced motion retains the first pose. Ash terrain is limited to Ember Copse and Ash Hollow and uses the existing backdrop cache, with load completion in its invalidation key. Routes and collision remain authored map data.

Delivery SHA-256:

- Runner: `141a33c0393c1b3a9104528746d41370076ebfd563e699ca24bf6ef31a88e75d`.
- Ash: `367abccf102b24607081856211354063cdb170533e744daf98c106b78d2f65ec`.
