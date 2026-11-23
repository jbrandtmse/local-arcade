// Vendored from C:/git/moonpatrol HEAD 49c351910af742a86cf97987bc474bb4d7d8da40
// (Story 1.5; owner's own single-author original work). Vendored as-is:
// All tunable game values live here (see docs/PLAN.md).
// Scoring values reproduce the original 1980 Moon Patrol instruction manual table.
// Columns are [Beginner, Champion]; null means "not listed / no points".

export const CFG = {
  view: {
    W: 640, H: 360,
    GROUND_Y: 300,        // y of the ground surface (buggy bottom rests here)
    HUD_TOP: 46,          // playfield starts below this
    HUD_BOTTOM: 352,      // bottom bar starts here
  },

  // ---- course structure ----
  sectionLen: 1800,       // world px per letter section (A..Z)
  letters: 26,
  majors: [4, 9, 14, 19, 25],   // E, J, O, T, Z: new stage + time evaluation
  parTime: 59,            // best possible time between majors (arcade fact)
  avgTime: 75,            // "average time" per 5-letter segment (bonus if better)
  courseAvgTime: 340,     // "average time" for a full A-Z course
  courses: { beginner: 0, champion: 1 },

  // ---- buggy physics ----
  buggy: {
    w: 34, h: 20,
    slow: 100,            // px/s (can never stop)
    fast: 190,
    accel: 260,           // px/s toward target speed
    jumpV: 355,           // upward launch velocity
    grav: 985,
    fireCd: 0.55,         // s between volleys
    invuln: 2.0,          // s of invulnerability after respawn
    respawnDelay: 1.6,    // s of death pause
    fallOverlap: 14,      // px of crater overlap that drops the buggy in
  },

  bullets: { fwdV: 320, fwdTtl: 0.6, upV: 640 },

  // ---- fuel (home-port feature the user requested) ----
  fuel: {
    max: 100,
    drainSlow: 0.62,      // units/s at slow speed
    drainFast: 1.15,
    minorRefill: 25,      // at each letter checkpoint
    majorRefill: 100,     // at E J O T Z
  },

  // ---- scoring (from the arcade manual) ----
  score: {
    craterSmall:   [50, null],
    craterLarge:   [100, null],
    rockSmall:     [50, 100],
    rockMedium:    [80, 100],
    rockBigHit:    [100, 100],   // first hit on double rock
    rockBigKill:   [200, 200],   // destroyed after half
    rockHalfPassed:[100, 180],   // half-destroyed then passed/jumped
    boulder:       [100, 50],
    plant:         [100, 100],
    plantBonus:    [300, 500, 800],
    tank:          [100, 200],
    ufo:           [100, 100],   // manual lists X/100; we pay in both courses
    craterUfo:     [200, 200],
    formation:     [500, 800, 1000],  // 3/4/5 saucers destroyed together
    rearCar:       [500, 800, 1000],  // varies per manual
    lander:        [150, 150],   // home-port feature: our chosen value
    segmentBase:   [1000, 2000],
    perSecondBetter: 100,
    courseBonus:   5000,
  },
  extraLives: [10000, 30000, 50000],
  startLives: 3,

  // ---- hazard sizes ----
  crater: {
    smallMin: 26, smallMax: 34,
    largeMin: 40, largeMax: 48,   // must stay clearable at slow speed (tested)
  },
  minObstacleGap: 300,            // keep ground hazards this far apart

  // ---- enemies ----
  ufo: {
    w: 36, h: 14,
    speedMin: 35, speedMax: 75,   // drift leftwards (px/s, world)
    hoverYMin: 62, hoverYMax: 115,
    bombCd: [1.6, 2.6],           // bomber / crater-ufos
    diveCd: [2.2, 3.4],           // rammer dive trigger
    bombFallV: 150,
  },
  lander: {
    w: 26, h: 24, sink: 13,       // px/s downward; game over on touchdown
    spawnAhead: 380,
    hp: 1,
  },
  hover: {                        // rear attacking vehicle (arcade: "enemy car")
    w: 44, h: 13,
    wait: [2.0, 3.2],             // s stalking behind before charge
    chargeV: 290,
    hp: 1,
  },
  tank: {
    w: 42, h: 24, hp: 2,
    range: 300, shellV: 150, shellCd: 2.8,
  },
  rock: {
    sizes: [
      { w: 16, h: 13, hp: 1 },    // small
      { w: 24, h: 17, hp: 1 },    // medium
      { w: 34, h: 22, hp: 2 },    // double (becomes half/hp1 after first hit)
    ],
  },
  mine: { w: 15, h: 12 },
  boulder: { r: 13, rollV: 55, aggro: 350 },
  plant: { w: 18, h: 26, hp: 1 },
  craterMakerBomb: { halfWidth: 22 },  // created crater half-width

  // ---- warning lights (lookahead distance in px) ----
  warn: { saucer: 620, mine: 620, behind: 900 },

  // ---- difficulty per letter index (0..25) and course multiplier ----
  density: {
    crater:   (L) => 0.35 + L * 0.03,
    rock:     (L) => 0.5 + L * 0.045,
    mineFrom: 9,    // J
    boulderFrom: 6, // G
    plantFrom: 7,   // H
    tankFrom: 14,   // O
    largeCraterFrom: 5, // F
    doubleRockFrom: 8,  // I
    championMult: 1.55,
  },
  spawnEventFrom: {
    rammer: 2,      // C
    craterUfo: 8,   // I
    formation: 3,   // D, every ~4th letter
    lander: 1,      // B and onward
    hover: 4,       // E, then roughly every 5th letter
  },

  // ---- stage themes (change at major checkpoints) ----
  themes: [
    { name: 'DAY',   sky: ['#3d4f78', '#6c5a86'], mount: '#2a2c4a', mountLit: '#3b3e63', hill: '#20223c', hillLit: '#31345a', ground: '#8a8fa3', groundDark: '#5c6072', stars: 0.0 },
    { name: 'DUSK',  sky: ['#4a2545', '#a0502e'], mount: '#33203c', mountLit: '#4a2e52', hill: '#251828', hillLit: '#372440', ground: '#9a7f6e', groundDark: '#665348', stars: 0.15 },
    { name: 'NIGHT', sky: ['#04050e', '#0b1030'], mount: '#141a33', mountLit: '#1f2747', hill: '#0d1124', hillLit: '#161c38', ground: '#6d7186', groundDark: '#454958', stars: 1.0 },
    { name: 'DAWN',  sky: ['#16213e', '#3f7282'], mount: '#1c2a44', mountLit: '#2a3b5c', hill: '#141e33', hillLit: '#1f2c48', ground: '#7e8496', groundDark: '#4f5464', stars: 0.4 },
    { name: 'INFERNO', sky: ['#2a0a12', '#7a2020'], mount: '#2e1420', mountLit: '#45202f', hill: '#220e18', hillLit: '#331522', ground: '#8f6d60', groundDark: '#5e473e', stars: 0.1 },
  ],
  championThemeShift: 2, // champion course starts at a darker theme index
};

// convenience helpers (pure)
export function scoreFor(courseIndex, key, alt = 0) {
  const row = CFG.score[key];
  if (row == null) return alt;
  const v = courseIndex <= CFG.courses.beginner ? row[0] : row[1];
  return v == null ? alt : v;
}

export function themeFor(courseIndex, stage) {
  const shift = courseIndex > CFG.courses.beginner ? CFG.championThemeShift : 0;
  return CFG.themes[(stage + shift) % CFG.themes.length];
}
