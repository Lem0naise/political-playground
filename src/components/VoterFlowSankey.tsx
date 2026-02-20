/**
 * VoterFlowSankey.tsx
 *
 * Strict two-column Sankey:
 *   LEFT  — every party + "Not Voting", sized by poll-1 share
 *   RIGHT — every party + "Not Voting", sized by final share
 *
 * Achieved by suffixing node names with "::L" / "::R" so the same
 * party can exist independently on each side. Tooltips strip the suffix.
 *
 * Above the chart: a compact voter-transfer table grouped by from-party.
 */

import { useEffect, useRef, useMemo, useState } from 'react';
import { Chart, Tooltip, Legend } from 'chart.js';
import { SankeyController, Flow } from 'chartjs-chart-sankey';
import { VoterTransferEntry, Candidate } from '@/types/game';

Chart.register(SankeyController, Flow, Tooltip, Legend);

// ─── helpers ────────────────────────────────────────────────────────────────

const L = '::L'; // left-side suffix
const R = '::R'; // right-side suffix

function stripSuffix(s: string) {
    return s.replace(/::L$|::R$/, '');
}

function partyColour(candidates: Candidate[], raw: string): string {
    const name = stripSuffix(raw);
    if (name === 'Abstain' || name === 'Not Voting') return '#334155';
    return candidates.find(c => c.party === name)?.colour ?? '#6b7280';
}

// ─── Props ───────────────────────────────────────────────────────────────────

interface Props {
    transfers: VoterTransferEntry[];
    candidates: Candidate[];
    /** Final poll results */
    pollResults: { candidate: Candidate; percentage: number }[];
    /** party name → initial percentage (includes 'Abstain' key if present) */
    initialPollResults: Record<string, number>;
}

// ─── Transfer Table ───────────────────────────────────────────────────────────

