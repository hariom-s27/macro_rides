import booleanPointInPolygon from '@turf/boolean-point-in-polygon'
import { pointToLineDistance, nearestPointOnLine, point, lineString, polygon as turfPolygon } from '@turf/turf'
import { aheadSlice } from './corridor'
import { ZONES } from '../data/zones'
import type { LngLat, Route, Pickup } from './types'

export const CORRIDOR_HALF_WIDTH_M = 350

/** In service = inside an ACTIVE zone AND not inside any INACTIVE (restricted) zone. */
export function isInActiveZone(pos: LngLat): boolean {
  const pt = point(pos)
  let inActive = false
  for (const z of ZONES) {
    const inside = booleanPointInPolygon(pt, turfPolygon([z.polygon]))
    if (inside && z.active) inActive = true
    if (inside && !z.active) return false   // restricted pocket → excluded immediately
  }
  return inActive
}

/** A pickup's "mile-marker": metres along the FULL route where it projects. */
export function alongDistanceMeters(route: Route, p: LngLat): number {
  const snapped = nearestPointOnLine(lineString(route), point(p), { units: 'meters' })
  return snapped.properties.location as number
}

/** Backward-compatible helper for the existing corridor tests. */
export function isWithinCorridor(pickup: Pickup, route: Route, driverMeters: number | LngLat): boolean {
  const driverAlong = Array.isArray(driverMeters) ? alongDistanceMeters(route, driverMeters) : driverMeters
  const slice = aheadSlice(route, driverAlong)
  return pointToLineDistance(point(pickup.position), slice, { units: 'meters' }) <= CORRIDOR_HALF_WIDTH_M
}

/** Backward-compatible helper for the existing directional tests. */
export function isAhead(pickup: Pickup, route: Route, driverMeters: number | LngLat): boolean {
  const driverAlong = Array.isArray(driverMeters) ? alongDistanceMeters(route, driverMeters) : driverMeters
  return alongDistanceMeters(route, pickup.position) >= driverAlong
}

/** The shared per-pickup predicate: within 350 m of the road ahead AND ahead of
 *  the driver. BOTH brute force and the H3 narrow phase call THIS, so Step 16's
 *  assert compares identical logic (otherwise it would prove nothing). */
export function isEligible(
  slice: ReturnType<typeof aheadSlice>,
  route: Route,
  driverMeters: number,
  p: Pickup,
): boolean {
  const within = pointToLineDistance(point(p.position), slice, { units: 'meters' }) <= CORRIDOR_HALF_WIDTH_M
  const ahead = alongDistanceMeters(route, p.position) >= driverMeters
  return within && ahead && isInActiveZone(p.position)
}

/** BRUTE-FORCE GROUND TRUTH: exact test run on EVERY pickup. */
export function eligibleBruteForce(route: Route, driverMeters: number, pickups: Pickup[]): Set<number> {
  const slice = aheadSlice(route, driverMeters)
  const eligible = new Set<number>()
  for (const p of pickups) if (isEligible(slice, route, driverMeters, p)) eligible.add(p.id)
  return eligible
}