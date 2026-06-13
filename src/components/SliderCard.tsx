import type { CSSProperties } from 'react'
import { SliderWithStepper } from './SliderWithStepper.tsx'

export interface SliderCardProps {
  label: string
  min: number
  max: number
  step: number
  value: number
  onChange: (value: number) => void
  onDecrease: () => void
  onIncrease: () => void
  inputClassName?: string
  inputStyle?: CSSProperties
}

export function SliderCard({
  label,
  min,
  max,
  step,
  value,
  onChange,
  onDecrease,
  onIncrease,
  inputClassName,
  inputStyle,
}: SliderCardProps) {
  return (
    <div className="stat slider-card">
      <span className="k">{label}</span>
      <SliderWithStepper
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={onChange}
        onDecrease={onDecrease}
        onIncrease={onIncrease}
        inputClassName={inputClassName}
        inputStyle={inputStyle}
      />
    </div>
  )
}
