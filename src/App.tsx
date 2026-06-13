import { useDeferredValue, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import './App.css'
import { StairScene } from './components/StairScene.tsx'
import { StairProfile2D } from './components/StairProfile2D'
import { SliderWithStepper } from './components/SliderWithStepper.tsx'
import { STAIR_DEFAULTS, STAIR_FORMULA } from './constants/stairDefaults'

type ViewMode = '3d' | '2d'

function inferNumRises(rise: number, topPodestRise: number, bottomPodestHeight: number) {
  const topFloorRise = 289
  const targetFlightRise = Math.max(1, topFloorRise - topPodestRise - bottomPodestHeight)
  const rawCount = targetFlightRise / rise
  const roundedCount = Math.round(rawCount)
  if (Math.abs(rawCount - roundedCount) < 1e-6) {
    return Math.max(1, roundedCount)
  }
  const maxFlightRises = Math.floor(rawCount + 1e-9)
  return Math.max(1, maxFlightRises)
}

function App() {
  const mobileBreakpoint = '(max-width: 900px)'
  const [rise, setRise] = useState(STAIR_DEFAULTS.rise)
  const [topPodestRise, setTopPodestRise] = useState(STAIR_DEFAULTS.topPodestRise)
  const [bottomPodestHeight, setBottomPodestHeight] = useState(STAIR_DEFAULTS.bottomPodestHeight)
  const [run, setRun] = useState(STAIR_DEFAULTS.run)
  const [startSideLeft, setStartSideLeft] = useState(STAIR_DEFAULTS.startSideLeft)
  const [showLabels, setShowLabels] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>('3d')
  const [isMobile, setIsMobile] = useState<boolean>(() => window.matchMedia(mobileBreakpoint).matches)
  const [controlsOpen, setControlsOpen] = useState<boolean>(true)
  const swipeStartY = useRef<number | null>(null)

  useEffect(() => {
    const media = window.matchMedia(mobileBreakpoint)
    const handleChange = (event: MediaQueryListEvent) => {
      setIsMobile(event.matches)
    }

    setIsMobile(media.matches)
    media.addEventListener('change', handleChange)
    return () => media.removeEventListener('change', handleChange)
  }, [])

  const deferredRise = useDeferredValue(rise)
  const deferredTopPodestRise = useDeferredValue(topPodestRise)
  const deferredBottomPodestHeight = useDeferredValue(bottomPodestHeight)
  const deferredRun = useDeferredValue(run)
  const deferredStartSideLeft = useDeferredValue(startSideLeft)

  // Keep UI numbers responsive while letting heavy 2D/3D redraws settle asynchronously.
  const numRises = inferNumRises(rise, topPodestRise, bottomPodestHeight)
  const deferredNumRises = useMemo(
    () => inferNumRises(deferredRise, deferredTopPodestRise, deferredBottomPodestHeight),
    [deferredBottomPodestHeight, deferredRise, deferredTopPodestRise],
  )

  // Calculate derived values
  const totalRise = rise * numRises
  const totalRun = (run / 2) * numRises
  const targetFlightRise = Math.max(1, 289 - topPodestRise - bottomPodestHeight)
  const partialBottomRise = Math.max(0, targetFlightRise - totalRise)
  const entryRise = topPodestRise
  const floorRise = totalRise + partialBottomRise + entryRise + bottomPodestHeight
  const slope = Math.atan2(totalRise, totalRun) * (180 / Math.PI)
  const formula = 2 * rise + run
  const formulaStatus = formula >= STAIR_FORMULA.min && formula <= STAIR_FORMULA.max ? 'good' : formula > STAIR_FORMULA.max ? 'warn' : 'bad'
  const formulaDelta = formula < STAIR_FORMULA.min
    ? formula - STAIR_FORMULA.min
    : formula > STAIR_FORMULA.max
      ? formula - STAIR_FORMULA.max
      : 0
  const formulaLabel = formulaStatus === 'good'
    ? `${formula.toFixed(1)} cm ✅`
    : `${formula.toFixed(1)} cm (${formulaDelta >= 0 ? '+' : ''}${formulaDelta.toFixed(1)})`
  const concreteRiseCm = Math.max(0, totalRise - rise)
  const concreteGapToWallCm = 30
  const concreteTriangleAreaCm2 = 0.5 * concreteRiseCm * totalRun
  const concreteGapRectAreaCm2 = concreteRiseCm * concreteGapToWallCm
  const concreteVolume = ((concreteTriangleAreaCm2 + concreteGapRectAreaCm2) * 80) / 1000000

  const rangeStyle = (min: number, max: number, safeMin: number, safeMax: number) => {
    const clampedMin = Math.max(min, Math.min(max, safeMin))
    const clampedMax = Math.max(min, Math.min(max, safeMax))
    const startPct = ((Math.min(clampedMin, clampedMax) - min) / (max - min)) * 100
    const endPct = ((Math.max(clampedMin, clampedMax) - min) / (max - min)) * 100
    return {
      ['--safe-start' as const]: `${startPct}%`,
      ['--safe-end' as const]: `${endPct}%`,
    } as CSSProperties
  }

  const runSafeMin = STAIR_FORMULA.min - 2 * rise
  const runSafeMax = STAIR_FORMULA.max - 2 * rise
  const riseSafeMin = (STAIR_FORMULA.min - run) / 2
  const riseSafeMax = (STAIR_FORMULA.max - run) / 2

  const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v))
  const stepToHalf = (v: number) => Math.round(v * 2) / 2
  const adjustRise = (delta: number) => setRise((v) => stepToHalf(clamp(v + delta, 15, 27)))
  const adjustRun = (delta: number) => setRun((v) => stepToHalf(clamp(v + delta, 20, 30)))
  const adjustTopPodestRise = (delta: number) => setTopPodestRise((v) => stepToHalf(clamp(v + delta, 10, 35)))
  const adjustBottomPodest = (delta: number) => setBottomPodestHeight((v) => stepToHalf(clamp(v + delta, 0, 40)))
  const adjustStepCount = (delta: number) => {
    const minCount = Math.max(1, Math.ceil(targetFlightRise / 27 - 1e-9))
    const maxCount = Math.max(minCount, Math.floor(targetFlightRise / 15 + 1e-9))
    const targetCount = clamp(numRises + delta, minCount, maxCount)
    const formulaTarget = 2 * rise + run
    const nextRise = clamp(targetFlightRise / targetCount, 15, 27)
    const nextRun = stepToHalf(clamp(formulaTarget - (2 * nextRise), 20, 30))
    const testPartial = Math.max(0, targetFlightRise - nextRise * targetCount)
    if (testPartial > 0.15) return
    setRise(Number(nextRise.toFixed(4)))
    setRun(nextRun)
  }
  const canStepDown = numRises > 1 && (() => {
    const testMinCount = Math.max(1, Math.ceil(targetFlightRise / 27 - 1e-9))
    return numRises > testMinCount
  })()
  const canStepUp = (() => {
    const testMaxCount = Math.max(1, Math.floor(targetFlightRise / 15 + 1e-9))
    return numRises < testMaxCount
  })()

  const handleSheetPointerDown = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (event.pointerType === 'mouse') return
    swipeStartY.current = event.clientY
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const handleSheetPointerUp = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (event.pointerType === 'mouse') return
    if (swipeStartY.current == null) return
    const endY = event.clientY
    const deltaY = endY - swipeStartY.current
    if (deltaY < -22) {
      setControlsOpen(true)
    } else if (deltaY > 22) {
      setControlsOpen(false)
    }
    swipeStartY.current = null
  }

  return (
    <main className="app">
      <section className="viewport-stage">
        <div className="floating-toolbar">
          <div className="view-toggle" role="group" aria-label="View mode">
            <button
              type="button"
              className={`toggle-btn view-btn ${viewMode === '3d' ? 'active' : ''}`}
              onClick={() => setViewMode('3d')}
            >
              3D
            </button>
            <button
              type="button"
              className={`toggle-btn view-btn ${viewMode === '2d' ? 'active' : ''}`}
              onClick={() => setViewMode('2d')}
            >
              2D
            </button>
          </div>
          <button
            type="button"
            className="toggle-btn controls-btn"
            onClick={() => setControlsOpen((v) => !v)}
            title="Show or hide controls"
          >
            {controlsOpen ? 'hide' : 'controls'}
          </button>
        </div>

        <div className="view-shell">
          {viewMode === '3d' ? (
            <div className="three-shell full-view">
              <StairScene
                rise={deferredRise}
                topPodestRise={deferredTopPodestRise}
                bottomPodestHeight={deferredBottomPodestHeight}
                run={deferredRun}
                numRises={deferredNumRises}
                startSideLeft={deferredStartSideLeft}
                headspaceCm={200}
                showLabels={showLabels}
              />
            </div>
          ) : (
            <div className="svg-shell full-view">
              <StairProfile2D
                rise={deferredRise}
                run={deferredRun}
                numRises={deferredNumRises}
                startSideLeft={deferredStartSideLeft}
              />
            </div>
          )}
        </div>
      </section>

      <section className={`control-section ${controlsOpen ? 'open' : ''} ${isMobile ? 'mobile' : 'desktop'}`}>
        <div className="stats-card">
          {isMobile && (
            <button
              type="button"
              className="sheet-handle"
              onClick={() => setControlsOpen((v) => !v)}
              onPointerDown={handleSheetPointerDown}
              onPointerUp={handleSheetPointerUp}
              onPointerCancel={() => {
                swipeStartY.current = null
              }}
              aria-label="Expand or collapse controls"
            >
              <span className="sheet-pill" />
            </button>
          )}
          <div className="stats-grid">
            <div className="stat stat-wide quick-actions">
              <div className="controls-mini">
                <button
                  className="button mini"
                  onClick={() => {
                    setRise(STAIR_DEFAULTS.rise)
                    setTopPodestRise(STAIR_DEFAULTS.topPodestRise)
                    setBottomPodestHeight(STAIR_DEFAULTS.bottomPodestHeight)
                    setRun(STAIR_DEFAULTS.run)
                    setStartSideLeft(STAIR_DEFAULTS.startSideLeft)
                  }}
                >
                  Reset
                </button>
                <div className="side-toggle" role="group" aria-label="Starting side">
                  <button
                    className={`toggle-btn ${!startSideLeft ? 'active' : ''}`}
                    onClick={() => setStartSideLeft(false)}
                    type="button"
                  >
                    R
                  </button>
                  <button
                    className={`toggle-btn ${startSideLeft ? 'active' : ''}`}
                    onClick={() => setStartSideLeft(true)}
                    type="button"
                  >
                    L
                  </button>
                </div>
                <button
                  className={`toggle-btn ${showLabels ? 'active' : ''}`}
                  onClick={() => setShowLabels(v => !v)}
                  type="button"
                  title="Toggle labels"
                >
                  labels
                </button>
              </div>
            </div>

            <div className="stat slider-card">
              <span className="k">Individual rise ({rise.toFixed(2)} cm)</span>
              <SliderWithStepper
                min={15}
                max={27}
                step={0.5}
                value={rise}
                onChange={setRise}
                onDecrease={() => adjustRise(-0.5)}
                onIncrease={() => adjustRise(0.5)}
                inputClassName="range-safe slider-track"
                inputStyle={rangeStyle(15, 27, riseSafeMin, riseSafeMax)}
              />
            </div>

            <div className="stat slider-card">
              <span className="k">Usable tread run (L/R) ({run.toFixed(2)} cm)</span>
              <SliderWithStepper
                min={20}
                max={30}
                step={0.5}
                value={run}
                onChange={setRun}
                onDecrease={() => adjustRun(-0.5)}
                onIncrease={() => adjustRun(0.5)}
                inputClassName="range-safe slider-track"
                inputStyle={rangeStyle(20, 30, runSafeMin, runSafeMax)}
              />
            </div>

            <div className="stat slider-card">
              <span className="k">Top podest rise ({topPodestRise.toFixed(2)} cm)</span>
              <SliderWithStepper
                min={10}
                max={35}
                step={0.5}
                value={topPodestRise}
                onChange={setTopPodestRise}
                onDecrease={() => adjustTopPodestRise(-0.5)}
                onIncrease={() => adjustTopPodestRise(0.5)}
              />
            </div>

            <div className="stat slider-card">
              <span className="k">Bottom podest ({bottomPodestHeight.toFixed(2)} cm)</span>
              <SliderWithStepper
                min={0}
                max={40}
                step={0.5}
                value={bottomPodestHeight}
                onChange={setBottomPodestHeight}
                onDecrease={() => adjustBottomPodest(-0.5)}
                onIncrease={() => adjustBottomPodest(0.5)}
              />
            </div>

            <div className="stat">
              <span className="k">Total rise</span>
              <span className="v">{totalRise.toFixed(1)} cm</span>
            </div>
            <div className="stat">
              <span className="k">Rise to floor</span>
              <span className="v">{floorRise.toFixed(1)} cm</span>
            </div>
            <div className="stat">
              <span className="k">Total run</span>
              <span className="v">{totalRun.toFixed(1)} cm</span>
            </div>
            <div className="stat">
              <span className="k">Inclination</span>
              <span className="v">{slope.toFixed(1)}° ({totalRise.toFixed(1)} / {totalRun.toFixed(1)})</span>
            </div>
            <div className="stat">
              <span className="k">Stair formula (2R+T)</span>
              <span className={`v ${formulaStatus}`}>{formulaLabel}</span>
            </div>
            <div className="stat">
              <span className="k">Rises / pairs</span>
              <span className="v">{numRises} / {Math.ceil(numRises / 2)}</span>
              <div className="stepper-row">
                <button className="mini-step-btn" type="button" onClick={() => adjustStepCount(-1)} disabled={!canStepDown}>-</button>
                <button className="mini-step-btn" type="button" onClick={() => adjustStepCount(1)} disabled={!canStepUp}>+</button>
              </div>
            </div>
            <div className="stat">
              <span className="k">Concrete volume</span>
              <span className="v">{concreteVolume.toFixed(3)} m3</span>
            </div>
            <div className="stat">
              <span className="k">Bottom adjustment</span>
              <span className={`v ${partialBottomRise > 0.15 ? 'warn' : 'good'}`}>
                {partialBottomRise > 0.01 ? `partial +${partialBottomRise.toFixed(1)} cm` : 'none'}
              </span>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}

export default App
