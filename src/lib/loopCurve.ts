export type Point = { x: number; y: number };

// The mark is one closed loop of line, pinned at its left extreme and turned over at its right,
// exactly the way a hand makes an infinity out of a rubber band. The turn is a real rotation of
// the ring about its own long axis, growing from none at the pinned end to half a turn at the
// turned end. Half a turn is what brings the upper strand under the lower one, so at the end of
// the travel the line has crossed itself once and the ring has become the infinity.
//
//   a(t)  = w * PI * ( 1 + cos t ) / 2      the turn, none at the left end, half a turn at right
//   y(t)  = sin t * cos a(t)                the strand swinging through the page
//   z(t)  = sin t * sin a(t)                the same swing carried out of the page
//
// Because y and z are one rotation of the same swing, the line keeps its length and is never
// stretched or pinched: only its plane turns. The crossing is therefore a real over and under
// with genuine depth rather than a waist drawn to meet itself, and w carries the loop from the
// ring at 0 to the finished mark at 1 without any blend between two different shapes.
//
// The turn is anchored at one end, so the loop is its own mirror top to bottom at every stage
// but not left to right until it arrives. That is the true shape of folding a ring once, and it
// is what lets the finished mark be a clean infinity instead of a pinched waist.

const CENTER_X = 21;
const CENTER_Y = 16;
// The tangled mark spans the logo box, x 4..38 and y 8..24. Released, it draws in to a broad
// ring that still carries the mark's width, so the logo keeps its presence beside the wordmark
// instead of shrinking to a dot at one end of the breath.
const TANGLED_HALF_WIDTH = 17;
const TANGLED_HALF_HEIGHT = 8;
const RELEASED_HALF_WIDTH = 11.5;
const RELEASED_HALF_HEIGHT = 9.6;

const TWO_PI = Math.PI * 2;
const SAMPLES = 240;
// Eye distance in units of the loop's own radius. Far enough that the two lobes stay matched,
// near enough that the strand swinging toward the viewer still gains a little weight.
const FOCAL = 16;

// The turn at which the loop has become the infinity: half a turn at the far end, which is
// exactly the point where the line has passed through itself once.
export const TANGLED_TWIST = 1;

type Spatial = { x: number; y: number; z: number };

function twistedPoint(t: number, twist: number): Spatial {
  const swing = Math.sin(t);
  const turn = (twist * Math.PI * (1 + Math.cos(t))) / 2;
  return { x: Math.cos(t), y: swing * Math.cos(turn), z: swing * Math.sin(turn) };
}

function project(p: Spatial, yaw: number) {
  const c = Math.cos(yaw);
  const s = Math.sin(yaw);
  const x = p.x * c + p.z * s;
  const z = p.z * c - p.x * s;
  const k = FOCAL / (FOCAL - z);
  return { x: x * k, y: p.y * k, z };
}

export type LoopFrame = {
  path: string;
  back: string;
  front: string;
  point: (u: number) => Point;
  tangent: (u: number) => Point;
  depth: (u: number) => number;
};

function fmt(value: number) {
  return value.toFixed(2);
}

// Catmull-Rom through the samples, written out as cubic beziers.
function spline(points: Point[], closed: boolean) {
  if (points.length < 2) return "";
  const count = points.length;
  const commands = [`M${fmt(points[0].x)} ${fmt(points[0].y)}`];
  const last = closed ? count : count - 1;

  for (let index = 0; index < last; index += 1) {
    const p0 = points[closed ? (index - 1 + count) % count : Math.max(0, index - 1)];
    const p1 = points[index % count];
    const p2 = points[(index + 1) % count];
    const p3 = points[closed ? (index + 2) % count : Math.min(count - 1, index + 2)];
    commands.push(
      `C${fmt(p1.x + (p2.x - p0.x) / 6)} ${fmt(p1.y + (p2.y - p0.y) / 6)} ` +
        `${fmt(p2.x - (p3.x - p1.x) / 6)} ${fmt(p2.y - (p3.y - p1.y) / 6)} ` +
        `${fmt(p2.x)} ${fmt(p2.y)}`,
    );
  }

  return closed ? `${commands.join("")}Z` : commands.join("");
}

