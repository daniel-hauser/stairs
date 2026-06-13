import type { ReactNode } from 'react'

export interface ControlGroupProps {
  children: ReactNode
  variant?: 'rise' | 'podest' | 'summary'
}

export function ControlGroup({
  children,
  variant = 'rise',
}: ControlGroupProps) {
  return (
    <div className={`control-group control-group--${variant}`}>
      {children}
    </div>
  )
}
