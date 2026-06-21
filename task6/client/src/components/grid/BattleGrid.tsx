import { ReactNode } from 'react';
import { CellKind, GridCell } from './GridCell';
import { CoordinateLabels } from './CoordinateLabels';
import { SonarSweep } from './SonarSweep';

interface BattleGridProps {
  size: number;
  cellKind: (row: number, col: number) => CellKind;
  interactive?: boolean;
  fireableCell?: (row: number, col: number) => boolean;
  onCellClick?: (row: number, col: number) => void;
  onCellEnter?: (row: number, col: number) => void;
  onLeave?: () => void;
  sweep?: boolean;
  overlay?: ReactNode;
}

function cellVw(size: number): number {
  if (size <= 8) return 5;
  if (size <= 10) return 4.2;
  return 3.5;
}

export function BattleGrid({
  size,
  cellKind,
  interactive = false,
  fireableCell,
  onCellClick,
  onCellEnter,
  onLeave,
  sweep = false,
  overlay,
}: BattleGridProps) {
  const cellStyle = { ['--cell' as string]: `clamp(20px, ${cellVw(size)}vw, 42px)` };
  const rows = Array.from({ length: size });
  const cols = Array.from({ length: size });

  return (
    <div className="inline-block select-none" style={cellStyle as React.CSSProperties}>
      <div className="flex">
        <div style={{ width: '1.2rem' }} />
        <CoordinateLabels size={size} axis="top" />
      </div>
      <div className="flex">
        <CoordinateLabels size={size} axis="left" />
        <div
          className="relative panel-inset"
          onMouseLeave={onLeave}
          style={{ padding: 0 }}
        >
          <div
            className="grid"
            style={{ gridTemplateColumns: `repeat(${size}, var(--cell))` }}
          >
            {rows.map((_, r) =>
              cols.map((__, c) => (
                <GridCell
                  key={`${r}:${c}`}
                  kind={cellKind(r, c)}
                  interactive={interactive}
                  fireable={!!fireableCell?.(r, c)}
                  onClick={() => onCellClick?.(r, c)}
                  onEnter={() => onCellEnter?.(r, c)}
                />
              )),
            )}
          </div>

          {overlay && (
            <div
              className="pointer-events-none absolute inset-0 grid"
              style={{
                gridTemplateColumns: `repeat(${size}, var(--cell))`,
                gridTemplateRows: `repeat(${size}, var(--cell))`,
              }}
            >
              {overlay}
            </div>
          )}

          <SonarSweep active={sweep} />
        </div>
      </div>
    </div>
  );
}