// The loop is drawn wide when tangled and draws in as it releases, so the box it is fitted
// into travels with the shape. The diagram spans two fixed docks, so it passes holdWidth to
// keep the loop meeting its connectors at every point of the breath.
export function makeLoopFrame(twist: number, yaw: number, holdWidth = false): LoopFrame {
  const raw: { x: number; y: number; z: number }[] = [];
  let maxX = 1e-6;
  let maxY = 1e-6;

  for (let index = 0; index < SAMPLES; index += 1) {
    const p = project(twistedPoint((index / SAMPLES) * TWO_PI, twist), yaw);
    raw.push(p);
    maxX = Math.max(maxX, Math.abs(p.x));
    maxY = Math.max(maxY, Math.abs(p.y));
  }

  const open = 1 - Math.min(1, Math.max(0, twist / TANGLED_TWIST));
  const halfWidth = holdWidth
    ? TANGLED_HALF_WIDTH
    : TANGLED_HALF_WIDTH + (RELEASED_HALF_WIDTH - TANGLED_HALF_WIDTH) * open;
  const halfHeight = TANGLED_HALF_HEIGHT + (RELEASED_HALF_HEIGHT - TANGLED_HALF_HEIGHT) * open;
  const scaleX = halfWidth / maxX;
  const scaleY = halfHeight / maxY;

  const toScreen = (p: { x: number; y: number }) => ({
    x: CENTER_X + p.x * scaleX,
    y: CENTER_Y + p.y * scaleY,
  });

  const point = (u: number) => toScreen(project(twistedPoint(u * TWO_PI, twist), yaw));
  const tangent = (u: number) => {
    const step = 1 / SAMPLES;
    const a = point(u - step);
    const b = point(u + step);
    const length = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    return { x: (b.x - a.x) / length, y: (b.y - a.y) / length };
  };

  const screen = raw.map(toScreen);

  // Split the loop where it passes through the plane of the page. Drawing the far side first
  // and the near side over it lets the crossing read as one line passing in front of itself,
  // which is what makes it a line being twisted rather than a shape being reshaped.
  const backRuns: Point[][] = [];
  const frontRuns: Point[][] = [];
  let run: Point[] = [];
  let runIsBack = raw[0].z < 0;

  for (let index = 0; index <= SAMPLES; index += 1) {
    const at = index % SAMPLES;
    const isBack = raw[at].z < 0;
    if (isBack !== runIsBack && run.length > 1) {
      run.push(screen[at]);
      (runIsBack ? backRuns : frontRuns).push(run);
      run = [screen[(at - 1 + SAMPLES) % SAMPLES]];
      runIsBack = isBack;
    }
    run.push(screen[at]);
  }
  if (run.length > 1) (runIsBack ? backRuns : frontRuns).push(run);

  const depth = (u: number) => project(twistedPoint(u * TWO_PI, twist), yaw).z;

  return {
    path: spline(screen, true),
    back: backRuns.map((r) => spline(r, false)).join(""),
    front: frontRuns.map((r) => spline(r, false)).join(""),
    point,
    tangent,
    depth,
  };
}

// One breath every ~7s at the base rate.
const BASE_RATE = Math.PI / 7000;
// A second term at an incommensurate rate stretches and compresses that breath. The phase
// still only ever advances, so the loop never reverses into the shape it just left, and the
// two rates never realign, so no two breaths take the same time and there is no beat to catch.
const DRIFT_RATIO = 0.618;
const DRIFT_DEPTH = 0.42;
// How much of the breath is spent at the finished mark. The infinity is what the site is named
// for, so the loop rests there and only passes through the open ring on its way back.
const DWELL = 0.62;

// Returns 0 at the ring and TANGLED_TWIST at the infinity. The cosine turns the advancing phase
// around smoothly at each end, so the loop settles into both states and leaves them without a
// corner. Raising the settled value to a power under one holds the travel near the finished mark
// and hurries it through the open ring, so the loop reads as an infinity that breathes rather
// than as a ring and a mark given equal billing.
export function twistAt(elapsedMs: number) {
  const turn = BASE_RATE * elapsedMs;
  const phase = turn + DRIFT_DEPTH * Math.sin(turn * DRIFT_RATIO);
  const settled = (1 - Math.cos(phase)) / 2;
  return Math.pow(settled, 1 - DWELL) * TANGLED_TWIST;
}

// The turn is carried out of the page by the rotation itself, so the loop already shows its
// depth head on. Swinging the viewpoint as well would tip the finished mark off its axis and
// cost the level footing the wordmark sits on.
export function yawAt(_elapsedMs: number) {
  return 0;
}
