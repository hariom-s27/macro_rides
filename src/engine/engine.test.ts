import { describe, it, expect } from 'vitest'
import { point } from '@turf/helpers'
import distance from '@turf/distance'
import destination from '@turf/destination'

import { DRIVER_ROUTE } from '../data/route'
import { aheadSlice } from './corridor'
import { isEligible, alongDistanceMeters, isInActiveZone } from './eligibility'
import type { Pickup } from './types'

// helper: make a Pickup at a given [lng,lat]
const pk = (id: number, position: [number, number]): Pickup => ({ id, position })
const coordOf = (f: any) => f.geometry.coordinates as [number, number]

describe('distance accuracy — the ground-truth fixture', () => {
  it('a known 300m offset measures as 300m (±3m)', () => {
    const origin = point(DRIVER_ROUTE[5])
    const known300 = destination(origin, 0.3, 0, { units: 'kilometers' })
    const d = distance(origin, known300, { units: 'meters' })
    expect(d).toBeGreaterThan(297)
    expect(d).toBeLessThan(303)
  })
})

describe('eligibility via the REAL isEligible path (driver at start = 0m)', () => {
  const slice0 = aheadSlice(DRIVER_ROUTE, 0)   // ahead-slice at driver 0m, same as the app

  it('a ~150m-off point near the route is eligible', () => {
    // offset from a mid-route vertex, so it's ahead of a start-driver and in-zone
    const near = destination(point(DRIVER_ROUTE[6]), 0.15, 90, { units: 'kilometers' })
    expect(isEligible(slice0, DRIVER_ROUTE, 0, pk(1, coordOf(near)))).toBe(true)
  })

  it('a ~600m-off point is NOT eligible (outside 350m corridor)', () => {
    const far = destination(point(DRIVER_ROUTE[6]), 0.6, 90, { units: 'kilometers' })
    expect(isEligible(slice0, DRIVER_ROUTE, 0, pk(2, coordOf(far)))).toBe(false)
  })
})

describe('directional filter via alongDistanceMeters (odometer)', () => {
  it('arc-length increases along the route', () => {
    expect(alongDistanceMeters(DRIVER_ROUTE, DRIVER_ROUTE[10]))
      .toBeGreaterThan(alongDistanceMeters(DRIVER_ROUTE, DRIVER_ROUTE[2]))
  })

  it('a point near the START is behind a driver already mid-route', () => {
    // driver mid-route; a near-start pickup should fail isEligible on the "ahead" clause
    const midMeters = alongDistanceMeters(DRIVER_ROUTE, DRIVER_ROUTE[7])
    const sliceMid = aheadSlice(DRIVER_ROUTE, midMeters)
    const nearStart = destination(point(DRIVER_ROUTE[1]), 0.1, 90, { units: 'kilometers' })
    expect(isEligible(sliceMid, DRIVER_ROUTE, midMeters, pk(3, coordOf(nearStart)))).toBe(false)
  })
})

describe('zones', () => {
  it('a point inside the active service area is in-zone', () => {
    // A point on the route is inside the big active zone.
    expect(isInActiveZone(DRIVER_ROUTE[3])).toBe(true)
  })
})