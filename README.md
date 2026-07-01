# Macro Rides — Zone Boundary + Dynamic Route Corridor Visualization

A web-based demo that draws a 350 m corridor around a driver's live route, highlights
pickup points eligible for that corridor, and filters them further by service-zone
membership — all backed by H3 spatial indexing so the eligibility query stays cheap as
the pickup count grows.

## Demo

- `npm install`
- `npm run dev` — opens the map at `http://localhost:5173`
- Press **Play** to self-drive the route, or drag the slider to move the driver manually.

## What's on screen

| Layer | Meaning |
|---|---|
| Blue line | Driver's route (a real Koramangala, Bengaluru street path) |
| Blue translucent polygon | 350 m corridor buffer around the road **ahead** of the driver |
| Green / grey polygons | Service zones — green = active, grey = inactive (restricted) |
| Orange dots | Pickups currently eligible (in corridor, ahead of driver, in an active zone) |
| Grey dots | Pickups not currently eligible |
| Black dot | The driver |

The status bar at the bottom shows live driver progress, the eligible count, how many
pickups the spatial index actually had to check, and a running self-check comparing the
indexed result against a brute-force ground truth.

## Approach

### 1. Corridor = buffered "ahead" slice, not the whole route

The corridor isn't a buffer of the entire route — it's a buffer of the road **ahead** of
the driver, capped at a 1.2 km reachability horizon (`AHEAD_CAP_KM` in
[`src/engine/corridor.ts`](src/engine/corridor.ts)). Two reasons:

- A captain cares about pickups they can reach soon, not ones 2.5 km down the road.
- Capping the slice caps how many H3 cells the corridor covers, which is what keeps the
  "checked" count in the UI small — the whole point of indexing.

`buildCorridor` uses Turf's `lineSliceAlong` to cut that ahead-slice, then `buffer` to
grow it by 350 m on each side.

### 2. Eligibility is three independent conditions, ANDed

A pickup is eligible only if **all three** hold (`isEligible` in
[`src/engine/eligibility.ts`](src/engine/eligibility.ts)):

1. **Within corridor** — perpendicular distance from the pickup to the ahead-slice is
   ≤ 350 m (`pointToLineDistance`).
2. **Ahead of the driver** — the pickup's arc-length position along the *full* route
   (`nearestPointOnLine`, used as an odometer reading) is ≥ the driver's own position.
3. **In an active service zone** — inside at least one `active: true` zone polygon and
   not inside any `active: false` (restricted) polygon (`booleanPointInPolygon`).

This predicate is the single source of truth: both the brute-force check and the H3
narrow phase call the exact same function, so there's no risk of the two disagreeing on
what "eligible" means — only on how fast they get there.

### 3. H3 as a broad phase, not the whole answer

H3 doesn't replace the exact geometry test — it narrows the candidate set before the
exact test runs (`src/engine/h3.ts`):

- **Index once, at startup**: every pickup is hashed to an H3 cell at resolution 9
  (`latLngToCell`, edge ≈ 174 m, sized to fit a 350 m corridor) and bucketed into a
  `Map<cell, Pickup[]>`. This is the one O(P) pass.
- **Per query**: convert the corridor polygon to the set of H3 cells it covers
  (`polygonToCells`), pad by one ring (`gridDisk`) so the broad phase can never exclude
  a true positive sitting near a cell boundary, then pull only the pickups bucketed
  under those cells.
- **Narrow phase**: run the real `isEligible` test on just those candidates.

The UI's "checked X of Y pickups" readout is that candidate count — with the route's
80-pickup seed data, a typical corridor position touches a small fraction of them,
because H3 only pulls pickups from cells the corridor geometry actually covers,
regardless of total pickup count.

### 4. Correctness check baked into the UI

`eligibleBruteForce` runs `isEligible` against **every** pickup with no indexing at all.
The app runs both paths on every driver position and compares the resulting sets
(`setsEqual`); the status bar flips red the instant the indexed result would ever
diverge from ground truth. This is also exercised directly in
[`src/engine/engine.test.ts`](src/engine/engine.test.ts).

### 5. Data

- **Route** ([`src/data/route.ts`](src/data/route.ts)): a real street-following path
  through Koramangala, generated once via OSRM and hardcoded — no live routing API at
  runtime.
- **Pickups** ([`src/data/pickups.ts`](src/data/pickups.ts)): 80 points from a seeded
  PRNG (fixed seed → identical scatter every run), deliberately mixed — 60% within
  50–600 m of the route (the interesting in/out/edge cases) and 40% scattered 0.8–2.5 km
  away (clear decoys the H3 broad phase should exclude).
- **Zones** ([`src/data/zones.ts`](src/data/zones.ts)): one large active polygon covering
  the whole route, plus one small inactive "restricted pocket" straddling the corridor so
  the zone filter visibly excludes pickups that pass the corridor + ahead tests.

### 6. Simulated route updates

There's no live GPS feed, so "live route" is simulated: a `driverM` (metres-along-route)
value drives everything downstream — the driver marker, the corridor slice, and both
eligibility computations. `App.tsx` advances it on a fixed interval when playing, or lets
it be set directly via the slider. Because every derived value is a pure function of
`driverM`, manual scrubbing and animated playback exercise the exact same code path.

## Stack

- **Map rendering**: [MapLibre GL](https://maplibre.org/) via `react-map-gl`, styled with
  an OpenFreeMap vector tile style (no API key required).
- **Layers**: [deck.gl](https://deck.gl/) (`PathLayer`, `PolygonLayer`, `GeoJsonLayer`,
  `ScatterplotLayer`) composited onto the MapLibre canvas via `@deck.gl/mapbox`'s
  `MapboxOverlay`.
- **Geometry**: [Turf.js](https://turfjs.org/) for line slicing, buffering, distance, and
  point-in-polygon tests.
- **Spatial index**: [h3-js](https://h3geo.org/) at resolution 9.
- **Testing**: Vitest, asserting against the same `isEligible` path the app runs.

## Project structure

```
src/
  engine/       pure geospatial logic — corridor, eligibility, H3 index, shared types
  data/         route, seeded pickups, zone polygons
  App.tsx       map, layers, animation loop, UI chrome
```

Keeping `engine/` free of React and rendering concerns means the corridor/eligibility/H3
logic is unit-testable in isolation and could be reused server-side (e.g. to serve
eligibility over an API) without change.

## Known simplifications

- The route and pickup data are static fixtures rather than a live feed — the assignment
  calls out "real time **or simulated**," and simulated was the pragmatic choice for a
  self-contained demo.
- The reachability horizon (1.2 km ahead) and pickup count (80) are tuned for this one
  route/city; a production version would derive them from expected trip length and city
  pickup density rather than hardcoding constants.
