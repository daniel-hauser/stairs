import { useDeferredValue, useMemo, useState, type CSSProperties } from 'react'
import './App.css'
import { StairScene } from './components/StairScene.tsx'
import { StairProfile2D } from './components/StairProfile2D'
import { STAIR_DEFAULTS, STAIR_FORMULA } from './constants/stairDefaults'

function inferNumRises(rise: number) {
  const topFloorRise = 289
  const targetRiseToFloor = topFloorRise - rise
  let numRises = Math.max(1, Math.round(targetRiseToFloor / rise))
  let belowFloor = numRises * rise - targetRiseToFloor
  if (belowFloor > rise && numRises > 1) {
    numRises -= 1
    belowFloor = numRises * rise - targetRiseToFloor
  }
  if (belowFloor < -(rise / 2)) {
    numRises += 1
  }
  return numRises
}

function App() {
  const [rise, setRise] = useState(STAIR_DEFAULTS.rise)
  const [run, setRun] = useState(STAIR_DEFAULTS.run)
  const [startSideLeft, setStartSideLeft] = useState(STAIR_DEFAULTS.startSideLeft)
  const [showLabels, setShowLabels] = useState(true)

  const deferredRise = useDeferredValue(rise)
  const deferredRun = useDeferredValue(run)
  const deferredStartSideLeft = useDeferredValue(startSideLeft)

  // Keep UI numbers responsive while letting heavy 2D/3D redraws settle asynchronously.
  const numRises = inferNumRises(rise)
  const deferredNumRises = useMemo(() => inferNumRises(deferredRise), [deferredRise])

  // Calculate derived values
  const totalRise = rise * numRises
  const totalRun = (run / 2) * numRises
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

  return (
    <main className="app">
      {/* Controls Section */}
      <section className="control-section">
        <div className="stats-card">
          {/* Control Sliders */}
          <div className="stats-grid">
            <div className="stat stat-wide quick-actions">
              <div className="controls-mini">
                <button
                  className="button mini"
                  onClick={() => {
                    setRise(STAIR_DEFAULTS.rise)
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
                  title="Toggle measurement labels"
                >
                  dim
                </button>
              </div>
            </div>
            <div className="stat stat-wide">
              <span className="k">Individual rise ({rise.toFixed(2)} cm)</span>
              <div style={{ marginTop: '6px', display: 'grid' }}>
                <input 
                  className="range-safe"
                  style={rangeStyle(10, 30, riseSafeMin, riseSafeMax)}
                  type="range" 
                  min="10" 
                  max="30" 
                  step="0.0625" 
                  value={rise}
                  onChange={(e) => setRise(parseFloat(e.target.value))}
                />
              </div>
            </div>
            <div className="stat stat-wide">
              <span className="k">Usable tread run (L/R) ({run.toFixed(2)} cm)</span>
              <div style={{ marginTop: '6px', display: 'grid' }}>
                <input 
                  className="range-safe"
                  style={rangeStyle(20, 35, runSafeMin, runSafeMax)}
                  type="range" 
                  min="20" 
                  max="35" 
                  step="0.0667" 
                  value={run}
                  onChange={(e) => setRun(parseFloat(e.target.value))}
                />
              </div>
            </div>
            <div className="stat">
              <span className="k">Total rise</span>
              <span className="v">{totalRise.toFixed(1)} cm</span>
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
            </div>
            <div className="stat">
              <span className="k">Concrete volume</span>
              <span className="v">{concreteVolume.toFixed(3)} m3</span>
            </div>
          </div>
        </div>
      </section>

      {/* 3D View Section */}
      <section className="three-wrap">
        <div className="viz-card">
          <div className="viz-header">
            <div>
              <h2>3D view</h2>
            </div>
          </div>
          <div className="three-shell">
            <StairScene
              rise={deferredRise}
              run={deferredRun}
              numRises={deferredNumRises}
              startSideLeft={deferredStartSideLeft}
              headspaceCm={200}
              showLabels={showLabels}
            />
          </div>
        </div>
      </section>

      {/* 2D Plot Section */}
      <section className="viz-wrap">
        <div className="viz-card">
          <div className="svg-shell">
            <StairProfile2D
              rise={deferredRise}
              run={deferredRun}
              numRises={deferredNumRises}
              startSideLeft={deferredStartSideLeft}
            />
          </div>
        </div>
      </section>
    </main>
  )
}

export default App
