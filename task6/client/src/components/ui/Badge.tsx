import { ReactNode } from 'react';

type Tone = 'sonar' | 'gold' | 'danger' | 'ocean' | 'neutral';

const tones: Record<Tone, string> = {
  sonar: 'text-sonar border-sonar/40 bg-sonar/10',
  gold: 'text-gold border-gold/40 bg-gold/10',
  danger: 'text-danger border-danger/40 bg-danger/10',
  ocean: 'text-ocean-200 border-ocean-500/40 bg-ocean-700/30',
  neutral: 'text-slate-300 border-white/10 bg-white/5',
};

export function Badge({
  children,
  tone = 'neutral',
  className = '',
}: {
  children: ReactNode;
  tone?: Tone;
  className?: string;
}) {
  return (
    <span
      className={`mono inline-flex items-center gap-1 border px-2 py-0.5 text-[0.65rem] font-medium uppercase tracking-wider ${tones[tone]} ${className}`}
    >
      {children}
    </span>
  );
}
