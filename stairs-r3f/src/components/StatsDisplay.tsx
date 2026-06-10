/**
 * Display key stair design metrics
 */

interface StatsDisplayProps {
  rise: number
  run: number
  numRises: number
  startSideLeft: boolean
}

export function StatsDisplay({ rise, run, numRises, startSideLeft }: StatsDisplayProps) {
  const totalRise = rise * numRises
  const totalRun = (run / 2) * numRises // alternating stairs use half-run per rise
  const slope = Math.atan2(totalRise, totalRun) * (180 / Math.PI)
  const formula = 2 * rise + run
  const concreteVolume = (totalRun * totalRise * 30) / 1000000 // m³ (simplified)
  
  const formulaStatus = formula >= 60 && formula <= 63 ? 'good' : formula > 63 ? 'warn' : 'bad'

  return (
    <div className="stats-grid">
      <div className="stat">
        <span className="k">Computed total run</span>
        <span className="v">{totalRun.toFixed(1)} cm</span>
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
        <span className="v">{slope.toFixed(1)}°</span>
      </div>
      <div className="stat">
        <span className="k">Stair formula</span>
        <span className={`v ${formulaStatus}`}>{formula.toFixed(2)} cm</span>
      </div>
      <div className="stat">
        <span className="k">Rises / pairs</span>
        <span className="v">{numRises}</span>
      </div>
      <div className="stat">
        <span className="k">Concrete volume</span>
        <span className="v">{concreteVolume.toFixed(2)} m³</span>
      </div>
      <div className="stat">
        <span className="k">Phase start</span>
        <span className="v">{startSideLeft ? 'Left (red)' : 'Right (cyan)'}</span>
      </div>
    </div>
  )
}
