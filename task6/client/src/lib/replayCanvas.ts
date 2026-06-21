import { CellKind } from '../components/grid/GridCell';
import { shipAccent } from './configs';
import { PlacedShip, VisibleState } from '../types';

export interface ReplayFrameMeta {
  myName: string;
  enemyName: string;
  myTurn: boolean;
  gameOver?: { won: boolean; headline: string };
}

const COLORS = {
  bg: '#04182e',
  panel: '#072444',
  border: 'rgba(77,157,224,0.35)',
  water: 'rgba(3, 18, 36, 0.85)',
  miss: '#94a3b8',
  hit: '#ff8c28',
  sunk: '#ff4444',
  sonar: '#00ff88',
  text: '#dce8f5',
  muted: '#64748b',
};

function cellKindAt(
  view: VisibleState,
  side: 'enemy' | 'own',
  row: number,
  col: number,
): CellKind {
  const shots = side === 'enemy' ? view.outgoingShots : view.incomingShots;
  const hit = shots.find((s) => s.row === row && s.col === col);
  return (hit?.outcome as CellKind) ?? 'water';
}

function drawGrid(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  cell: number,
  view: VisibleState,
  side: 'enemy' | 'own',
  title: string,
  ships: PlacedShip[],
) {
  const pad = 28;
  const gridPx = size * cell;
  const boxW = gridPx + pad * 2;
  const boxH = gridPx + pad * 2 + 24;

  ctx.fillStyle = COLORS.panel;
  ctx.strokeStyle = COLORS.border;
  ctx.lineWidth = 1;
  ctx.fillRect(x, y, boxW, boxH);
  ctx.strokeRect(x, y, boxW, boxH);

  ctx.fillStyle = side === 'enemy' ? '#ff6b6b' : COLORS.text;
  ctx.font = '600 13px Orbitron, sans-serif';
  ctx.fillText(title.toUpperCase(), x + pad, y + 18);

  const gx = x + pad;
  const gy = y + pad + 8;

  for (let r = 0; r < size; r += 1) {
    for (let c = 0; c < size; c += 1) {
      const px = gx + c * cell;
      const py = gy + r * cell;
      const kind = cellKindAt(view, side, r, c);

      ctx.fillStyle = COLORS.water;
      ctx.fillRect(px, py, cell - 1, cell - 1);
      ctx.strokeStyle = 'rgba(10,53,96,0.7)';
      ctx.strokeRect(px, py, cell - 1, cell - 1);

      if (kind === 'miss') {
        ctx.fillStyle = COLORS.miss;
        ctx.beginPath();
        ctx.arc(px + cell / 2, py + cell / 2, 3, 0, Math.PI * 2);
        ctx.fill();
      } else if (kind === 'hit' || kind === 'sunk') {
        ctx.fillStyle = kind === 'sunk' ? COLORS.sunk : COLORS.hit;
        ctx.fillRect(px + 3, py + 3, cell - 7, cell - 7);
      }
    }
  }

  if (side === 'own') {
    for (const ship of ships) {
      ctx.fillStyle = ship.sunk ? COLORS.sunk : shipAccent(ship.size);
      for (const cellPos of ship.cells) {
        const px = gx + cellPos.col * cell;
        const py = gy + cellPos.row * cell;
        ctx.globalAlpha = ship.sunk ? 0.85 : 0.55;
        ctx.fillRect(px + 2, py + 2, cell - 5, cell - 5);
        ctx.globalAlpha = 1;
      }
    }
  } else {
    for (const ship of view.revealedEnemyShips) {
      ctx.fillStyle = COLORS.sunk;
      for (const cellPos of ship.cells) {
        const px = gx + cellPos.col * cell;
        const py = gy + cellPos.row * cell;
        ctx.fillRect(px + 2, py + 2, cell - 5, cell - 5);
      }
    }
  }
}

export function drawReplayFrame(
  canvas: HTMLCanvasElement,
  view: VisibleState,
  meta: ReplayFrameMeta,
): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const W = canvas.width;
  const H = canvas.height;
  ctx.fillStyle = COLORS.bg;
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = COLORS.sonar;
  ctx.font = '700 16px Orbitron, sans-serif';
  ctx.fillText('NAVAL STRIKE — YOUR REPLAY VIEW', 24, 28);

  ctx.fillStyle = COLORS.muted;
  ctx.font = '11px JetBrains Mono, monospace';
  ctx.fillText(`${meta.myName} vs ${meta.enemyName}`, 24, 48);

  const turnLabel = meta.gameOver
    ? meta.gameOver.headline
    : meta.myTurn
      ? 'YOUR TURN'
      : 'OPPONENT TURN';
  ctx.fillStyle = meta.gameOver ? COLORS.sonar : meta.myTurn ? COLORS.sonar : COLORS.muted;
  ctx.fillText(turnLabel, W - 24 - ctx.measureText(turnLabel).width, 48);

  const size = view.gridSize;
  const cell = Math.min(32, Math.floor((W / 2 - 60) / size));
  const gridBlockW = size * cell + 56;
  const startY = 64;
  const gap = 24;
  const totalW = gridBlockW * 2 + gap;
  const startX = (W - totalW) / 2;

  drawGrid(ctx, startX, startY, size, cell, view, 'enemy', 'Enemy Waters', []);
  drawGrid(ctx, startX + gridBlockW + gap, startY, size, cell, view, 'own', 'Your Waters', view.ownShips);

  if (meta.gameOver) {
    ctx.fillStyle = 'rgba(2,12,24,0.75)';
    ctx.fillRect(0, H - 56, W, 56);
    ctx.fillStyle = meta.gameOver.won ? COLORS.sonar : COLORS.sunk;
    ctx.font = '700 18px Orbitron, sans-serif';
    ctx.fillText(meta.gameOver.headline, W / 2 - ctx.measureText(meta.gameOver.headline).width / 2, H - 22);
  }
}

export function pickRecorderMimeType(): string {
  const candidates = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'];
  for (const mime of candidates) {
    if (MediaRecorder.isTypeSupported(mime)) return mime;
  }
  return 'video/webm';
}
