/** A translucent sonar bar sweeping top→bottom; shown while the enemy is acting. */
export function SonarSweep({ active }: { active: boolean }) {
  if (!active) return null;
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div
        className="absolute left-0 right-0 h-8"
        style={{
          background:
            'linear-gradient(180deg, transparent, rgba(0,255,136,0.18) 45%, rgba(0,255,136,0.32) 50%, rgba(0,255,136,0.18) 55%, transparent)',
          animation: 'sonarSweep 3s linear infinite',
        }}
      />
    </div>
  );
}
