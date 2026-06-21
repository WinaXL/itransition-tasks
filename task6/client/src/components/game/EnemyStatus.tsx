export function EnemyStatus({
  name,
  subtitle,
  sunk,
}: {
  name: string;
  subtitle: string;
  sunk: number;
}) {
  return (
    <div className="panel flex items-center gap-3 px-4 py-2">
      <span className="grid h-9 w-9 place-items-center border border-danger/40 bg-danger/10 text-danger">
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
          <path d="M12 2 3 7v6c0 5 3.8 8.4 9 9 5.2-.6 9-4 9-9V7l-9-5zm0 4 5 2.7V13c0 3-2 5.2-5 5.7-3-.5-5-2.7-5-5.7V8.7L12 6z" />
        </svg>
      </span>
      <div className="leading-tight">
        <div className="heading text-sm text-ocean-100">{name}</div>
        <div className="mono text-[0.62rem] text-slate-400">{subtitle}</div>
      </div>
      {sunk > 0 && (
        <span className="mono ml-2 border border-danger/40 bg-danger/10 px-2 py-0.5 text-[0.62rem] text-danger">
          {sunk} sunk
        </span>
      )}
    </div>
  );
}
