export interface StepCounterProps {
  steps: number
  pairs: number
  onDecrease: () => void
  onIncrease: () => void
  canDecrease: boolean
  canIncrease: boolean
}

export function StepCounter({
  steps,
  pairs,
  onDecrease,
  onIncrease,
  canDecrease,
  canIncrease,
}: StepCounterProps) {
  return (
    <div className="stepper-buttons">
      <button
        className="slider-step-btn"
        type="button"
        onClick={onDecrease}
        disabled={!canDecrease}
      >
        -
      </button>
      <span className="stepper-display">
        {steps} / {pairs}
      </span>
      <button
        className="slider-step-btn"
        type="button"
        onClick={onIncrease}
        disabled={!canIncrease}
      >
        +
      </button>
    </div>
  )
}
