import type { LngLat } from '../engine/types'

// Service zones = polygons where Macro Rides operates.
// The active zone covers the whole route generously (driver is always in-service).
// A small INACTIVE carve-out sits across the corridor's east end, so a few
// in-corridor+ahead pickups there get excluded — the visible "zone does work" proof.
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
    name: 'Koramangala Service Area',
    active: true,
    // Wide box covering the ENTIRE route + ~600m margin all around,
    // so the driver is inside an active zone for the whole trip.
    polygon: [
      [77.5985, 12.9250],
      [77.6395, 12.9250],
      [77.6395, 12.9420],
      [77.5985, 12.9420],
      [77.5985, 12.9250],
    ],
  },
  {
    id: 'z2',
    name: 'Restricted Pocket (inactive)',
    active: false,
    // Small inactive rectangle straddling the corridor near the east/mid section.
    // Pickups inside this pocket are excluded even when in-corridor & ahead.
    polygon: [
      [77.6250, 12.9330],
      [77.6320, 12.9330],
      [77.6320, 12.9385],
      [77.6250, 12.9385],
      [77.6250, 12.9330],
    ],
  },
]