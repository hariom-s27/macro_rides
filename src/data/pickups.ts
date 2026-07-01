import type { LngLat, Pickup } from '../engine/types'
import { DRIVER_ROUTE } from './route'

// --- tiny seeded random generator (mulberry32) ---
// Given a fixed seed, it returns the SAME sequence of numbers every run.
// So our pickup scatter is identical on every reload.
function mulberry32(seed: number) {
  return function () {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296  // → a number in [0, 1)
  }
}

// Rough metres→degrees near Bengaluru (~12.9°N). Good enough for placing test data.
const M_PER_DEG_LAT = 111_320
const M_PER_DEG_LNG = 111_320 * Math.cos((12.94 * Math.PI) / 180)

// Offset a [lng,lat] point by (east, north) metres.
function offsetMeters([lng, lat]: LngLat, east: number, north: number): LngLat {
  return [lng + east / M_PER_DEG_LNG, lat + north / M_PER_DEG_LAT]
}

// Scatter pickups near the route, with a deliberate spread of distances.
export function generatePickups(count = 60): Pickup[] {
  const rand = mulberry32(42) // fixed seed → reproducible
  const pickups: Pickup[] = []

  for (let i = 0; i < count; i++) {
    // pick a random point ALONG the route to scatter around
    const anchor = DRIVER_ROUTE[Math.floor(rand() * DRIVER_ROUTE.length)]

    // random direction, and a distance spread from ~50m to ~650m off the route
    const angle = rand() * 2 * Math.PI
    const dist = 50 + rand() * 600           // metres
    const east = Math.cos(angle) * dist
    const north = Math.sin(angle) * dist

    pickups.push({ id: i, position: offsetMeters(anchor, east, north) })
  }

  return pickups
}

// Build once at import (stable for the whole session).
export const PICKUPS: Pickup[] = generatePickups()