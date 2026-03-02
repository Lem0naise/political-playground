import { useMemo } from 'react';
import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import type { TooltipItem } from 'chart.js';
import { Candidate } from '@/types/game';

ChartJS.register(ArcElement, Tooltip, Legend);

export default function ParliamentChart({
    results,
    playerResult,
    incumbentGovernment,
}: {
    results: { candidate: Candidate; percentage: number }[];
    playerResult?: { candidate: Candidate; percentage: number };
    incumbentGovernment?: string[];
}) {
    const sortedData = useMemo(() => {
        return [...results].sort((a, b) => {
            const valA = a.candidate.vals?.[0] ?? 0;
            const valB = b.candidate.vals?.[0] ?? 0;
            return valA - valB;
        });
    }, [results]);

    const data = useMemo(() => ({
        labels: sortedData.map((r) => r.candidate.party),
        datasets: [
            {
                data: sortedData.map((r) => r.percentage),
                backgroundColor: sortedData.map((r) => r.candidate.colour || '#94a3b8'),
                borderColor: sortedData.map((r) =>
                    incumbentGovernment?.includes(r.candidate.party) ? '#ffffff' : '#0f172a'
                ),
                borderWidth: sortedData.map((r) =>
                    incumbentGovernment?.includes(r.candidate.party) ? 4 : 2
                ),
                hoverOffset: 4,
            },
        ],
    }), [sortedData, incumbentGovernment]);

    const options = {
        rotation: -90,
        circumference: 180,
        cutout: '55%',
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            tooltip: {
                callbacks: {
                    label: (context: TooltipItem<'doughnut'>) => {
                        return ` ${context.label}: ${context.parsed.toFixed(1)}%`;
                    },
                },
            },
        },
    };

    return (
        <div className="relative w-full h-[180px] sm:h-[220px] flex items-end justify-center pb-2">
            <Doughnut data={data} options={options} />
            <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 text-center pointer-events-none w-full px-4">
                <div className="text-3xl sm:text-4xl font-black text-slate-300 drop-shadow-md">
                    {playerResult ? `${playerResult.percentage.toFixed(1)}%` : '100%'}
                </div>
                <div className="text-[10px] sm:text-xs text-slate-500 font-mono uppercase tracking-widest mt-1 whitespace-nowrap overflow-hidden text-ellipsis">
                    {playerResult ? `Your Votes` : 'Vote Share'}
                </div>
            </div>
        </div>
    );
}
