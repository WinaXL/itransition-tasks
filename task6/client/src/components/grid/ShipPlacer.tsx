import { CSSProperties } from 'react';
import { Cell, Orientation } from '../../types';
import { shipAccent } from '../../lib/configs';

export type SpriteState = 'placed' | 'valid' | 'invalid' | 'sunk' | 'revealed';

interface ShipSpriteProps {
  anchor: Cell;
  size: number;
  orientation: Orientation;
  state: SpriteState;
}

/** A ship silhouette rendered as a grid-positioned overlay item with segment lines. */
export function ShipSprite({ anchor, size, orientation, state }: ShipSpriteProps) {
  const horizontal = orientation === 'horizontal';
  const accent = shipAccent(size);

  const style: CSSProperties = {
    gridColumn: horizontal ? `${anchor.col + 1} / span ${size}` : `${anchor.col + 1}`,
    gridRow: horizontal ? `${anchor.row + 1}` : `${anchor.row + 1} / span ${size}`,
    margin: 2,
  };

  const palette: Record<SpriteState, CSSProperties> = {
    placed: {
      background: `linear-gradient(135deg, ${accent}cc, #0a2038)`,
      border: `1px solid ${accent}`,
      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.15)',
    },
    valid: {
      background: 'rgba(0,255,136,0.18)',
      border: '1px dashed rgba(0,255,136,0.85)',
    },
    invalid: {
      background: 'rgba(255,68,68,0.18)',
      border: '1px dashed rgba(255,68,68,0.85)',
    },
    sunk: {
      background: 'linear-gradient(135deg, rgba(255,68,68,0.7), rgba(139,26,26,0.85))',
      border: '1px solid rgba(255,68,68,0.9)',
    },
    revealed: {
      background: 'linear-gradient(135deg, rgba(120,40,40,0.65), rgba(60,20,20,0.8))',
      border: '1px solid rgba(255,68,68,0.6)',
    },
  };

  return (
    <div
      className={`pointer-events-none relative flex ${horizontal ? 'flex-row' : 'flex-col'} ${
        state === 'sunk' ? 'anim-danger-pulse' : ''
      }`}
      style={{ ...style, ...palette[state] }}
    >
      {Array.from({ length: size }).map((_, i) => (
        <div
          key={i}
          className="flex-1"
          style={{
            borderRight: horizontal && i < size - 1 ? '1px solid rgba(2,12,24,0.55)' : undefined,
            borderBottom: !horizontal && i < size - 1 ? '1px solid rgba(2,12,24,0.55)' : undefined,
          }}
        />
      ))}
    </div>
  );
}
