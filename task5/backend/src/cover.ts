import { Rng } from "./rng";

const SIZE = 600;

/** Curated, harmonious color palettes (no muddy gradients / noise). */
const PALETTES: { bg: string; shapes: string[]; text: string }[] = [
  { bg: "#0f1021", shapes: ["#ff5d73", "#ffc857", "#7ae7c7", "#5d5fef"], text: "#ffffff" },
  { bg: "#1b1f3b", shapes: ["#f72585", "#7209b7", "#4cc9f0", "#4361ee"], text: "#ffffff" },
  { bg: "#fff4e6", shapes: ["#ff7b00", "#ff006e", "#3a86ff", "#06d6a0"], text: "#1a1a2e" },
  { bg: "#022c43", shapes: ["#ffd700", "#ff6b6b", "#5bc0be", "#9bf6ff"], text: "#ffffff" },
  { bg: "#231942", shapes: ["#e0b1cb", "#be95c4", "#9f86c0", "#5e548e"], text: "#ffffff" },
  { bg: "#06080f", shapes: ["#00f5d4", "#00bbf9", "#f15bb5", "#fee440"], text: "#ffffff" },
  { bg: "#2b2d42", shapes: ["#ef233c", "#edf2f4", "#8d99ae", "#ffb703"], text: "#ffffff" },
];

const escapeXml = (s: string): string =>
  s.replace(/[<>&'"]/g, (c) =>
    ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" }[c]!)
  );

function wrapText(text: string, maxChars: number, maxLines: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    if ((current + " " + word).trim().length > maxChars && current) {
      lines.push(current.trim());
      current = word;
      if (lines.length === maxLines - 1) break;
    } else {
      current = (current + " " + word).trim();
    }
  }
  if (current && lines.length < maxLines) lines.push(current.trim());
  if (lines.length === 0) lines.push(text.slice(0, maxChars));
  return lines;
}

/**
 * Procedurally render an album cover as an SVG. The visual is driven entirely
 * by the supplied RNG (so it is reproducible from the song seed) and embeds
 * the real title + artist. Several distinct pattern "styles" keep covers
 * visually varied and appealing.
 */
export function generateCoverSvg(rng: Rng, title: string, artist: string): string {
  const palette = rng.pick(PALETTES);
  const style = rng.intBetween(0, 3);
  const layers: string[] = [];

  // Background
  layers.push(`<rect width="${SIZE}" height="${SIZE}" fill="${palette.bg}"/>`);

  if (style === 0) {
    // Concentric / scattered circles
    const count = rng.intBetween(14, 26);
    for (let i = 0; i < count; i++) {
      const cx = rng.intBetween(0, SIZE);
      const cy = rng.intBetween(0, SIZE);
      const r = rng.intBetween(20, 160);
      const color = rng.pick(palette.shapes);
      const op = rng.floatBetween(0.25, 0.7).toFixed(2);
      layers.push(`<circle cx="${cx}" cy="${cy}" r="${r}" fill="${color}" opacity="${op}"/>`);
    }
  } else if (style === 1) {
    // Diagonal stripes
    const stripes = rng.intBetween(8, 16);
    const w = SIZE / stripes;
    const angle = rng.pick([0, 45, 90, 135]);
    layers.push(`<g transform="rotate(${angle} ${SIZE / 2} ${SIZE / 2})">`);
    for (let i = -stripes; i < stripes * 2; i++) {
      if (rng.chance(0.35)) continue;
      const color = rng.pick(palette.shapes);
      const op = rng.floatBetween(0.3, 0.8).toFixed(2);
      layers.push(
        `<rect x="${i * w - SIZE}" y="-${SIZE}" width="${w}" height="${SIZE * 3}" fill="${color}" opacity="${op}"/>`
      );
    }
    layers.push(`</g>`);
  } else if (style === 2) {
    // Triangular mosaic grid
    const grid = rng.intBetween(5, 8);
    const cell = SIZE / grid;
    for (let gx = 0; gx < grid; gx++) {
      for (let gy = 0; gy < grid; gy++) {
        if (rng.chance(0.25)) continue;
        const x = gx * cell;
        const y = gy * cell;
        const color = rng.pick(palette.shapes);
        const op = rng.floatBetween(0.3, 0.85).toFixed(2);
        const variant = rng.intBetween(0, 3);
        const pts =
          variant === 0
            ? `${x},${y} ${x + cell},${y} ${x},${y + cell}`
            : variant === 1
            ? `${x + cell},${y} ${x + cell},${y + cell} ${x},${y}`
            : variant === 2
            ? `${x},${y + cell} ${x + cell},${y + cell} ${x + cell},${y}`
            : `${x},${y} ${x + cell},${y + cell} ${x},${y + cell}`;
        layers.push(`<polygon points="${pts}" fill="${color}" opacity="${op}"/>`);
      }
    }
  } else {
    // Bold concentric arcs / rings from a focal point
    const fx = rng.intBetween(150, 450);
    const fy = rng.intBetween(150, 450);
    const rings = rng.intBetween(6, 12);
    for (let i = rings; i > 0; i--) {
      const r = (i / rings) * 420;
      const color = rng.pick(palette.shapes);
      const op = rng.floatBetween(0.2, 0.6).toFixed(2);
      layers.push(`<circle cx="${fx}" cy="${fy}" r="${r.toFixed(0)}" fill="${color}" opacity="${op}"/>`);
    }
  }

  // Readability scrim behind the text
  layers.push(
    `<rect x="0" y="${SIZE - 200}" width="${SIZE}" height="200" fill="${palette.bg}" opacity="0.72"/>`
  );

  // Title (wrapped) + artist
  const titleLines = wrapText(title, 18, 2);
  const fontSize = titleLines.length > 1 ? 52 : 60;
  let ty = SIZE - 120;
  const titleSvg = titleLines
    .map((line) => {
      const t = `<text x="40" y="${ty}" font-family="Georgia, 'Times New Roman', serif" font-size="${fontSize}" font-weight="700" fill="${palette.text}">${escapeXml(
        line
      )}</text>`;
      ty += fontSize + 6;
      return t;
    })
    .join("");
  layers.push(titleSvg);
  layers.push(
    `<text x="40" y="${SIZE - 40}" font-family="Helvetica, Arial, sans-serif" font-size="30" fill="${palette.shapes[0]}" font-weight="600" letter-spacing="1">${escapeXml(
      artist
    )}</text>`
  );

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}">${layers.join(
    ""
  )}</svg>`;
}

/** Base64 data URI for direct use in <img src>. */
export function svgToDataUri(svg: string): string {
  return `data:image/svg+xml;base64,${Buffer.from(svg, "utf8").toString("base64")}`;
}
