import { useState, useMemo, useEffect, useRef } from 'react'
import Map, { useControl } from 'react-map-gl/maplibre'
import { MapboxOverlay } from '@deck.gl/mapbox'
import type { MapboxOverlayProps } from '@deck.gl/mapbox'
import { PathLayer, ScatterplotLayer, GeoJsonLayer, PolygonLayer } from '@deck.gl/layers'
import { H3HexagonLayer } from '@deck.gl/geo-layers'
import { ROUTES } from './data/route'
import { PICKUPS } from './data/pickups'
import { ZONES } from './data/zones'
import { buildCorridor, driverPosition, routeLengthMeters, aheadSlice } from './engine/corridor'
import { buildPickupIndex, queryEligibleH3, cellToRing, buildDemandHeatmap } from './engine/h3'
import { eligibleBruteForce, detourMeters } from './engine/eligibility'
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
  const [routeIdx, setRouteIdx] = useState(0)
  const activeRoute = ROUTES[routeIdx]
  const routeLen = routeLengthMeters(activeRoute)
  const [driverM, setDriverM] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [showGrid, setShowGrid] = useState(false)
  const [showHeatmap, setShowHeatmap] = useState(false)
  const routeLenRef = useRef(routeLen)
  routeLenRef.current = routeLen

  const demand = useMemo(() => buildDemandHeatmap(PICKUPS), [])
  const maxDemand = useMemo(() => Math.max(1, ...demand.map((d) => d.count)), [demand])

  const driver = driverPosition(activeRoute, driverM)
  const corridor = buildCorridor(activeRoute, driverM)
  const brute = eligibleBruteForce(activeRoute, driverM, PICKUPS, ZONES)
  const h3 = useMemo(
    () => queryEligibleH3(activeRoute, driverM, PICKUPS, pickupIndex, ZONES),
    [activeRoute, driverM, pickupIndex],
  )
  const matches = setsEqual(brute, h3.eligible)

  // Rank eligible pickups by detour cost (cheapest first).
  const slice = aheadSlice(activeRoute, driverM)
  const ranked = PICKUPS
    .filter((p) => h3.eligible.has(p.id))
    .map((p) => ({ pickup: p, detour: detourMeters(slice, p) }))
    .sort((a, b) => a.detour - b.detour)

  const rankById = new globalThis.Map<number, number>()
  ranked.forEach((r, i) => rankById.set(r.pickup.id, i + 1))

  // Self-driving loop
  useEffect(() => {
    if (!playing) return
    const STEP_M = 15
    const TICK_MS = 100
    const id = setInterval(() => {
      setDriverM((prev) => {
        const next = prev + STEP_M
        if (next >= routeLenRef.current) {
          setPlaying(false)
          return routeLenRef.current
        }
        return next
      })
    }, TICK_MS)
    return () => clearInterval(id)
  }, [playing])

  const layers = [
    showHeatmap && new H3HexagonLayer<{ hex: string; count: number }>({
      id: 'demand-heatmap',
      data: demand,
      getHexagon: (d) => d.hex,
      // pale yellow → deep orange as demand rises (colour-blind-safe warm ramp)
      getFillColor: (d) => {
        const t = d.count / maxDemand           // 0..1
        return [235, 185 - t * 110, 70, 55]     // alpha 55 (was 140) — streets stay visible
      },
      extruded: false,
      stroked: true,
      getLineColor: [200, 140, 40, 70],          // fainter outline too
      lineWidthMinPixels: 1,
      pickable: false,
    }),
    new PolygonLayer<typeof ZONES[number]>({
      id: 'zones',
      data: ZONES,
      getPolygon: (z) => z.polygon,
      getFillColor: (z) => (z.active ? [40, 160, 90, 25] : [150, 150, 150, 20]),
      getLineColor: (z) => (z.active ? [40, 160, 90, 200] : [150, 150, 150, 160]),
      getLineWidth: 3,
      lineWidthMinPixels: 2,
      stroked: true,
      filled: true,
    }),
    // H3 candidate hexagons — the visible broad phase (toggle)
    showGrid && new PolygonLayer({
      id: 'h3-grid',
      data: h3.candidateCells,
      getPolygon: (cell: string) => cellToRing(cell),
      getFillColor: [255, 140, 0, 30],     // faint orange fill
      getLineColor: [120, 120, 120, 60],   // soft grey outlines — readable, not dark
      getLineWidth: 1,
      lineWidthMinPixels: 1,
      stroked: true,
      filled: true,
      updateTriggers: { getPolygon: [h3.candidateCells] },
    }),
    corridor && new GeoJsonLayer({
      id: 'corridor',
      data: corridor,
      getFillColor: [30, 90, 200, 40],
      getLineColor: [30, 90, 200, 120],
      lineWidthMinPixels: 1,
    }),
    new PathLayer<{ path: LngLat[] }>({
      id: 'driver-route',
      data: [{ path: activeRoute }],
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
      getFillColor: (d: Pickup) => {
        if (!h3.eligible.has(d.id)) return [110, 110, 110]
        const rank = rankById.get(d.id) ?? 99
        return rank <= 3 ? [220, 60, 20] : [230, 150, 60]
      },
      updateTriggers: { getFillColor: [driverM, ranked.length] },
      getRadius: 30,
      radiusMinPixels: 4,
      radiusMaxPixels: 10,
      stroked: true,
      getLineColor: [255, 255, 255],
      lineWidthMinPixels: 1,
    }),
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
        mapStyle="https://basemaps.cartocdn.com/gl/positron-gl-style/style.json"
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
        {ranked.length > 0 && (
          <div style={{ fontSize: 12, color: '#333', marginBottom: 8 }}>
            <b>Best pickups (least detour):</b>{' '}
            {ranked.slice(0, 3).map((r, i) => (
              <span key={r.pickup.id} style={{ marginRight: 12 }}>
                #{i + 1} — pickup {r.pickup.id} (~{Math.round(r.detour)}m)
              </span>
            ))}
          </div>
        )}
        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          <button
            onClick={() => setPlaying((p) => !p)}
            style={{
              padding: '6px 14px', borderRadius: 6, border: 'none',
              background: playing ? '#c0392b' : '#0a7d2c', color: '#fff',
              fontWeight: 600, cursor: 'pointer',
            }}
          >
            {playing ? '❚❚ Pause' : '▶ Play'}
          </button>
          <button
            onClick={() => { setPlaying(false); setDriverM(0) }}
            style={{
              padding: '6px 14px', borderRadius: 6, border: '1px solid #ccc',
              background: '#fff', cursor: 'pointer',
            }}
          >
            ↺ Reset
          </button>
          <button
            onClick={() => {
              setRouteIdx((i) => (i + 1) % ROUTES.length)
              setDriverM(0) // restart the driver on the new route
            }}
            style={{
              padding: '6px 12px', borderRadius: 6, border: '1px solid #ccc',
              background: '#2b6cb0', color: '#fff', cursor: 'pointer', fontWeight: 600,
            }}
          >
            Re-route
          </button>
          <button
            onClick={() => setShowGrid((s) => !s)}
            style={{
              padding: '6px 14px', borderRadius: 6, border: '1px solid #ccc',
              background: showGrid ? '#ffe8cc' : '#fff', cursor: 'pointer',
            }}
          >
            {showGrid ? '⬡ Hide H3 grid' : '⬡ Show H3 grid'}
          </button>
          <button
            onClick={() => setShowHeatmap((v) => !v)}
            style={{
              padding: '6px 12px', borderRadius: 6, border: '1px solid #ccc',
              background: showHeatmap ? '#e67817' : '#fff',
              color: showHeatmap ? '#fff' : '#333', cursor: 'pointer', fontWeight: 600,
            }}
          >
            {showHeatmap ? 'Hide' : 'Show'} demand heatmap
          </button>
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