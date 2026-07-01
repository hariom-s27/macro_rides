import Map, { useControl } from 'react-map-gl/maplibre'
import { MapboxOverlay } from '@deck.gl/mapbox'
import type { MapboxOverlayProps } from '@deck.gl/mapbox'
import { PathLayer, ScatterplotLayer } from '@deck.gl/layers'
import { DRIVER_ROUTE } from './data/route'
import { PICKUPS, type Pickup } from './data/pickups'
import 'maplibre-gl/dist/maplibre-gl.css'
import './App.css'

const INITIAL_VIEW = {
  longitude: 77.6210,
  latitude: 12.9370,
  zoom: 14.5,
}

function DeckGLOverlay(props: MapboxOverlayProps) {
  const overlay = useControl(() => new MapboxOverlay(props))
  overlay.setProps(props)
  return null
}

function App() {
  const layers = [
    // route (drawn first = underneath)
    new PathLayer({
      id: 'driver-route',
      data: [{ path: DRIVER_ROUTE }],
      getPath: (d: { path: number[][] }) => d.path,
      getColor: [30, 90, 200],       // blue
      getWidth: 6,
      widthMinPixels: 3,
      capRounded: true,
      jointRounded: true,
    }),
    // pickups (drawn after = on top)
    new ScatterplotLayer({
      id: 'pickups',
      data: PICKUPS,
      getPosition: (d: Pickup) => d.position,
      getFillColor: [110, 110, 110], // neutral grey — state unknown until Phase 4
      getRadius: 30,                 // metres
      radiusMinPixels: 4,            // never smaller than 4px
      radiusMaxPixels: 10,
      stroked: true,
      getLineColor: [255, 255, 255], // white outline so dots read on any background
      lineWidthMinPixels: 1,
    }),
  ]

  return (
    <Map
      initialViewState={INITIAL_VIEW}
      mapStyle="https://tiles.openfreemap.org/styles/liberty"
      style={{ width: '100%', height: '100vh' }}
    >
      <DeckGLOverlay layers={layers} />
    </Map>
  )
}

export default App