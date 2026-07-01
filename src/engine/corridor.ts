// --- The corridor engine: pure geometry, no React/map here. ---
// Given the route + where the driver is, produce the 350m "road ahead" corridor.
// Kept framework-free so it can be unit-tested in isolation (Phase 4, Step 18).

import buffer from '@turf/buffer'
import lineSlice from '@turf/line-slice'
import { lineString, point } from '@turf/helpers'
import type { Feature, Polygon, MultiPolygon } from 'geojson'
import type { LngLat } from '../data/route'

export const CORRIDOR_METERS = 350

/**
 * buildCorridor
 * 1. slice the route from the driver's position to the end (the road AHEAD)
 * 2. buffer that slice outward by 350m → the corridor polygon
 *
 * @param route       full route as [lng,lat] points
 * @param driverPos   driver's current [lng,lat] (for now, the route's start)
 * @returns           a GeoJSON Polygon feature (the corridor), or null if it can't build
 */
export function buildCorridor(
  route: LngLat[],
  driverPos: LngLat,
): Feature<Polygon | MultiPolygon> | null {
  const line = lineString(route)          // route → a GeoJSON line
  const start = point(driverPos)          // driver position → a GeoJSON point
  const end = point(route[route.length - 1]) // last route point = destination

  // road AHEAD only: cut from driver to destination
  const ahead = lineSlice(start, end, line)

  // inflate 350m on every side → the corridor
  const corridor = buffer(ahead, CORRIDOR_METERS / 1000, { units: 'kilometers' })

  return corridor ?? null
}