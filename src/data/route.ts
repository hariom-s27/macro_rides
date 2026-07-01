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

/** Alternate route — a smoother southern path through Koramangala for the re-route demo. */
export const ALT_ROUTE: LngLat[] = [
  [77.6108, 12.9335],
  [77.6135, 12.9318],
  [77.6165, 12.9305],
  [77.6198, 12.9298],
  [77.6232, 12.9302],
  [77.6265, 12.9315],
  [77.6292, 12.9332],
  [77.6312, 12.9350],
]

export const ROUTES: LngLat[][] = [DRIVER_ROUTE, ALT_ROUTE]