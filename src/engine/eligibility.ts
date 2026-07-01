// --- Eligibility engine: the exact, honest distance test. ---
// Pure geometry. This is our GROUND TRUTH — the answer H3 must match later.

import pointToLineDistance from '@turf/point-to-line-distance'
import lineSlice from '@turf/line-slice'
import { lineString, point } from '@turf/helpers'
import type { LngLat } from '../data/route'
import { CORRIDOR_METERS } from './corridor'
import type { Pickup } from '../data/pickups'

/**
 * The "road ahead" as a line (driver → destination).
 * Shared by the corridor and this test so they measure the SAME stretch.
 */
export function aheadSlice(route: LngLat[], driverPos: LngLat) {
  const line = lineString(route)
  const start = point(driverPos)
  const end = point(route[route.length - 1])
  return lineSlice(start, end, line)
}

/**
 * isWithinCorridor — exact perpendicular distance to the road ahead ≤ 350m?
 * This is the honest truth for one pickup.
 */
export function isWithinCorridor(
  pickup: Pickup,
  route: LngLat[],
  driverPos: LngLat,
): boolean {
  const ahead = aheadSlice(route, driverPos)
  const d = pointToLineDistance(point(pickup.position), ahead, {
    units: 'meters',
  })
  return d <= CORRIDOR_METERS
}

/**
 * eligibleByBruteForce — run the exact test on EVERY pickup.
 * Slow-but-correct. Returns the set of eligible pickup ids (our ground truth).
 */
export function eligibleByBruteForce(
  pickups: Pickup[],
  route: LngLat[],
  driverPos: LngLat,
): Set<number> {
  const eligible = new Set<number>()
  for (const p of pickups) {
    if (isWithinCorridor(p, route, driverPos)) eligible.add(p.id)
  }
  return eligible
}