import { ReactNode, useState } from 'react';

export function Tooltip({ label, children }: { label: string; children: ReactNode }) {
  const [show, setShow] = useState(false);
  return (
    <span
      className="relative inline-flex"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      {show && (
        <span className="mono pointer-events-none absolute -top-8 left-1/2 z-50 -translate-x-1/2 whitespace-nowrap border border-ocean-500/40 bg-ocean-900 px-2 py-1 text-[0.65rem] text-ocean-200 shadow-lg">
          {label}
        </span>
      )}
    </span>
  );
}
