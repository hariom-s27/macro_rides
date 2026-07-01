import Map, { useControl } from 'react-map-gl/maplibre'
import { MapboxOverlay } from '@deck.gl/mapbox'
import type { MapboxOverlayProps } from '@deck.gl/mapbox'
import { PathLayer, ScatterplotLayer, PolygonLayer } from '@deck.gl/layers'
import { DRIVER_ROUTE, type LngLat } from './data/route'
import { PICKUPS, type Pickup } from './data/pickups'
import { buildCorridor } from './engine/corridor'
import 'maplibre-gl/dist/maplibre-gl.css'
import './App.css'

const INITIAL_VIEW = { longitude: 77.6210, latitude: 12.9370, zoom: 14.5 }

// Driver sits at the start of the route for now (movement comes in Phase 5).
const DRIVER_POS: LngLat = DRIVER_ROUTE[0]

function DeckGLOverlay(props: MapboxOverlayProps) {
  const overlay = useControl(() => new MapboxOverlay(props))
  overlay.setProps(props)
  return null
}

function App() {
  // Build the corridor once (later this recomputes as the driver moves).
  const corridor = buildCorridor(DRIVER_ROUTE, DRIVER_POS)

  const layers = [
    // corridor first = drawn underneath everything
    corridor &&
      new PolygonLayer({
        id: 'corridor',
        data: [corridor],
        getPolygon: (f: any) => f.geometry.coordinates,
        getFillColor: [30, 90, 200, 40],   // translucent blue fill
        getLineColor: [30, 90, 200, 160],  // stronger blue outline
        getLineWidth: 2,
        lineWidthMinPixels: 1,
        stroked: true,
        filled: true,
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
  ].filter(Boolean)   // drop the corridor entry if it's null

  return (
    <Map
      initialViewState={INITIAL_VIEW}
      mapStyle="https://tiles.openfreemap.org/styles/liberty"
      style={{ width: '100%', height: '100vh' }}
    >
      <DeckGLOverlay layers={layers as any} />
    </Map>
  )
}

export default App