# Macro Rides — Zone Boundary + Dynamic Route Corridor Visualization

A web-based demo that draws a **350 m corridor around a driver's live route**, highlights the **pickup points eligible** for that corridor, and filters them further by **service-zone membership** — all backed by **H3 spatial indexing** so the eligibility query stays cheap as the pickup count grows.

**Live demo:** https://macro-rides-virid.vercel.app/
**Repository:** https://github.com/hariom-s27/macro_rides

---

## Run it

```bash
npm install
npm run dev      # opens the map at http://localhost:5173
npm test         # runs the engine unit tests
npm run build    # production build
```

Press **Play** to self-drive the route, or drag the slider to move the driver manually.

## What's on screen

| Layer | Meaning |
|---|---|
| Blue line | Driver's route (a real Koramangala, Bengaluru street path) |
| Blue translucent polygon | 350 m corridor buffer around the road **ahead** of the driver |
| Green / grey polygons | Service zones — green = active, grey = inactive (restricted) |
| Orange dots | Pickups currently eligible (in corridor, ahead of driver, in an active zone) |
| Grey dots | Pickups not currently eligible |
| Black dot | The driver |

The status bar shows live driver progress, the eligible count, **how many pickups the spatial index actually had to check**, and a running self-check comparing the indexed result against a brute-force ground truth. Toggles reveal the **H3 grid** and a **demand heatmap**.

---

## Requirement → where it's implemented → how to see it

| Brief requirement | Where in the code | How to see it in the demo |
|---|---|---|
| 350 m buffer corridor around the route | `engine/corridor.ts` — `buildCorridor` (ahead-slice + 350 m buffer) | The translucent blue corridor following the road ahead |
| Highlight eligible pickups in the corridor | `engine/eligibility.ts` — `isEligible`, `eligibleBruteForce` | Orange dots = eligible; grey = not |
| **H3** for geospatial indexing & queries | `engine/h3.ts` — `buildPickupIndex`, `queryEligibleH3` (broad/narrow, res 9) | Panel: "Checked X of N"; toggle "H3 grid" to see the index |
| Map rendering & visualization | MapLibre GL + deck.gl (`App.tsx`) | The whole map, corridor, dots, zones, hexes |
| Driver's route displayed | `data/route.ts` + deck.gl `PathLayer` | The blue route line |
| Zone boundaries displayed | `data/zones.ts` + deck.gl `PolygonLayer` | Green (active) / grey (restricted) polygons |
| Eligible pickups within corridor | `engine/eligibility.ts` (combined filter) | Orange dots inside corridor and inside an active zone |
| Real-time / simulated route updates | Slider + Play/Reset + **Re-route** button | Drag, press Play, or click Re-route — everything recomputes live |

---

## Approach

### 1. Corridor = buffered "ahead" slice, not the whole route

The corridor isn't a buffer of the entire route — it's a buffer of the road **ahead** of the driver, capped at a **1.2 km reachability horizon** (`AHEAD_CAP_KM` in `src/engine/corridor.ts`). Two reasons:

- A captain cares about pickups they can reach soon, not ones 2.5 km down the road.
- Capping the slice caps how many H3 cells the corridor covers, which is what keeps the "checked" count in the UI small — the whole point of indexing.

`buildCorridor` uses Turf's `lineSliceAlong` to cut that ahead-slice, then `buffer` to grow it by 350 m on each side.

### 2. Eligibility is three independent conditions, ANDed

A pickup is eligible only if all three hold (`isEligible` in `src/engine/eligibility.ts`):

1. **Within corridor** — perpendicular distance from the pickup to the ahead-slice is ≤ 350 m (`pointToLineDistance`).
2. **Ahead of the driver** — the pickup's arc-length position along the full route (`nearestPointOnLine`, used as an odometer reading) is ≥ the driver's own position. Arc-length, not heading, so it stays correct on curves.
3. **In an active service zone** — inside at least one `active: true` zone and not inside any `active: false` (restricted) polygon (`booleanPointInPolygon`).

This predicate is the **single source of truth**: both the brute-force check and the H3 narrow phase call the exact same function, so the two can never disagree on what "eligible" means — only on how fast they get there.

### 3. H3 as a broad phase, not the whole answer

H3 doesn't replace the exact geometry test — it narrows the candidate set before the exact test runs (`src/engine/h3.ts`):

- **Index once, at startup:** every pickup is hashed to an H3 cell at **resolution 9** (`latLngToCell`, edge ≈ 174 m, sized to fit a 350 m corridor) and bucketed into a `Map<cell, Pickup[]>`. This is the one O(P) pass.
- **Per query:** convert the corridor polygon to the set of H3 cells it covers (`polygonToCells`), **pad by one ring** (`gridDisk`) so the broad phase can never exclude a true positive near a cell boundary, then pull only the pickups bucketed under those cells.
- **Narrow phase:** run the real `isEligible` test on just those candidates.

