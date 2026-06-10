/**
 * Stair geometry builder - pure computational module
 * Generates 3D geometry data based on stair parameters
 */

interface StairGeometry {
  steps: StepGeometry[];
  totalRun: number;
  totalRise: number;
  formula: number;
}

interface StepGeometry {
  index: number;
  riseValue: number;
  runValue: number;
  x: number; // Position along run
  y: number; // Vertical position
  phase: 'left' | 'right';
  width: number;
  depth: number;
  height: number;
}

interface StairParams {
  rise: number;
  run: number;
  numRises: number;
  startSideLeft: boolean;
}

/**
 * Build stair geometry with proper alternation logic
 * Each pair: one left step + one right step, each offset by run/2
 */
export function buildStairGeometry(params: StairParams): StairGeometry {
  const { rise, run, numRises, startSideLeft } = params;
  const steps: StepGeometry[] = [];

  let x = 0; // Horizontal accumulator
  let y = 0; // Vertical accumulator

  for (let i = 0; i < numRises; i++) {
    // Determine phase (alternating left/right)
    const isEven = i % 2 === 0;
    const phase = startSideLeft
      ? isEven
        ? 'left'
        : 'right'
      : isEven
        ? 'right'
        : 'left';

    // Each phase advances by rise + (run/2)
    // On even steps (phase 1): advance by rise + run/2
    // On odd steps (phase 2): advance by rise + run/2
    const runAdvance = run / 2;

    steps.push({
      index: i,
      riseValue: rise,
      runValue: run,
      x,
      y,
      phase,
      width: 30, // Tread width (depth in Y)
      depth: run, // Tread depth (length in X)
      height: rise,
    });

    // Advance position: rise vertically + run/2 horizontally
    y += rise;
    x += runAdvance;
  }

  const totalRun = x;
  const totalRise = y;
  const formula = 2 * rise + run; // 2R + T

  return { steps, totalRun, totalRise, formula };
}

/**
 * Calculate concrete carrier geometry (the supporting volume under stairs)
 */
export function calculateConcreteVolume(
  totalRun: number,
  totalRise: number,
  width: number = 30
): number {
  // Simplified: treat as triangular prism
  // Volume = 0.5 * base * height * width
  const volume = (0.5 * totalRun * totalRise * width) / 1_000_000; // Convert cm³ to m³
  return volume;
}

/**
 * Validate stair design against formula rule
 */
export function validateStairFormula(
  formula: number,
  min: number = 60,
  max: number = 63
): { valid: boolean; message: string } {
  if (formula < min) {
    return {
      valid: false,
      message: `Formula ${formula.toFixed(1)} is too low (min ${min})`,
    };
  }
  if (formula > max) {
    return {
      valid: false,
      message: `Formula ${formula.toFixed(1)} is too high (max ${max})`,
    };
  }
  return {
    valid: true,
    message: `Formula ${formula.toFixed(1)} is optimal (${min}–${max})`,
  };
}
