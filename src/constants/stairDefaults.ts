/**
 * Default stair design parameters
 */
export const STAIR_DEFAULTS = {
  rise: 18.0, // cm - Individual rise height (balanced with floor alignment)
  run: 26.0, // cm - Usable tread run tuned for 2R+T comfort band center
  totalRise: 270.0, // cm - Total vertical distance
  numRises: 15,
  startSideLeft: false, // Step 2 starts on left
  headspace: 200, // cm - Required vertical clearance above stair line
};

/**
 * Stair formula rule: 2R + T should be 60–63 cm
 * where R = rise, T = run
 */
export const STAIR_FORMULA = {
  min: 60,
  max: 63,
};

/**
 * Dimensions and positions
 */
export const DIMENSIONS = {
  basementCeiling: 215, // cm
  topFloorLevel: 289, // cm
  holeLevel: 233, // cm
  headroom: 200, // cm
  wallThickness: 50, // cm
  topStairRise: 50, // cm - Fixed top step rise component
  topStairTread: 30, // cm - Fixed top step tread component
};

/**
 * Material colors (Clawpilot theme)
 */
export const COLORS = {
  light: {
    bg: '#f7f4ef',
    accent: '#b11f4b',
    accentSoft: 'rgba(177, 31, 75, 0.08)',
    success: '#16a34a',
    text: '#242424',
  },
  dark: {
    bg: '#3d3b3a',
    accent: '#fd8ea1',
    accentSoft: 'rgba(253, 142, 161, 0.14)',
    success: '#4ade80',
    text: '#f5f5f5',
  },
  // 3D geometry colors
  stairRight: '#fd8ea1', // Magenta (phase 1)
  stairLeft: '#00d4ff', // Cyan (phase 2)
  concrete: '#ffeb3b', // Yellow
  wall: '#c0c0c0', // Silver/gray
  soil: '#8b7355', // Brown
  slab: '#d3d3d3', // Light gray
};

/**
 * 3D scene configuration
 */
export const SCENE_CONFIG = {
  cameraPosition: [400, 300, 400],
  cameraLookAt: [100, 100, 0],
  lightIntensity: 1,
  ambientIntensity: 0.6,
};
