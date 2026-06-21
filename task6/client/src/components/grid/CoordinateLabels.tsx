const LETTERS = 'ABCDEFGHIJKLMNOPQRST'.split('');

export function CoordinateLabels({ size, axis }: { size: number; axis: 'top' | 'left' }) {
  const items = Array.from({ length: size });
  if (axis === 'top') {
    return (
      <div
        className="grid"
        style={{ gridTemplateColumns: `repeat(${size}, var(--cell))` }}
      >
        {items.map((_, i) => (
          <div
            key={i}
            className="mono flex items-end justify-center pb-1 text-[0.6rem] font-medium text-sonar/70"
            style={{ width: 'var(--cell)', height: '1.1rem' }}
          >
            {LETTERS[i]}
          </div>
        ))}
      </div>
    );
  }
  return (
    <div className="grid" style={{ gridTemplateRows: `repeat(${size}, var(--cell))` }}>
      {items.map((_, i) => (
        <div
          key={i}
          className="mono flex items-center justify-end pr-1.5 text-[0.6rem] font-medium text-sonar/70"
          style={{ height: 'var(--cell)', width: '1.2rem' }}
        >
          {i + 1}
        </div>
      ))}
    </div>
  );
}
