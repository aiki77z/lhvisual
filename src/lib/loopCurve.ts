export type Point = { x: number; y: number };

// The mark is one closed loop of line, pinned at its left extreme and turned over at its right,
// exactly the way a hand makes an infinity out of a rubber band. The turn is a real rotation of
// the ring about its own long axis, growing from none at the pinned end to half a turn at the
// turned end. Half a turn is what brings the upper strand under the lower one, so the line has
// crossed itself once and the ring has become the infinity.
//
//   a(t)  = w * PI * ( 1 + cos t ) / 2      the turn, none at the left end, half a turn at right
//   y(t)  = sin t * cos a(t)                the strand swinging through the page
//   z(t)  = sin t * sin a(t)                the same swing carried out of the page
//
// Because y and z are one rotation of the same swing, the line keeps its length and is never
// stretched or pinched: only its plane turns. The crossing is therefore a real over and under
// with genuine depth rather than a waist drawn to meet itself.
//
// The mark is held at the finished infinity and the whole of it is then turned about its long
// axis. A whole turn puts every point back where it started, so the movement closes on itself
// and carries straight on into the next turn: it advances for ever in one direction, with no end
// to settle into and nothing to reverse out of.

const CENTER_X = 21;
const CENTER_Y = 16;
// The tangled mark spans the logo box, x 4..38 and y 8..24. Released, it draws in to a broad
// ring that still carries the mark's width, so the logo keeps its presence beside the wordmark
// instead of shrinking to a dot at one end of the breath.
const TANGLED_HALF_WIDTH = 17;
const TANGLED_HALF_HEIGHT = 8;

const TWO_PI = Math.PI * 2;
const SAMPLES = 240;
// Eye distance in units of the loop's own radius. Far enough that the two lobes stay matched,
// near enough that the strand swinging toward the viewer still gains a little weight.
const FOCAL = 16;

// The turn at which the loop has become the infinity: half a turn at the far end, which is
// exactly the point where the line has passed through itself once.
export const TANGLED_TWIST = 1;

type Spatial = { x: number; y: number; z: number };

// The extent of the mark measured over a whole turn rather than at rest. Held to a constant
// scale the mark keeps one size as it rotates, and taking the widest reach of the whole turn
// means the lobes never grow past the box when they swing broadside to the eye.
const REST_MAX_X = 1.002;
const REST_MAX_Y = 1.002;

function twistedPoint(t: number, twist: number): Spatial {
  const swing = Math.sin(t);
  const turn = (twist * Math.PI * (1 + Math.cos(t))) / 2;
  return { x: Math.cos(t), y: swing * Math.cos(turn), z: swing * Math.sin(turn) };
}

// Turns the finished mark about its own long axis. The x axis runs the length of the mark and is
// left alone, so the silhouette keeps its full width all the way round; what turns is the plane
// the two lobes lie in, which trades which lobe is nearer the eye and carries the crossing over
// and under. A whole turn returns every point to where it began, so the travel closes on itself
// exactly and can advance for ever without reversing or jumping at the seam.
function project(p: Spatial, roll: number) {
  const c = Math.cos(roll);
  const s = Math.sin(roll);
  const y = p.y * c - p.z * s;
  const z = p.z * c + p.y * s;
  const k = FOCAL / (FOCAL - z);
  return { x: p.x * k, y: y * k, z };
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

// The mark keeps one size as it turns, so the box it is fitted into is fixed rather than
// measured per frame.
export function makeLoopFrame(twist: number, roll: number): LoopFrame {
  const raw: { x: number; y: number; z: number }[] = [];

  for (let index = 0; index < SAMPLES; index += 1) {
    raw.push(project(twistedPoint((index / SAMPLES) * TWO_PI, twist), roll));
  }

  // Rescaling the loop to fill its box on every frame would stretch the shape back out as it
  // turned away from the eye, and the turn would read as a shape being squashed and pulled
  // rather than as a solid mark rotating in depth.
  const scaleX = TANGLED_HALF_WIDTH / REST_MAX_X;
  const scaleY = TANGLED_HALF_HEIGHT / REST_MAX_Y;

  const toScreen = (p: { x: number; y: number }) => ({
    x: CENTER_X + p.x * scaleX,
    y: CENTER_Y + p.y * scaleY,
  });

  const point = (u: number) => toScreen(project(twistedPoint(u * TWO_PI, twist), roll));
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

  const depth = (u: number) => project(twistedPoint(u * TWO_PI, twist), roll).z;

  return {
    path: spline(screen, true),
    back: backRuns.map((r) => spline(r, false)).join(""),
    front: frontRuns.map((r) => spline(r, false)).join(""),
    point,
    tangent,
    depth,
  };
}

// One whole turn every ~7s.
const ROLL_PERIOD_MS = 7000;

// The mark is held at the infinity and never unfolds, so it is always the shape the site is
// named for. The movement is the turn alone.
export function twistAt(_elapsedMs: number) {
  return TANGLED_TWIST;
}

// The angle only ever advances, and a whole turn puts every point back where it started, so the
// travel joins up with itself and carries straight on into the next turn. There is no end to
// ease into and nothing to reverse out of, which is what makes the movement continuous rather
// than a swing that runs out and comes back.
export function yawAt(elapsedMs: number) {
  return ((elapsedMs % ROLL_PERIOD_MS) / ROLL_PERIOD_MS) * TWO_PI;
}
