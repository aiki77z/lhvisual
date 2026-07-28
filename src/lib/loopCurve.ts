export type Point = { x: number; y: number };

// Cassini ovals: the locus of points whose distances to two foci multiply to a constant.
// At m = 1 the curve is the lemniscate of Bernoulli, which is the infinity symbol, its two
// lobes meeting in a clean X. Raise m and the crossing opens into a pinched waist, the waist
// fills, and the curve settles into an oval. Every value of m is one closed curve that is
// symmetric left to right and top to bottom, so the mark stays balanced the whole way across
// rather than passing through the lopsided in-between shapes a blend of two drawings gives.
//
//   r(theta)^2 = cos 2*theta + sqrt(cos^2 2*theta + m^4 - 1)
//
// The curve is drawn in the logo's own coordinate box, spanning x 4..38 around a centre at
// (21, 16), which is the mark as it has always been drawn.

const CENTER_X = 21;
const CENTER_Y = 16;
// The tangled mark spans the logo box, x 4..38 and y 8..24. Released, it draws in to a broad
// ring that still carries the mark's width, so the logo keeps its presence beside the wordmark
// instead of shrinking to a dot at one end of the breath.
const TANGLED_HALF_WIDTH = 17;
const TANGLED_HALF_HEIGHT = 8;
const RELEASED_HALF_WIDTH = 11.5;
const RELEASED_HALF_HEIGHT = 9.6;

export const LOOP_PERIOD = Math.PI * 2;

const TANGLED_M = 1.0;
// Far enough out that the curve is round on its own terms, so the released mark reads as a
// ring rather than as a wide shape squeezed into one.
const RELEASED_M = 3.0;

export const TANGLED_TWIST = 0;

function shapeM(twist: number) {
  const t = Math.min(1, Math.max(0, twist));
  // The silhouette changes fastest just off the crossing and barely at all once the curve is
  // round, so the parameter is held back early and allowed to run late. That spreads the
  // visible change evenly over the breath instead of racing past the shapes worth seeing.
  return TANGLED_M + (RELEASED_M - TANGLED_M) * t ** 3;
}

function radius(theta: number, k: number) {
  const u = Math.cos(2 * theta);
  return Math.sqrt(Math.max(0, u + Math.sqrt(u * u + k)));
}

export type LoopExtent = {
  k: number;
  scaleX: number;
  scaleY: number;
  rightT: number;
};

// The mark is drawn wide when tangled and draws in as it releases, so the box it is fitted
// into travels with the shape. The raw curve is measured each frame and mapped onto that box,
// which keeps the silhouette on the mark's own proportions at both ends instead of letting the
// released state flatten into a stadium. The diagram spans two fixed docks, so it passes
// holdWidth to keep the loop meeting its connectors at every point of the breath.
export function loopExtent(twist: number, holdWidth = false, samples = 240): LoopExtent {
  const t = Math.min(1, Math.max(0, twist));
  const m = shapeM(t);
  const k = m ** 4 - 1;
  let maxX = 0;
  let maxY = 0;

  for (let index = 0; index < samples; index += 1) {
    const theta = (index / samples) * LOOP_PERIOD;
    const r = radius(theta, k);
    maxX = Math.max(maxX, Math.abs(r * Math.cos(theta)));
    maxY = Math.max(maxY, Math.abs(r * Math.sin(theta)));
  }

  const halfWidth = holdWidth
    ? TANGLED_HALF_WIDTH
    : TANGLED_HALF_WIDTH + (RELEASED_HALF_WIDTH - TANGLED_HALF_WIDTH) * t;
  const halfHeight = TANGLED_HALF_HEIGHT + (RELEASED_HALF_HEIGHT - TANGLED_HALF_HEIGHT) * t;

  return {
    k,
    scaleX: maxX > 1e-6 ? halfWidth / maxX : halfWidth,
    scaleY: maxY > 1e-6 ? halfHeight / maxY : halfHeight,
    rightT: 0,
  };
}

export function loopPoint(theta: number, _twist: number, extent: LoopExtent): Point {
  const r = radius(theta, extent.k);
  return {
    x: CENTER_X + r * Math.cos(theta) * extent.scaleX,
    y: CENTER_Y + r * Math.sin(theta) * extent.scaleY,
  };
}

export function loopVelocity(theta: number, _twist: number, extent: LoopExtent): Point {
  const u = Math.cos(2 * theta);
  const s = Math.sqrt(u * u + extent.k);
  const r = radius(theta, extent.k);
  // From differentiating r^2 = u + s, with u' = -2 sin 2*theta.
  const dr = r > 1e-6 ? (-2 * Math.sin(2 * theta) * (1 + u / s)) / (2 * r) : 0;
  return {
    x: (dr * Math.cos(theta) - r * Math.sin(theta)) * extent.scaleX,
    y: (dr * Math.sin(theta) + r * Math.cos(theta)) * extent.scaleY,
  };
}

function fmt(value: number) {
  return value.toFixed(2);
}

// Cubic Hermite from the analytic tangent, so the drawn path sits on the real curve instead
// of on a spline guessed from the samples.
export function loopPath(twist: number, samples = 96) {
  const extent = loopExtent(twist);
  const step = LOOP_PERIOD / samples;
  const start = loopPoint(0, twist, extent);
  const commands = [`M${fmt(start.x)} ${fmt(start.y)}`];

  for (let index = 0; index < samples; index += 1) {
    const t0 = index * step;
    const t1 = t0 + step;
    const p0 = loopPoint(t0, twist, extent);
    const p1 = loopPoint(t1, twist, extent);
    const v0 = loopVelocity(t0, twist, extent);
    const v1 = loopVelocity(t1, twist, extent);
    commands.push(
      `C${fmt(p0.x + (v0.x * step) / 3)} ${fmt(p0.y + (v0.y * step) / 3)} ` +
        `${fmt(p1.x - (v1.x * step) / 3)} ${fmt(p1.y - (v1.y * step) / 3)} ` +
        `${fmt(p1.x)} ${fmt(p1.y)}`,
    );
  }

  return `${commands.join("")}Z`;
}

// One breath every ~11s at the base rate.
const BASE_RATE = Math.PI / 11000;
// A second term at an incommensurate rate stretches and compresses that breath. The phase
// still only ever advances, so the mark never reverses into the shape it just left, and the
// two rates never realign, so no two breaths take the same time and there is no beat to catch.
const DRIFT_RATIO = 0.618;
const DRIFT_DEPTH = 0.42;

// Returns 0 at the crossing and 1 at the ring. The cosine turns the advancing phase around
// smoothly at each end, so the mark settles into both states and leaves them without a corner.
export function twistAt(elapsedMs: number) {
  const turn = BASE_RATE * elapsedMs;
  const phase = turn + DRIFT_DEPTH * Math.sin(turn * DRIFT_RATIO);
  return (1 - Math.cos(phase)) / 2;
}
