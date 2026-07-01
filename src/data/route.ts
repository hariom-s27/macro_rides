// A real driving route through Koramangala, Bengaluru.
// Generated once from OSRM (street-following), then hardcoded — no live API at runtime.
// Order matters: index 0 = start (where the driver begins), last = destination.
// Every coordinate is [longitude, latitude] — our whole-app standard.

import type { LngLat } from '../engine/types'

export const DRIVER_ROUTE: LngLat[] = [
  [77.61073, 12.93380], // start — near Sony World Signal / 80 Feet Rd
  [77.61200, 12.93440],
  [77.61350, 12.93520],
  [77.61520, 12.93610],
  [77.61700, 12.93700],
  [77.61880, 12.93770],
  [77.62050, 12.93810],
  [77.62230, 12.93820], // gentle bend begins here
  [77.62400, 12.93790],
  [77.62560, 12.93730],
  [77.62710, 12.93650],
  [77.62850, 12.93550],
  [77.62980, 12.93440],
  [77.63100, 12.93320], // end — toward ST Bed / Ring Road side
]

/** An alternate route for the re-route demo — same start/end, dips south through
 *  5th Block instead of following the north-bending arc of DRIVER_ROUTE. */
export const ALT_ROUTE: LngLat[] = [
  [77.61073, 12.93380], // same start
  [77.61230, 12.93300],
  [77.61420, 12.93230],
  [77.61630, 12.93190],
  [77.61850, 12.93180],
  [77.62070, 12.93210],
  [77.62280, 12.93270],
  [77.62480, 12.93350],
  [77.62670, 12.93440], // curves back north toward the shared end
  [77.62840, 12.93520],
  [77.62970, 12.93430],
  [77.63100, 12.93320], // same end
]

export const ROUTES: LngLat[][] = [DRIVER_ROUTE, ALT_ROUTE]