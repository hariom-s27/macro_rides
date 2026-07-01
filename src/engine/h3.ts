import { latLngToCell, gridDisk, polygonToCells } from 'h3-js'
import type { Feature, Polygon, MultiPolygon } from 'geojson'
import { buildCorridor, aheadSlice } from './corridor'
import { isEligible } from './eligibility'
import type { LngLat, Route, Pickup } from './types'

export const H3_RES = 9 // edge ≈ 174 m — a natural fit for a 350 m corridor

/** THE coordinate adapter: our [lng,lat] → h3's (lat, lng). The ONLY place the
 *  flip happens. Everywhere else stays [lng,lat]. */
export function cellForPoint(p: LngLat): string {
  return latLngToCell(p[1], p[0], H3_RES)
}

export type PickupIndex = Map<string, Pickup[]>

/** Precompute each pickup's cell ONCE. This is the O(P) startup cost that makes
 *  every later query O(candidates) instead of O(all pickups). */
export function buildPickupIndex(pickups: Pickup[]): PickupIndex {
  const idx: PickupIndex = new Map()
  for (const p of pickups) {
    const cell = cellForPoint(p.position)
    const bucket = idx.get(cell)
    if (bucket) bucket.push(p)
    else idx.set(cell, [p])
  }
  return idx
}

/** Corridor polygon → the cells it covers, PADDED by one ring so broad phase
 *  never misses a true pickup (isGeoJson:true reads Turf's [lng,lat] directly). */
export function corridorCandidateCells(corridor: Feature<Polygon | MultiPolygon>): Set<string> {
  const geom = corridor.geometry
  const polys = geom.type === 'Polygon' ? [geom.coordinates] : geom.coordinates
  const covered = new Set<string>()
  for (const poly of polys) {
    for (const c of polygonToCells(poly as number[][][], H3_RES, true)) covered.add(c)
  }
  const padded = new Set<string>()
  for (const c of covered) for (const n of gridDisk(c, 1)) padded.add(n)
  return padded
}

export interface QueryResult {
  eligible: Set<number>
  checked: number // pickups that passed broad phase → got the exact test
  total: number   // all pickups
}

/** BROAD phase (H3 cell lookup) → NARROW phase (exact test on candidates only). */
export function queryEligibleH3(
  route: Route,
  driverMeters: number,
  pickups: Pickup[],
  index: PickupIndex,
): QueryResult {
  const corridor = buildCorridor(route, driverMeters)
  if (!corridor) return { eligible: new Set(), checked: 0, total: pickups.length }

  const slice = aheadSlice(route, driverMeters)
  const candidateCells = corridorCandidateCells(corridor as Feature<Polygon | MultiPolygon>)

  // broad phase: pull candidate pickups out of the candidate cells
  const candidates: Pickup[] = []
  for (const cell of candidateCells) {
    const bucket = index.get(cell)
    if (bucket) candidates.push(...bucket)
  }

  // narrow phase: exact test on ONLY those candidates
  const eligible = new Set<number>()
  for (const p of candidates) if (isEligible(slice, route, driverMeters, p)) eligible.add(p.id)

  return { eligible, checked: candidates.length, total: pickups.length }
}