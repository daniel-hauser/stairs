import type { CSSProperties } from 'react'

interface SliderWithStepperProps {
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

export function SliderWithStepper({
  min,
  max,
  step,
  value,
  onChange,
  onDecrease,
  onIncrease,
  inputClassName = 'slider-track',
  inputStyle,
}: SliderWithStepperProps) {
  return (
    <div className="slider-inline">
      <button className="slider-step-btn" type="button" onClick={onDecrease}>-</button>
      <input
        className={inputClassName}
        style={inputStyle}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
      />
      <button className="slider-step-btn" type="button" onClick={onIncrease}>+</button>
    </div>
  )
}
