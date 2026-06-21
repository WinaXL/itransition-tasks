import { ReactNode, useCallback, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

type Placement = 'top' | 'bottom' | 'auto';

interface TooltipProps {
  label: string;
  children: ReactNode;
  placement?: Placement;
}

interface TooltipPos {
  top: number;
  left: number;
  actual: 'top' | 'bottom';
}

const GAP = 8;
const VIEWPORT_PAD = 8;

export function Tooltip({ label, children, placement = 'auto' }: TooltipProps) {
  const id = useId();
  const triggerRef = useRef<HTMLSpanElement>(null);
  const tooltipRef = useRef<HTMLSpanElement>(null);
  const [show, setShow] = useState(false);
  const [pos, setPos] = useState<TooltipPos | null>(null);

  const updatePosition = useCallback(() => {
    const trigger = triggerRef.current;
    const tooltip = tooltipRef.current;
    if (!trigger || !tooltip) return;

    const rect = trigger.getBoundingClientRect();
    const tipRect = tooltip.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    const spaceAbove = rect.top - VIEWPORT_PAD;
    const spaceBelow = vh - rect.bottom - VIEWPORT_PAD;

    let actual: 'top' | 'bottom';
    if (placement === 'top') {
      actual = 'top';
    } else if (placement === 'bottom') {
      actual = 'bottom';
    } else {
      actual = spaceBelow >= tipRect.height + GAP || spaceAbove < tipRect.height + GAP ? 'bottom' : 'top';
    }

    let top =
      actual === 'top'
        ? rect.top - tipRect.height - GAP
        : rect.bottom + GAP;

    let left = rect.left + rect.width / 2 - tipRect.width / 2;
    left = Math.max(VIEWPORT_PAD, Math.min(left, vw - tipRect.width - VIEWPORT_PAD));
    top = Math.max(VIEWPORT_PAD, Math.min(top, vh - tipRect.height - VIEWPORT_PAD));

    setPos({ top, left, actual });
  }, [placement]);

  useEffect(() => {
    if (!show) return;
    updatePosition();
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);
    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [show, label, updatePosition]);

  useEffect(() => {
    if (show && tooltipRef.current) updatePosition();
  }, [show, label, updatePosition]);

  return (
    <>
      <span
        ref={triggerRef}
        className="inline-flex"
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        onFocus={() => setShow(true)}
        onBlur={() => setShow(false)}
        aria-describedby={show ? id : undefined}
      >
        {children}
      </span>
      {show &&
        createPortal(
          <span
            ref={tooltipRef}
            id={id}
            role="tooltip"
            className="mono pointer-events-none fixed z-[9999] whitespace-nowrap border border-ocean-500/40 bg-ocean-900 px-2 py-1 text-[0.65rem] text-ocean-200 shadow-lg"
            style={{
              top: pos?.top ?? -9999,
              left: pos?.left ?? -9999,
              visibility: pos ? 'visible' : 'hidden',
            }}
          >
            {label}
          </span>,
          document.body,
        )}
    </>
  );
}
