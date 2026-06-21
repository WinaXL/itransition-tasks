type DotStatus = 'online' | 'in-game' | 'offline';

const colors: Record<DotStatus, string> = {
  online: 'var(--color-sonar)',
  'in-game': 'var(--color-gold)',
  offline: 'var(--color-miss)',
};

export function StatusDot({ status, pulse = true }: { status: DotStatus; pulse?: boolean }) {
  const color = colors[status];
  return (
    <span className="relative inline-flex h-2.5 w-2.5">
      {pulse && status !== 'offline' && (
        <span
          className="absolute inset-0 rounded-full"
          style={{ background: color, animation: 'sonarPing 1.6s ease-out infinite' }}
        />
      )}
      <span className="relative h-2.5 w-2.5 rounded-full" style={{ background: color }} />
    </span>
  );
}
