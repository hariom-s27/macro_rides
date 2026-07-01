import type { LngLat } from '../engine/types'

export interface Zone {
  id: string
  name: string
  active: boolean
  polygon: LngLat[] // ring of [lng,lat]; first ≈ last
}

/** Service areas over the Koramangala route. Zone A's southern edge deliberately
 *  cuts across the corridor so some in-corridor pickups fall OUTSIDE it. */
export const ZONES: Zone[] = [
  {
    id: 'zone-a',
    name: 'Koramangala Core',
    active: true,
    polygon: [
      [77.6090, 12.9345],
      [77.6320, 12.9345], // this northern band's lower edge slices the corridor
      [77.6320, 12.9420],
      [77.6090, 12.9420],
      [77.6090, 12.9345],
    ],
  },
  {
    id: 'zone-b',
    name: 'South Extension',
    active: true,
    polygon: [
      [77.6120, 12.9260],
      [77.6300, 12.9260],
      [77.6300, 12.9345],
      [77.6120, 12.9345],
      [77.6120, 12.9260],
    ],
  },
]