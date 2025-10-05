export const MAX_PLANETS = 20;
export const TRANSIT_ALIGNMENT_THRESHOLD = 0.985;
export const HISTORY_MAX = 220;

export const MATERIAL_MAP = {
  earth: 0,
  gas: 1,
  lava: 2
};

export const INITIAL_PLANETS = [
  {
    name: 'Kepler-A',
    size: 0.9,
    distance: 8,
    speed: 0.016,
    color: 0x4fc3f7,
    glow: 0.22,
    materialType: 'earth'
  },
  {
    name: 'Kepler-B',
    size: 1.6,
    distance: 14,
    speed: 0.0085,
    color: 0xff6b6b,
    glow: 0.34,
    materialType: 'gas'
  }
];

export const ANALYSIS_CONSTANTS = {
  G: 6.6743e-11,
  R_SUN: 6.96e8,
  AU: 1.496e11,
  T_SUN: 5772,
  F_EARTH: 1366,
  HAB_MIN: 0.8,
  HAB_MAX: 1.5,
  ROCKY: 1.75,
  SUPER: 2.5
};
