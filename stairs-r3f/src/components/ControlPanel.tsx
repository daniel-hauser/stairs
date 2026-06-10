/**
 * Control panel for stair parameters
 */
import { validateStairFormula, calculateConcreteVolume, buildStairGeometry } from '../lib/stairGeometry';
import { STAIR_DEFAULTS, STAIR_FORMULA } from '../constants/stairDefaults';
import './ControlPanel.css';

interface ControlPanelProps {
  rise: number;
  setRise: (value: number) => void;
  run: number;
  setRun: (value: number) => void;
  numRises: number;
  setNumRises: (value: number) => void;
  startSideLeft: boolean;
  setStartSideLeft: (value: boolean) => void;
}

export function ControlPanel({
  rise,
  setRise,
  run,
  setRun,
  numRises,
  setNumRises,
  startSideLeft,
  setStartSideLeft,
}: ControlPanelProps) {
  // Calculate derived values
  const geometry = buildStairGeometry({ rise, run, numRises, startSideLeft });
  const concreteVolume = calculateConcreteVolume(geometry.totalRun, geometry.totalRise);
  const formulaValidation = validateStairFormula(geometry.formula, STAIR_FORMULA.min, STAIR_FORMULA.max);

  const handleReset = () => {
    setRise(STAIR_DEFAULTS.rise);
    setRun(STAIR_DEFAULTS.run);
    setNumRises(STAIR_DEFAULTS.numRises);
    setStartSideLeft(STAIR_DEFAULTS.startSideLeft);
  };

  return (
    <div className="control-panel">
      <h2>Stair Parameters</h2>

      <div className="control-group">
        <label htmlFor="rise">Individual Rise (cm)</label>
        <input
          id="rise"
          type="range"
          min="10"
          max="30"
          step="0.0625"
          value={rise}
          onChange={(e) => setRise(parseFloat(e.target.value))}
        />
        <span className="value">{rise.toFixed(2)}</span>
      </div>

      <div className="control-group">
        <label htmlFor="run">Usable Tread Run (cm)</label>
        <input
          id="run"
          type="range"
          min="20"
          max="35"
          step="0.0667"
          value={run}
          onChange={(e) => setRun(parseFloat(e.target.value))}
        />
        <span className="value">{run.toFixed(2)}</span>
      </div>

      <div className="control-group">
        <label htmlFor="numRises">Number of Rises</label>
        <input
          id="numRises"
          type="range"
          min="5"
          max="25"
          step="1"
          value={numRises}
          onChange={(e) => setNumRises(parseInt(e.target.value, 10))}
        />
        <span className="value">{numRises}</span>
      </div>

      <div className="control-group checkbox">
        <label htmlFor="startSide">
          <input
            id="startSide"
            type="checkbox"
            checked={startSideLeft}
            onChange={(e) => setStartSideLeft(e.target.checked)}
          />
          Step 2 starts on left (cyan)
        </label>
      </div>

      <button onClick={handleReset} className="reset-btn">
        Reset to Defaults
      </button>

      {/* Validation & Results */}
      <div className="results-panel">
        <h3>Validation</h3>
        <div className={`formula-status ${formulaValidation.valid ? 'valid' : 'invalid'}`}>
          <strong>Stair Formula (2R+T):</strong> {geometry.formula.toFixed(1)} cm
          <br />
          {formulaValidation.message}
        </div>

        <div className="metrics">
          <div>
            <strong>Total Run:</strong> {geometry.totalRun.toFixed(1)} cm
          </div>
          <div>
            <strong>Total Rise:</strong> {geometry.totalRise.toFixed(1)} cm
          </div>
          <div>
            <strong>Concrete Volume:</strong> {concreteVolume.toFixed(3)} m³
          </div>
        </div>
      </div>
    </div>
  );
}
