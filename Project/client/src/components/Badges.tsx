import { useRef } from "react";
import { useTranslation } from "react-i18next";
import { Download } from "lucide-react";
import { ProfileData } from "../types";

const TIER_COLORS = ["#b45309", "#64748b", "#d97706"]; // bronze, silver, gold

/**
 * Achievements panel rendered as a single standalone SVG (so it can be
 * downloaded as a file). Progress is derived from data already loaded for the
 * profile page: project count, CV count and total likes received.
 */
export default function Badges({ data }: { data: ProfileData }) {
  const { t } = useTranslation();
  const svgRef = useRef<SVGSVGElement>(null);

  const projects = data.projects.length;
  const cvs = data.cvs.length;
  const likes = data.cvs.reduce((sum, cv) => sum + cv._count.likes, 0);

  const groups = [
    { labelKey: "badges.projects", icon: "⚒", thresholds: [1, 5, 10], achieved: projects },
    { labelKey: "badges.cvs", icon: "📄", thresholds: [1, 3, 5], achieved: cvs },
    { labelKey: "badges.likes", icon: "♥", thresholds: [5, 10, 25], achieved: likes },
  ];
  const badges = groups.flatMap((g) =>
    g.thresholds.map((threshold, tier) => ({
      id: `${g.labelKey}-${threshold}`,
      labelKey: g.labelKey,
      icon: g.icon,
      threshold,
      achieved: g.achieved,
      color: TIER_COLORS[tier],
    }))
  );

  const earnedCount = badges.filter((b) => b.achieved >= b.threshold).length;

  const download = () => {
    if (!svgRef.current) return;
    const source = new XMLSerializer().serializeToString(svgRef.current);
    const blob = new Blob([`<?xml version="1.0" encoding="UTF-8"?>\n${source}`], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${data.user.name.replace(/\s+/g, "-").toLowerCase()}-badges.svg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const cell = 92;
  const width = badges.length * cell + 16;
  const height = 132;

  return (
    <section className="card space-y-2 p-4 print:hidden">
      <div className="flex items-center">
        <h2 className="font-semibold">
          {t("badges.title")}{" "}
          <span className="text-sm font-normal text-slate-400">({earnedCount}/{badges.length})</span>
        </h2>
        <button className="btn-ghost ml-auto" onClick={download}>
          <Download size={14} /> {t("badges.download")}
        </button>
      </div>
      <div className="overflow-x-auto">
        <svg
          ref={svgRef}
          xmlns="http://www.w3.org/2000/svg"
          viewBox={`0 0 ${width} ${height}`}
          width={width}
          height={height}
          role="img"
          aria-label={t("badges.title")}
          fontFamily="system-ui, sans-serif"
        >
          {badges.map((b, i) => {
            const earned = b.achieved >= b.threshold;
            const cx = 8 + i * cell + cell / 2;
            return (
              <g key={b.id} opacity={earned ? 1 : 0.35}>
                <circle cx={cx} cy={46} r={32} fill={earned ? b.color : "#94a3b8"} />
                <circle cx={cx} cy={46} r={27} fill="none" stroke="white" strokeWidth={1.5} opacity={0.6} />
                <text x={cx} y={42} textAnchor="middle" fontSize={16} fill="white">{b.icon}</text>
                <text x={cx} y={60} textAnchor="middle" fontSize={13} fontWeight={700} fill="white">
                  {b.threshold}
                </text>
                <text x={cx} y={98} textAnchor="middle" fontSize={11} fill="#64748b">
                  {t(b.labelKey, { n: b.threshold })}
                </text>
                <text x={cx} y={114} textAnchor="middle" fontSize={10} fill={earned ? "#16a34a" : "#94a3b8"}>
                  {earned ? "✓" : `${Math.min(b.achieved, b.threshold)}/${b.threshold}`}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </section>
  );
}
