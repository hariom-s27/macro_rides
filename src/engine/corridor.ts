import lineSliceAlong from '@turf/line-slice-along'
import length from '@turf/length'
import { lineString } from '@turf/helpers'
import { along, buffer } from '@turf/turf'
import type { LngLat, Route } from './types'

export const CORRIDOR_HALF_WIDTH_KM = 0.35 // 350 m
// Reachability horizon: only consider the next 1.2 km of road ahead.
// Real captains grab pickups reachable SOON, not 2.5 km away — and a shorter
// corridor covers far fewer H3 cells, so "checked" stays small (the scalability story).
export const AHEAD_CAP_KM = 1.2

export function routeLengthMeters(route: Route): number {
  return length(lineString(route), { units: 'meters' })
}

export function driverPosition(route: Route, alongMeters: number): LngLat {
  return along(lineString(route), alongMeters, { units: 'meters' }).geometry.coordinates as LngLat
}

/** The road ahead, capped: from the driver to min(driver + 1.2km, route end). */
export function aheadSlice(route: Route, alongMeters: number) {
  const line = lineString(route)
  const totalKm = length(line, { units: 'kilometers' })
  const startKm = alongMeters / 1000
  const endKm = Math.min(startKm + AHEAD_CAP_KM, totalKm)
  return lineSliceAlong(line, startKm, endKm, { units: 'kilometers' })
}

/** The 350 m corridor polygon to DRAW (buffer of the ahead-slice). */
export function buildCorridor(route: Route, alongMeters: number) {
  return buffer(aheadSlice(route, alongMeters), CORRIDOR_HALF_WIDTH_KM, { units: 'kilometers' })
}