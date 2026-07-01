import { lineString } from '@turf/helpers'
import length from '@turf/length'
import along from '@turf/along'
import lineSliceAlong from '@turf/line-slice-along'
import buffer from '@turf/buffer'
import type { LngLat, Route } from './types'

export const CORRIDOR_METERS = 350
const CORRIDOR_HALF_WIDTH_KM = CORRIDOR_METERS / 1000
const MAX_AHEAD_KM = 2               // only look ~2 km ahead (ledger gap #4)

/** Total route length in metres — used to size the slider. */
export function routeLengthMeters(route: Route): number {
  return length(lineString(route), { units: 'meters' })
}

/** The driver's [lng,lat], given how far along the route they are (metres). */
export function driverPosition(route: Route, alongMeters: number): LngLat {
  const pt = along(lineString(route), alongMeters, { units: 'meters' })
  return pt.geometry.coordinates as LngLat
}

/**
 * The 350 m corridor covering the road AHEAD of the driver:
 * slice the route from the driver's position forward (capped at MAX_AHEAD_KM),
 * then buffer that slice by 350 m. Returns a GeoJSON polygon feature to draw.
 */
export function buildCorridor(route: Route, alongMeters: number) {
  const line = lineString(route)
  const totalKm = length(line, { units: 'kilometers' })
  const startKm = Math.min(alongMeters / 1000, totalKm)
  const endKm = Math.min(startKm + MAX_AHEAD_KM, totalKm)
  const aheadSlice = lineSliceAlong(line, startKm, endKm, { units: 'kilometers' })
  return buffer(aheadSlice, CORRIDOR_HALF_WIDTH_KM, { units: 'kilometers' })
}