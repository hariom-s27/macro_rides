// --- Eligibility engine: the exact, honest distance test. ---
// Pure geometry. This is our GROUND TRUTH — the answer H3 must match later.

import pointToLineDistance from '@turf/point-to-line-distance'
import { lineString, point } from '@turf/helpers'
import lineSliceAlong from '@turf/line-slice-along'
import length from '@turf/length'
import type { Route, Pickup } from './types'
import { CORRIDOR_METERS } from './corridor'

/**
 * The "road ahead" as a line (driver → destination).
 * Shared by the corridor and this test so they measure the SAME stretch.
 */
export function aheadSlice(route: Route, alongMeters: number) {
  const line = lineString(route)
  const totalKm = length(line, { units: 'kilometers' })
  const startKm = Math.min(alongMeters / 1000, totalKm)
  return lineSliceAlong(line, startKm, totalKm, { units: 'kilometers' })
}

/**
 * isWithinCorridor — exact perpendicular distance to the road ahead ≤ 350m?
 * This is the honest truth for one pickup.
 */
export function isWithinCorridor(
  pickup: Pickup,
  route: Route,
  alongMeters: number,
): boolean {
  const ahead = aheadSlice(route, alongMeters)
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
  route: Route,
  alongMeters: number,
): Set<number> {
  const eligible = new Set<number>()
  for (const p of pickups) {
    if (isWithinCorridor(p, route, alongMeters)) eligible.add(p.id)
  }
  return eligible
}