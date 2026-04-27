type Point = { x: number; y: number };

const CONSTELLATIONS: Record<string, Point[]> = {
  polaris: [
    { x: 50, y: 10 },
    { x: 50, y: 35 },
    { x: 30, y: 50 },
    { x: 70, y: 50 },
    { x: 50, y: 75 },
    { x: 50, y: 92 },
  ],
  vega: [
    { x: 30, y: 20 },
    { x: 60, y: 30 },
    { x: 75, y: 55 },
    { x: 50, y: 70 },
    { x: 25, y: 60 },
  ],
  sirius: [
    { x: 50, y: 15 },
    { x: 25, y: 45 },
    { x: 75, y: 45 },
    { x: 35, y: 75 },
    { x: 65, y: 75 },
  ],
  lyra: [
    { x: 50, y: 12 },
    { x: 30, y: 40 },
    { x: 70, y: 40 },
    { x: 35, y: 75 },
    { x: 65, y: 75 },
  ],
};

const LINES: Record<string, [number, number][]> = {
  polaris: [[0, 1], [1, 2], [1, 3], [1, 4], [4, 5]],
  vega: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 0]],
  sirius: [[0, 1], [0, 2], [1, 3], [2, 4], [3, 4]],
  lyra: [[0, 1], [0, 2], [1, 2], [1, 3], [2, 4], [3, 4]],
};

export function Constellation({
  name,
  color,
  size = 90,
}: {
  name: keyof typeof CONSTELLATIONS;
  color: string;
  size?: number;
}) {
  const points = CONSTELLATIONS[name];
  const lines = LINES[name];

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className="opacity-90"
      aria-hidden
    >
      {lines.map(([a, b], i) => (
        <line
          key={i}
          x1={points[a].x}
          y1={points[a].y}
          x2={points[b].x}
          y2={points[b].y}
          stroke={color}
          strokeWidth="0.5"
          opacity="0.4"
        />
      ))}
      {points.map((p, i) => (
        <circle
          key={i}
          cx={p.x}
          cy={p.y}
          r={i === 0 ? 2.2 : 1.5}
          fill={color}
        />
      ))}
    </svg>
  );
}
