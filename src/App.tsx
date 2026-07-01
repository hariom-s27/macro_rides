import { useState, useMemo } from 'react'
import Map, { useControl } from 'react-map-gl/maplibre'
import { MapboxOverlay } from '@deck.gl/mapbox'
import type { MapboxOverlayProps } from '@deck.gl/mapbox'
import { PathLayer, ScatterplotLayer, GeoJsonLayer, PolygonLayer } from '@deck.gl/layers'
import { DRIVER_ROUTE } from './data/route'
import { PICKUPS } from './data/pickups'
import { ZONES } from './data/zones'
import { buildCorridor, driverPosition, routeLengthMeters } from './engine/corridor'
import { buildPickupIndex, queryEligibleH3 } from './engine/h3'
import { eligibleBruteForce } from './engine/eligibility'
import type { LngLat, Pickup } from './engine/types'
import 'maplibre-gl/dist/maplibre-gl.css'
import './App.css'

const INITIAL_VIEW = { longitude: 77.6210, latitude: 12.9370, zoom: 14.5 }

function DeckGLOverlay(props: MapboxOverlayProps) {
  const overlay = useControl(() => new MapboxOverlay(props))
  overlay.setProps(props)
  return null
}

function setsEqual(a: Set<number>, b: Set<number>): boolean {
  if (a.size !== b.size) return false
  for (const x of a) if (!b.has(x)) return false
  return true
}

function App() {
  const pickupIndex = useMemo(() => buildPickupIndex(PICKUPS), [])
  const routeLen = routeLengthMeters(DRIVER_ROUTE)
  const [driverM, setDriverM] = useState(0)

  const driver = driverPosition(DRIVER_ROUTE, driverM)
  const corridor = buildCorridor(DRIVER_ROUTE, driverM)
  const brute = eligibleBruteForce(DRIVER_ROUTE, driverM, PICKUPS)
  const h3 = useMemo(
    () => queryEligibleH3(DRIVER_ROUTE, driverM, PICKUPS, pickupIndex),
    [driverM, pickupIndex],
  )
  const matches = setsEqual(brute, h3.eligible)

  const layers = [
    // zones — drawn at the very bottom
    new PolygonLayer({
      id: 'zones',
      data: ZONES,
      getPolygon: (z: any) => [z.polygon],
      getFillColor: (z: any) => (z.active ? [40, 160, 90, 25] : [150, 150, 150, 20]),
      getLineColor: (z: any) => (z.active ? [40, 160, 90, 200] : [150, 150, 150, 160]),
      getLineWidth: 3,
      lineWidthMinPixels: 2,
      stroked: true,
      filled: true,
    }),
    // corridor — drawn first, underneath everything. deck.gl skips falsy layers,
    // so if the slice is empty (driver at the very end) this just vanishes safely.
    corridor && new GeoJsonLayer({
      id: 'corridor',
      data: corridor,
      getFillColor: [30, 90, 200, 40],
      getLineColor: [30, 90, 200, 120],
      lineWidthMinPixels: 1,
    }),
    new PathLayer<{ path: LngLat[] }>({
      id: 'driver-route',
      data: [{ path: DRIVER_ROUTE }],
      getPath: (d) => d.path,
      getColor: [30, 90, 200],
      getWidth: 6,
      widthMinPixels: 3,
      capRounded: true,
      jointRounded: true,
    }),
    // pickups — still neutral grey; eligibility colouring is Step 14
    new ScatterplotLayer({
      id: 'pickups',
      data: PICKUPS,
      getPosition: (d: Pickup) => d.position,
      getFillColor: (d: Pickup) => (h3.eligible.has(d.id) ? [230, 120, 20] : [110, 110, 110]),
      updateTriggers: { getFillColor: [driverM] },
      getRadius: 30,
      radiusMinPixels: 4,
      radiusMaxPixels: 10,
      stroked: true,
      getLineColor: [255, 255, 255],
      lineWidthMinPixels: 1,
    }),
    // driver — drawn last so it sits on top
    new ScatterplotLayer<{ position: LngLat }>({
      id: 'driver',
      data: [{ position: driver }],
      getPosition: (d) => d.position,
      getFillColor: [20, 20, 20],
      getRadius: 8,
      radiusMinPixels: 6,
      radiusMaxPixels: 14,
      stroked: true,
      getLineColor: [255, 255, 255],
      lineWidthMinPixels: 2,
    }),
  ]

  return (
    <>
      <Map
        initialViewState={INITIAL_VIEW}
        mapStyle="https://tiles.openfreemap.org/styles/liberty"
        style={{ width: '100%', height: '100vh' }}
      >
        <DeckGLOverlay layers={layers as any} />
      </Map>

      <div style={{
        position: 'absolute', bottom: 20, left: 20, right: 20,
        background: 'rgba(255,255,255,0.97)',
        padding: '12px 16px',
        borderRadius: 10, fontFamily: 'system-ui, sans-serif', fontSize: 14,
        boxShadow: '0 2px 12px rgba(0,0,0,0.15)',
        zIndex: 10,
        pointerEvents: 'auto',
      }}>
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', marginBottom: 8 }}>
          <span><b>Driver</b> {(driverM / 1000).toFixed(2)} / {(routeLen / 1000).toFixed(2)} km</span>
          <span><b>Eligible</b> {h3.eligible.size}</span>
          <span><b>Checked</b> {h3.checked} of {h3.total} pickups</span>
          <span style={{ color: matches ? '#0a7d2c' : '#c0392b', fontWeight: 600 }}>
            {matches ? '✓ H3 matches brute-force truth' : '✗ MISMATCH — investigate'}
          </span>
        </div>
        <div style={{ fontSize: 12, color: '#555', marginBottom: 8 }}>
          The H3 index ran the exact test on only {h3.checked} of {h3.total} points and found the
          same {h3.eligible.size} eligible pickups brute force finds by testing all {h3.total}.
          Accuracy from geometry, speed from the index.
        </div>
        <input
          type="range" min={0} max={routeLen} step={10}
          value={driverM} onChange={(e) => setDriverM(Number(e.target.value))}
          style={{ width: '100%' }}
        />
      </div>
    </>
  )
}

export default App