The UI's "checked X of Y" readout is that candidate count — a typical corridor position touches only a small fraction of the 80 pickups, because H3 pulls only from cells the corridor geometry actually covers, regardless of total pickup count.

### 4. Correctness check baked into the UI

`eligibleBruteForce` runs `isEligible` against every pickup with no indexing. The app runs **both** paths on every driver position and compares the resulting sets (`setsEqual`); the status bar flips red the instant the indexed result would ever diverge from ground truth. This invariant is also exercised directly in `src/engine/engine.test.ts` at 50 positions along the route.

### 5. Data

- **Route** (`src/data/route.ts`): a real street-following path through Koramangala, generated once via OSRM and hardcoded — no live routing API at runtime. A second alternate route powers the **Re-route** demo.
- **Pickups** (`src/data/pickups.ts`): 80 points from a seeded PRNG (fixed seed → identical scatter every run), deliberately mixed — ~60% within 50–600 m of the route (the interesting in/out/edge cases) and ~40% scattered 0.8–2.5 km away (clear decoys the H3 broad phase should exclude).
- **Zones** (`src/data/zones.ts`): one large active polygon covering the route, plus one small inactive "restricted pocket" straddling the corridor so the zone filter **visibly excludes** pickups that pass the corridor + ahead tests.

### 6. Simulated route updates

There's no live GPS feed, so "live route" is simulated: a `driverM` (metres-along-route) value drives everything downstream — the driver marker, the corridor slice, and both eligibility computations. `App.tsx` advances it on a fixed interval when playing, or lets it be set directly via the slider. Because every derived value is a **pure function of `driverM`**, manual scrubbing and animated playback exercise the exact same code path. The **Re-route** button swaps the active route entirely, and everything recomputes live — satisfying the brief's "route updates" literally.

---

## Design decisions & assumptions

- **Map engine — MapLibre GL JS (via react-map-gl).** The brief says "Mapbox or Leaflet." MapLibre is the open-source, API-compatible successor to Mapbox GL JS (proprietary since v2). It is token-free and integrates natively with deck.gl for the H3 and corridor overlays — satisfying the requirement while avoiding a vendor-key dependency.
- **Dual-resolution H3.** Corridor candidate lookup uses **resolution 9** (edge ≈ 174 m) to hug the 350 m corridor, while the demand heatmap aggregates at **resolution 8** (edge ≈ 461 m) so hexagons are coarse enough to read as density — the same index tuned to two different questions.
- **Accuracy validated against ground truth.** Beyond H3-matches-brute-force, the exact distance function is checked against an **independent hand calculation** (a point whose 350 m distance is computed without reference to Turf) — so "350 m" is verified to be really 350 m, not just internally consistent.
- **Distance model.** Distances use Turf's geodesic model on the WGS84 sphere; error at neighbourhood scale is far below the 350 m threshold.
- **Coordinate order.** Internally every coordinate is `[lng, lat]`; the only conversion to H3's `(lat, lng)` is quarantined in one adapter, so coordinate-order bugs can't spread.

---

## Stack

- **Map rendering:** MapLibre GL via react-map-gl, styled with an OpenFreeMap vector tile style (no API key required).
- **Layers:** deck.gl (`PathLayer`, `PolygonLayer`, `GeoJsonLayer`, `ScatterplotLayer`, `H3HexagonLayer`) composited onto the MapLibre canvas via `@deck.gl/mapbox`'s `MapboxOverlay`.
- **Geometry:** Turf.js for line slicing, buffering, distance, and point-in-polygon tests.
- **Spatial index:** h3-js at resolution 9 (lookup) and 8 (demand aggregation).
- **Testing:** Vitest, asserting against the same `isEligible` path the app runs.

## Project structure

```
src/
  engine/       pure geospatial logic — corridor, eligibility, H3 index, shared types
  data/         route(s), seeded pickups, zone polygons
  App.tsx       map, layers, animation loop, UI chrome
```

Keeping `engine/` free of React and rendering concerns means the corridor/eligibility/H3 logic is unit-testable in isolation and could be reused server-side (e.g. to serve eligibility over an API) without change.

## Known simplifications

- The route and pickup data are static fixtures rather than a live feed — the assignment calls out "real time or simulated," and simulated was the pragmatic choice for a self-contained demo.
- The reachability horizon (1.2 km ahead) and pickup count (80) are tuned for this one route/city; a production version would derive them from expected trip length and city pickup density rather than hardcoding constants.