import { describe, it, expect } from 'vitest'
import { pointToLineDistance, point, lineString } from '@turf/turf'
import { eligibleBruteForce } from './eligibility'
import { queryEligibleH3, buildPickupIndex } from './h3'
import { routeLengthMeters } from './corridor'
import { DRIVER_ROUTE } from '../data/route'
import { PICKUPS } from '../data/pickups'
import type { Route, Pickup } from './types'

// A controlled east-west route at constant latitude. Because it's horizontal,
// the perpendicular distance to any point is a PURE north-south offset, which
// we can compute by hand: delta_degrees × metres-per-degree-latitude.
const LAT = 12.93
const ROUTE: Route = [[77.60, LAT], [77.62, LAT]] // ~2.17 km, due east
const R = 6371008.8                                // Turf's sphere radius (metres)
const M_PER_DEG_LAT = (R * Math.PI) / 180          // ≈ 111,195 m — the hand constant

describe('GROUND TRUTH: exact distance matches an independent hand calculation (gap #2)', () => {
  it('a point 0.003° north of the route is ~333.6 m away', () => {
    const p = point([77.61, LAT + 0.003])
    const measured = pointToLineDistance(p, lineString(ROUTE), { units: 'meters' })
    const byHand = 0.003 * M_PER_DEG_LAT // ≈ 333.6 m, computed with zero reference to Turf
    expect(Math.abs(measured - byHand)).toBeLessThan(2) // agree to within 2 m
  })
})

describe('the 350 m threshold', () => {
  it('a pickup ~300 m out is eligible; ~400 m out is not', () => {
    const near: Pickup = { id: 1, position: [77.61, LAT + 0.0027] } // 0.0027 × 111195 ≈ 300 m
    const far: Pickup = { id: 2, position: [77.61, LAT + 0.0036] }  // ≈ 400 m
    const set = eligibleBruteForce(ROUTE, 0, [near, far])
    expect(set.has(1)).toBe(true)
    expect(set.has(2)).toBe(false)
  })
})

describe('isAhead is the discriminator (direction, not distance)', () => {
  it('of two pickups equidistant from the driver, only the one AHEAD is eligible', () => {
    const driverM = 1083 // ~halfway along the 2167 m route (driver at ~lng 77.61)
    const behind: Pickup = { id: 3, position: [77.6095, LAT + 0.0009] } // west of driver
    const ahead: Pickup = { id: 4, position: [77.6105, LAT + 0.0009] }  // east of driver
    const set = eligibleBruteForce(ROUTE, driverM, [behind, ahead])
    expect(set.has(4)).toBe(true)  // ahead + within 350 m → eligible
    expect(set.has(3)).toBe(false) // behind + within 350 m → excluded ONLY because of direction
  })
})

describe('THE INVARIANT: H3 index == brute-force truth, everywhere on the real route', () => {
  it('matches at 50 driver positions along the curved Koramangala route', () => {
    const index = buildPickupIndex(PICKUPS)
    const len = routeLengthMeters(DRIVER_ROUTE)
    for (let i = 0; i <= 50; i++) {
      const d = (len * i) / 50
      const brute = [...eligibleBruteForce(DRIVER_ROUTE, d, PICKUPS)].sort((a, b) => a - b)
      const h3 = [...queryEligibleH3(DRIVER_ROUTE, d, PICKUPS, index).eligible].sort((a, b) => a - b)
      expect(h3).toEqual(brute) // exact set equality at every position
    }
  })
})