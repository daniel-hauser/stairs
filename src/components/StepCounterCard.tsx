import { StepCounter } from './StepCounter.tsx'

export interface StepCounterCardProps {
  label: string
  steps: number
  pairs: number
  onDecrease: () => void
  onIncrease: () => void
  canDecrease: boolean
  canIncrease: boolean
}

export function StepCounterCard({
  label,
  steps,
  pairs,
  onDecrease,
  onIncrease,
  canDecrease,
  canIncrease,
}: StepCounterCardProps) {
  return (
    <div className="stat slider-card">
      <span className="k">{label}</span>
      <StepCounter
        steps={steps}
        pairs={pairs}
        onDecrease={onDecrease}
        onIncrease={onIncrease}
        canDecrease={canDecrease}
        canIncrease={canIncrease}
      />
    </div>
  )
}
