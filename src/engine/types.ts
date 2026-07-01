// The single source of truth for our core geospatial types.
// LOCKED RULE: internally, every coordinate is [longitude, latitude].

/** A single position: [longitude, latitude]. Longitude first, always. */
export type LngLat = [number, number]

/** A route is an ordered list of positions — a polyline. */
export type Route = LngLat[]

/** A pickup request at a fixed location, with a stable id. */
export interface Pickup {
  id: number
  position: LngLat
}