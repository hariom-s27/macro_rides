import Map, { useControl } from 'react-map-gl/maplibre'
import { MapboxOverlay } from '@deck.gl/mapbox'
import type { MapboxOverlayProps } from '@deck.gl/mapbox'
import { PathLayer } from '@deck.gl/layers'
import { DRIVER_ROUTE } from './data/route'
import 'maplibre-gl/dist/maplibre-gl.css'
import './App.css'

const driverRoutePath = DRIVER_ROUTE.reduce<number[]>((accumulator, [longitude, latitude]) => {
  accumulator.push(longitude, latitude)
  return accumulator
}, [])

const INITIAL_VIEW = {
  longitude: 77.6210,   // re-centered on the route's middle
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
    new PathLayer({
      id: 'driver-route',
      data: [{ path: driverRoutePath }],   // PathLayer wants a flat path geometry here
      getPath: (d: { path: number[] }) => d.path,
      getColor: [30, 90, 200],          // blue — the route (color-blind-safe)
      getWidth: 6,                      // width in metres
      widthMinPixels: 3,                // never thinner than 3px when zoomed out
      capRounded: true,
      jointRounded: true,
      _pathType: 'open',
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