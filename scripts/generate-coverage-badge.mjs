import { mkdir, readFile, writeFile } from "node:fs/promises";

const summaryPath =
  process.argv[2] ?? "backend/coverage/coverage-summary.json";

const outputPath =
  process.argv[3] ?? "badges/coverage.svg";

const summary = JSON.parse(
  await readFile(summaryPath, "utf8"),
);

const percentage = summary.total.lines.pct;
const message = `${percentage.toFixed(2)}%`;

const color =
  percentage >= 90
    ? "#4c1"
    : percentage >= 80
      ? "#97ca00"
      : percentage >= 70
        ? "#dfb317"
        : percentage >= 60
          ? "#fe7d37"
          : "#e05d44";

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="129" height="20" role="img" aria-label="coverage: ${message}">
  <title>coverage: ${message}</title>
  <linearGradient id="s" x2="0" y2="100%">
    <stop offset="0" stop-color="#bbb" stop-opacity=".1"/>
    <stop offset="1" stop-opacity=".1"/>
  </linearGradient>
  <clipPath id="r">
    <rect width="129" height="20" rx="3" fill="#fff"/>
  </clipPath>
  <g clip-path="url(#r)">
    <rect width="68" height="20" fill="#555"/>
    <rect x="68" width="61" height="20" fill="${color}"/>
    <rect width="129" height="20" fill="url(#s)"/>
  </g>
  <g fill="#fff" text-anchor="middle" font-family="Verdana,DejaVu Sans,sans-serif" font-size="11">
    <text x="34" y="15" fill="#010101" fill-opacity=".3">coverage</text>
    <text x="34" y="14">coverage</text>
    <text x="98" y="15" fill="#010101" fill-opacity=".3">${message}</text>
    <text x="98" y="14">${message}</text>
  </g>
</svg>
`;

await mkdir("badges", { recursive: true });
await writeFile(outputPath, svg);

console.log(`Generated ${outputPath}: ${message}`);