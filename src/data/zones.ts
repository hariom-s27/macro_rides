import type { LngLat } from '../engine/types'

// Service zones = polygons where Macro Rides operates.
// Hand-drawn to sit over Koramangala, with the boundary deliberately crossing
// the driver's corridor so the zone filter visibly excludes some in-corridor pickups.
// Each polygon is a closed ring of [lng,lat]; first point repeated at the end.

export type Zone = {
  id: string
  name: string
  active: boolean
  polygon: LngLat[]   // closed ring
}

export const ZONES: Zone[] = [
  {
    id: 'z1',
    name: 'Koramangala Core',
    active: true,
    // A box covering the western + central part of the route.
    // Its eastern edge (~77.622) cuts across the corridor → east-side pickups
    // fall OUTSIDE this zone.
    polygon: [
      [77.6040, 12.9280],
      [77.6220, 12.9280],
      [77.6220, 12.9430],
      [77.6040, 12.9430],
      [77.6040, 12.9280], // close the ring
    ],
  },
  {
    id: 'z2',
    name: 'ST Bed / East',
    active: false,  // inactive → pickups here are NOT eligible (shows active vs inactive)
    polygon: [
      [77.6220, 12.9280],
      [77.6360, 12.9280],
      [77.6360, 12.9430],
      [77.6220, 12.9430],
      [77.6220, 12.9280],
    ],
  },
]