function TransferTable({ transfers, candidates, initialPollResults }: {
    transfers: VoterTransferEntry[];
    candidates: Candidate[];
    initialPollResults: Record<string, number>;
}) {
    // Group by from-party, sorted by initial share descending
    const fromParties = useMemo(() => {
        const order = Object.entries(initialPollResults)
            .sort((a, b) => b[1] - a[1])
            .map(([p]) => p === 'Abstain' ? 'Not Voting' : p);

        // Also add any from-parties that exist in transfers but not in initialPollResults
        const seen = new Set(order);
        for (const t of transfers) {
            const from = t.from === 'Abstain' ? 'Not Voting' : t.from;
            if (!seen.has(from)) { seen.add(from); order.push(from); }
        }
        return order;
    }, [initialPollResults, transfers]);

    const grouped = useMemo(() => {
        const map: Record<string, VoterTransferEntry[]> = {};
        for (const t of transfers) {
            const from = t.from === 'Abstain' ? 'Not Voting' : t.from;
            if (!map[from]) map[from] = [];
            map[from].push({ ...t, from });
        }
        return map;
    }, [transfers]);

    return (
        <div className="mb-4">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">Voter Transfer Breakdown</h4>
            <div className="space-y-3">
                {fromParties.map(fromParty => {
                    const rows = grouped[fromParty];
                    if (!rows || rows.length === 0) return null;

                    const fromColour = fromParty === 'Not Voting'
                        ? '#334155'
                        : candidates.find(c => c.party === fromParty)?.colour ?? '#6b7280';

                    // Sort within group: switched first (by count), then stayed
                    const sorted = [...rows].sort((a, b) => {
                        const aSwitch = (a.to === 'Abstain' ? 'Not Voting' : a.to) !== fromParty;
                        const bSwitch = (b.to === 'Abstain' ? 'Not Voting' : b.to) !== fromParty;
                        if (aSwitch && !bSwitch) return -1;
                        if (!aSwitch && bSwitch) return 1;
                        return b.count - a.count;
                    });

                    return (
                        <div key={fromParty} className="bg-slate-700/40 border border-slate-600/50 rounded-lg overflow-hidden">
                            {/* From-party header */}
                            <div className="flex items-center gap-2 px-3 py-2 bg-slate-700/60 border-b border-slate-600/50">
                                <div
                                    className="w-3 h-3 rounded-sm flex-shrink-0"
                                    style={{ backgroundColor: fromColour }}
                                />
                                <span className="text-xs font-bold text-slate-200">{fromParty}</span>
                                <span className="text-xs text-slate-500 ml-auto">original voters</span>
                            </div>

                            {/* Destination rows */}
                            <div className="divide-y divide-slate-700/30">
                                {sorted.map((t, i) => {
                                    const toName = t.to === 'Abstain' ? 'Not Voting' : t.to;
                                    const toColour = toName === 'Not Voting'
                                        ? '#334155'
                                        : candidates.find(c => c.party === toName)?.colour ?? '#6b7280';
                                    const isSwitched = toName !== fromParty;

                                    return (
                                        <div key={i} className={`flex items-center gap-2 px-3 py-1.5 ${isSwitched ? 'bg-amber-900/5' : ''}`}>
                                            <span className={`text-xs ${isSwitched ? 'text-amber-400' : 'text-slate-500'}`}>→</span>
                                            <div
                                                className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
                                                style={{ backgroundColor: toColour }}
                                            />
                                            <span className={`text-xs flex-1 ${isSwitched ? 'text-slate-200' : 'text-slate-400'}`}>{toName}</span>
                                            <span className={`text-xs font-mono font-bold ${isSwitched ? 'text-amber-400' : 'text-slate-500'}`}>
                                                {t.percentage.toFixed(1)}%
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// ─── Main Sankey component ────────────────────────────────────────────────────

export default function VoterFlowSankey({ transfers, candidates, pollResults, initialPollResults }: Props) {
    const [selectedFilter, setSelectedFilter] = useState<string | null>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const chartRef = useRef<Chart | null>(null);

    // ── Build filtered transfers ──────────────────────────────────────────────

    // Get all unique parties for the filter pills, ordered by initial poll share then final poll share
    const allParties = useMemo(() => {
        // Build an ordered list: initial parties first (by share), then final-only parties, then remaining
        const seen = new Set<string>();
        const ordered: string[] = [];

        // First: parties in initial poll (sorted by share descending)
        Object.entries(initialPollResults)
            .sort((a, b) => b[1] - a[1])
            .forEach(([p]) => {
                const name = p === 'Abstain' ? 'Not Voting' : p;
                if (!seen.has(name)) { seen.add(name); ordered.push(name); }
            });

        // Then: any parties that appear only in transfers (e.g. original abstainers)
        transfers.forEach(t => {
            const from = t.from === 'Abstain' ? 'Not Voting' : t.from;
            const to = t.to === 'Abstain' ? 'Not Voting' : t.to;
            if (!seen.has(from)) { seen.add(from); ordered.push(from); }
            if (!seen.has(to)) { seen.add(to); ordered.push(to); }
        });

        // Then: final-poll parties not yet included
        pollResults.forEach(r => {
            if (!seen.has(r.candidate.party)) { seen.add(r.candidate.party); ordered.push(r.candidate.party); }
        });

        return ordered;
    }, [initialPollResults, pollResults, transfers]);

    // Filter transfers based on selection
    const displayTransfers = useMemo(() => {
        if (!selectedFilter) return transfers;
        return transfers.filter(t => {
            const from = t.from === 'Abstain' ? 'Not Voting' : t.from;
            const to = t.to === 'Abstain' ? 'Not Voting' : t.to;
            return from === selectedFilter || to === selectedFilter;
        });
    }, [transfers, selectedFilter]);

    // ── Build ordered node lists ──────────────────────────────────────────────

    // Left (poll-1): sorted by initial %, descending; renames Abstain → Not Voting
    // Only include nodes that are present in displayTransfers
    // Also includes 'Not Voting' if any transfer originates from original abstainers
    const leftOrder = useMemo(() => {
        const presentNames = new Set(displayTransfers.map(t => t.from === 'Abstain' ? 'Not Voting' : t.from));
        const ordered = Object.entries(initialPollResults)
            .sort((a, b) => b[1] - a[1])
            .map(([name]) => name === 'Abstain' ? 'Not Voting' : name)
            .filter(name => presentNames.has(name));
        // Ensure 'Not Voting' appears at the bottom if original abstainers flow into parties
        if (presentNames.has('Not Voting') && !ordered.includes('Not Voting')) {
            ordered.push('Not Voting');
        }
        return ordered;
    }, [initialPollResults, displayTransfers]);

    // Right (final): sorted by final %, descending
    const rightOrder = useMemo(() => {
        const presentNames = new Set(displayTransfers.map(t => t.to === 'Abstain' ? 'Not Voting' : t.to));
        const finalParties = [...pollResults]
            .sort((a, b) => b.percentage - a.percentage)
            .map(r => r.candidate.party);

        // Check if any transfers go TO Abstain (voters who stopped voting)
        if (presentNames.has('Not Voting') && !finalParties.includes('Not Voting')) {
            finalParties.push('Not Voting');
        }
        return finalParties.filter(name => presentNames.has(name));
    }, [pollResults, displayTransfers]);

    // ── Build chart ───────────────────────────────────────────────────────────

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || displayTransfers.length === 0) return;

        if (chartRef.current) {
            chartRef.current.destroy();
            chartRef.current = null;
        }

        // Suffixed flows: Party::L → Party::R
        const data = displayTransfers.map(t => {
            const from = (t.from === 'Abstain' ? 'Not Voting' : t.from) + L;
            const to = (t.to === 'Abstain' ? 'Not Voting' : t.to) + R;
            return { from, to, flow: t.count, pct: t.percentage, rawFrom: t.from, rawTo: t.to };
        });

        // Colour lookup: strip suffix before looking up party colour
        const colourOf = (raw: string) => partyColour(candidates, raw);

        // Priority map controls vertical order within each depth column
        // Lower number = higher on screen
        const priorityMap: Record<string, number> = {};
        leftOrder.forEach((name, i) => { priorityMap[name + L] = i; });
        rightOrder.forEach((name, i) => { priorityMap[name + R] = i; });

        // Label map: strip suffix for display
        const labels: Record<string, string> = {};
        [...leftOrder, ...rightOrder].forEach(name => {
            labels[name + L] = name;
            labels[name + R] = name;
        });

        chartRef.current = new Chart(canvas, {
            type: 'sankey',
            data: {
                datasets: [{
                    data,
                    colorFrom: (ctx: any) => colourOf(ctx.dataset.data[ctx.dataIndex]?.from ?? ''),
                    colorTo: (ctx: any) => colourOf(ctx.dataset.data[ctx.dataIndex]?.to ?? ''),
                    colorMode: 'gradient',
                    nodeWidth: 24,
                    priority: priorityMap,
                    labels,
                } as any],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    tooltip: {
                        callbacks: {
                            label: (ctx: any) => {
                                const item = ctx.dataset.data[ctx.dataIndex];
                                if (!item) return '';
                                const fromLabel = stripSuffix(item.from);
                                const toLabel = stripSuffix(item.to);
                                const pct = typeof item.pct === 'number' ? item.pct.toFixed(1) : '?';
                                return `${fromLabel} → ${toLabel}: ${pct}% of ${fromLabel} voters`;
                            },
                        },
                        backgroundColor: 'rgba(15,23,42,0.95)',
                        titleColor: '#f8fafc',
                        bodyColor: '#cbd5e1',
                        borderColor: '#475569',
                        borderWidth: 1,
                        padding: 10,
                    },
                    legend: { display: false },
                },
            },
        } as any);

        return () => {
            chartRef.current?.destroy();
            chartRef.current = null;
        };
    }, [displayTransfers, candidates, leftOrder, rightOrder]);

    if (transfers.length === 0) return null;

    // All unique party names for legend
    const legendParties = useMemo(() => {
        const seen = new Set<string>();
        const out: string[] = [];
        for (const n of [...leftOrder, ...rightOrder]) {
            if (!seen.has(n)) { seen.add(n); out.push(n); }
        }
        return out;
    }, [leftOrder, rightOrder]);

    const canvasHeight = Math.max(500, Math.max(leftOrder.length, rightOrder.length) * 80 + 40);

    return (
        <div className="w-full space-y-5">
            {/* ── Filter Pills ── */}
            <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">Filter Flow by Party</h4>
                <div className="flex flex-wrap gap-2">
                    <button
                        onClick={() => setSelectedFilter(null)}
                        className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${selectedFilter === null
                            ? 'bg-blue-600 border-blue-500 text-white shadow-[0_0_10px_rgba(37,99,235,0.3)]'
                            : 'bg-slate-800 border-slate-600 text-slate-300 hover:bg-slate-700'
                            }`}
                    >
                        All Voters
                    </button>
                    {allParties.map(party => (
                        <button
                            key={party}
                            onClick={() => setSelectedFilter(party === selectedFilter ? null : party)}
                            className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition-colors ${selectedFilter === party
                                ? 'bg-slate-700 border-yellow-500 text-white shadow-[0_0_10px_rgba(234,179,8,0.3)]'
                                : 'bg-slate-800 border-slate-600 text-slate-300 hover:bg-slate-700'
                                }`}
                        >
                            <div
                                className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
                                style={{ backgroundColor: party === 'Not Voting' ? '#334155' : partyColour(candidates, party) }}
                            />
                            {party}
                        </button>
                    ))}
                </div>
                {selectedFilter && (
                    <p className="text-xs text-yellow-400/80 mt-2">
                        Showing all flows involving <span className="font-bold">{selectedFilter}</span> — as an origin <span className="text-slate-400">(left)</span> or as a destination <span className="text-slate-400">(right)</span>. Click again to clear.
                    </p>
                )}
            </div>

            {/* ── Voter transfer table and Sankey diagram ── */}
            {displayTransfers.length > 0 ? (
                <>
                    <TransferTable transfers={displayTransfers} candidates={candidates} initialPollResults={initialPollResults} />

                    <div>
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-3">Voter Flow Diagram</h4>

                        {/* Column headers */}
                        <div className="flex justify-between text-xs text-slate-500 mb-1 px-1">
                            <span className="font-semibold text-slate-400">← Original voters (Poll 1)</span>
                            <span className="font-semibold text-slate-400">Final vote (Election day) →</span>
                        </div>

                        {/* Legend */}
                        <div className="flex flex-wrap gap-x-4 gap-y-1 mb-3">
                            {legendParties.map(name => (
                                <div key={name} className="flex items-center gap-1.5 text-xs text-slate-300">
                                    <div
                                        className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
                                        style={{ backgroundColor: name === 'Not Voting' ? '#334155' : partyColour(candidates, name) }}
                                    />
                                    {name}
                                </div>
                            ))}
                        </div>

                        {/* Canvas */}
                        <div style={{ position: 'relative', height: `${canvasHeight}px` }}>
                            <canvas ref={canvasRef} />
                        </div>

                        <p className="text-xs text-slate-500 mt-2 text-center">
                            Flow width = absolute voter count · Hover for % of original party's voters
                        </p>
                    </div>
                </>
            ) : (
                <div className="text-center p-6 bg-slate-800/50 rounded-lg border border-slate-700 text-slate-400 text-sm">
                    No voter transfer data available for this selection.
                </div>
            )}
        </div>
    );
}
