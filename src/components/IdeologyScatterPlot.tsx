import { useMemo, useState } from 'react';
import { Candidate, VALUES } from '@/types/game';

type AxisKey = (typeof VALUES)[number];

const AXIS_META: Record<AxisKey, { label: string; left: string; right: string }> = {
  prog_cons: { label: 'Social Values', left: 'Progressive', right: 'Conservative' },
  nat_glob: { label: 'Worldview', left: 'Nationalist', right: 'Globalist' },
  env_eco: { label: 'Environment', left: 'Environment', right: 'Growth' },
  soc_cap: { label: 'Economy', left: 'Socialist', right: 'Capitalist' },
  pac_mil: { label: 'Security', left: 'Pacifist', right: 'Militarist' },
  auth_ana: { label: 'Authority', left: 'Authoritarian', right: 'Libertarian' },
  rel_sec: { label: 'Religion', left: 'Religious', right: 'Secular' },
};

function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v));
}

function getAxisValue(candidate: Candidate, key: AxisKey) {
  const idx = VALUES.indexOf(key);
  const raw = candidate.vals?.[idx];
  return typeof raw === 'number' ? raw : 0;
}

export default function IdeologyScatterPlot({
  candidates,
  className,
  title = 'Ideology Map',
}: {
  candidates: Candidate[];
  className?: string;
  title?: string;
}) {
  const [xAxis, setXAxis] = useState<AxisKey>('prog_cons');
  const [yAxis, setYAxis] = useState<AxisKey>('nat_glob');

  const axisOptions = useMemo(
    () =>
      VALUES.map((k) => ({
        key: k,
        label: `${AXIS_META[k].label} (${AXIS_META[k].left} - ${AXIS_META[k].right})`,
      })),
    []
  );

  const points = useMemo(() => {
    const unique = new Map<number, Candidate>();
    candidates.forEach((c) => unique.set(c.id, c));
    return [...unique.values()]
      .map((c) => {
        const x = clamp(getAxisValue(c, xAxis), -100, 100);
        const y = clamp(getAxisValue(c, yAxis), -100, 100);
        return { c, x, y };
      })
      .sort((a, b) => {
        // Draw non-player first so player is on top.
        if (a.c.is_player && !b.c.is_player) return 1;
        if (!a.c.is_player && b.c.is_player) return -1;
        return a.c.party.localeCompare(b.c.party);
      });
  }, [candidates, xAxis, yAxis]);

  const W = 520;
  const H = 360;
  const pad = 42;
  const innerW = W - pad * 2;
  const innerH = H - pad * 2;

  const toSvgX = (v: number) => pad + ((v + 100) / 200) * innerW;
  const toSvgY = (v: number) => pad + ((100 - v) / 200) * innerH;

  const ticks = [-100, -50, 0, 50, 100];
  const xMeta = AXIS_META[xAxis];
  const yMeta = AXIS_META[yAxis];

  const setAxisWithSwap = (next: AxisKey, which: 'x' | 'y') => {
    if (which === 'x') {
      if (next === yAxis) {
        setYAxis(xAxis);
      }
      setXAxis(next);
      return;
    }
    if (next === xAxis) {
      setXAxis(yAxis);
    }
    setYAxis(next);
  };

  return (
    <div className={className}>
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2 mb-3">
        <div>
          <div className="campaign-status text-sm sm:text-base font-bold text-amber-300">{title}</div>
          <div className="text-[11px] text-slate-400">Pick any two axes to compare parties.</div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <label className="text-[11px] text-slate-300">
            X axis
            <select
              value={xAxis}
              onChange={(e) => setAxisWithSwap(e.target.value as AxisKey, 'x')}
              className="ml-2 bg-slate-900/60 border border-slate-600 rounded px-2 py-1 text-[11px] text-white"
            >
              {axisOptions.map((o) => (
                <option key={o.key} value={o.key}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>

          <label className="text-[11px] text-slate-300">
            Y axis
            <select
              value={yAxis}
              onChange={(e) => setAxisWithSwap(e.target.value as AxisKey, 'y')}
              className="ml-2 bg-slate-900/60 border border-slate-600 rounded px-2 py-1 text-[11px] text-white"
            >
              {axisOptions.map((o) => (
                <option key={o.key} value={o.key}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className="bg-slate-900/40 border border-slate-700 rounded-lg p-2 sm:p-3">
        <div className="w-full overflow-hidden">
          <svg
            viewBox={`0 0 ${W} ${H}`}
            className="w-full h-[280px] sm:h-[320px]"
            role="img"
            aria-label={`${title}: ${xMeta.label} vs ${yMeta.label}`}
          >
            <rect x={0} y={0} width={W} height={H} fill="rgba(2,6,23,0.3)" rx={10} />

            {/* Grid */}
            {ticks.map((t) => (
              <g key={`grid-${t}`}>
                <line
                  x1={toSvgX(t)}
                  y1={pad}
                  x2={toSvgX(t)}
                  y2={H - pad}
                  stroke={t === 0 ? 'rgba(148,163,184,0.55)' : 'rgba(148,163,184,0.18)'}
                  strokeWidth={t === 0 ? 1.2 : 1}
                />
                <line
                  x1={pad}
                  y1={toSvgY(t)}
                  x2={W - pad}
                  y2={toSvgY(t)}
                  stroke={t === 0 ? 'rgba(148,163,184,0.55)' : 'rgba(148,163,184,0.18)'}
                  strokeWidth={t === 0 ? 1.2 : 1}
                />
              </g>
            ))}

            {/* Tick labels */}
            {ticks.map((t) => (
              <g key={`tick-${t}`}>
                <text
                  x={toSvgX(t)}
                  y={H - 16}
                  textAnchor="middle"
                  fontSize={10}
                  fill="rgba(226,232,240,0.75)"
                  fontFamily="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace"
                >
                  {t}
                </text>
                <text
                  x={18}
                  y={toSvgY(t) + 3}
                  textAnchor="start"
                  fontSize={10}
                  fill="rgba(226,232,240,0.75)"
                  fontFamily="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace"
                >
                  {t}
                </text>
              </g>
            ))}

            {/* Axis titles */}
            <text x={W / 2} y={18} textAnchor="middle" fontSize={12} fill="rgba(250,204,21,0.9)">
              {yMeta.label}
            </text>
            <text x={W / 2} y={H - 4} textAnchor="middle" fontSize={12} fill="rgba(250,204,21,0.9)">
              {xMeta.label}
            </text>

            {/* End labels */}
            <text x={pad} y={H - pad + 14} textAnchor="start" fontSize={10} fill="rgba(226,232,240,0.75)">
              {xMeta.left}
            </text>
            <text x={W - pad} y={H - pad + 14} textAnchor="end" fontSize={10} fill="rgba(226,232,240,0.75)">
              {xMeta.right}
            </text>

            <text
              x={12}
              y={pad}
              textAnchor="start"
              fontSize={10}
              fill="rgba(226,232,240,0.75)"
              transform={`rotate(-90 12 ${pad})`}
            >
              {yMeta.right}
            </text>
            <text
              x={12}
              y={H - pad}
              textAnchor="start"
              fontSize={10}
              fill="rgba(226,232,240,0.75)"
              transform={`rotate(-90 12 ${H - pad})`}
            >
              {yMeta.left}
            </text>

            {/* Points */}
            {points.map(({ c, x, y }) => {
              const cx = toSvgX(x);
              const cy = toSvgY(y);
              const r = c.is_player ? 6 : 5;
              return (
                <g key={c.id}>
                  <circle
                    cx={cx}
                    cy={cy}
                    r={r + 3}
                    fill={c.is_player ? 'rgba(250,204,21,0.18)' : 'rgba(255,255,255,0.06)'}
                  />
                  <circle
                    cx={cx}
                    cy={cy}
                    r={r}
                    fill={c.colour || '#94a3b8'}
                    stroke={c.is_player ? 'rgba(250,204,21,0.95)' : 'rgba(255,255,255,0.85)'}
                    strokeWidth={c.is_player ? 2 : 1}
                  >
                    <title>
                      {`${c.party}${c.is_player ? ' (You)' : ''}\n${xMeta.label}: ${x.toFixed(0)}\n${yMeta.label}: ${y.toFixed(0)}`}
                    </title>
                  </circle>
                </g>
              );
            })}
          </svg>
        </div>

        <div className="mt-2 border-t border-slate-700 pt-2">
          <div className="text-[10px] text-slate-400 mb-1">Legend</div>
          <div className="flex flex-wrap gap-x-3 gap-y-1.5 max-h-24 overflow-auto pr-1">
            {points.map(({ c }) => (
              <div key={`legend-${c.id}`} className="flex items-center gap-2 text-[11px] text-slate-200">
                <span
                  className="w-2.5 h-2.5 rounded-full border border-white/80 flex-shrink-0"
                  style={{ backgroundColor: c.colour || '#94a3b8' }}
                ></span>
                <span className={c.is_player ? 'text-yellow-300 font-semibold' : ''}>{c.party}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
