import { useState } from 'react'
import Map, { useControl } from 'react-map-gl/maplibre'
import { MapboxOverlay } from '@deck.gl/mapbox'
import type { MapboxOverlayProps } from '@deck.gl/mapbox'
import { PathLayer, ScatterplotLayer, GeoJsonLayer } from '@deck.gl/layers'
import { DRIVER_ROUTE } from './data/route'
import { PICKUPS } from './data/pickups'
import { buildCorridor, driverPosition, routeLengthMeters } from './engine/corridor'
import type { LngLat, Pickup } from './engine/types'
import 'maplibre-gl/dist/maplibre-gl.css'
import './App.css'

const INITIAL_VIEW = { longitude: 77.6210, latitude: 12.9370, zoom: 14.5 }

function DeckGLOverlay(props: MapboxOverlayProps) {
  const overlay = useControl(() => new MapboxOverlay(props))
  overlay.setProps(props)
  return null
}

function App() {
  const routeLen = routeLengthMeters(DRIVER_ROUTE)      // metres
  const [driverM, setDriverM] = useState(0)             // driver distance along route (metres)
  const driver = driverPosition(DRIVER_ROUTE, driverM)
  // Build the corridor (recomputes as the driver moves).
  const corridor = buildCorridor(DRIVER_ROUTE, driverM)

  const layers = [
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
      getFillColor: [110, 110, 110],
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
        background: 'rgba(255,255,255,0.92)', padding: '10px 14px',
        borderRadius: 8, fontFamily: 'system-ui, sans-serif', fontSize: 14,
      }}>
        Driver: {(driverM / 1000).toFixed(2)} km / {(routeLen / 1000).toFixed(2)} km
        <input
          type="range" min={0} max={routeLen} step={10}
          value={driverM}
          onChange={(e) => setDriverM(Number(e.target.value))}
          style={{ width: '100%' }}
        />
      </div>
    </>
  )
}

export default App