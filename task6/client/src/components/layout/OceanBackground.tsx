/** Living deep-sea backdrop: drifting radial gradients + faint sonar grid. */
export function OceanBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(1200px 800px at 15% 10%, rgba(21,101,168,0.22), transparent 60%),' +
            'radial-gradient(1000px 700px at 85% 90%, rgba(0,255,136,0.08), transparent 55%),' +
            'radial-gradient(900px 900px at 50% 50%, rgba(10,53,96,0.35), transparent 70%)',
          backgroundColor: '#020c18',
          backgroundSize: '180% 180%, 180% 180%, 180% 180%',
          animation: 'oceanDrift 22s ease-in-out infinite alternate',
        }}
      />
      <div
        className="absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(143,196,239,0.6) 1px, transparent 1px),' +
            'linear-gradient(90deg, rgba(143,196,239,0.6) 1px, transparent 1px)',
          backgroundSize: '46px 46px',
          maskImage: 'radial-gradient(circle at 50% 40%, black, transparent 80%)',
        }}
      />
      <div
        className="absolute inset-0 opacity-[0.04] mix-blend-screen"
        style={{
          backgroundImage:
            'repeating-linear-gradient(0deg, rgba(255,255,255,0.5) 0, rgba(255,255,255,0.5) 1px, transparent 1px, transparent 4px)',
        }}
      />
    </div>
  );
}
