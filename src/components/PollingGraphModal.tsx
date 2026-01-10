import { useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import type { TooltipItem } from 'chart.js';
import { Candidate, PollingSnapshot } from '@/types/game';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler);

interface PollingGraphModalProps {
  open: boolean;
  onClose: () => void;
  history: PollingSnapshot[];
  candidates: Candidate[];
}

// Converts hexadecimal colours to RGBA for line fills while safely handling non-hex values.
function hexToRgba(hex: string, alpha = 0.35) {
  if (!hex || typeof hex !== 'string') {
    return hex;
  }

  const normalized = hex.replace('#', '');
  if (normalized.length !== 6) {
    return hex;
  }

  const bigint = Number.parseInt(normalized, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export default function PollingGraphModal({ open, onClose, history, candidates }: PollingGraphModalProps) {
  const modalRoot = typeof document !== 'undefined' ? document.body : null;

  if (!open || history.length === 0 || !modalRoot) {
    return null;
  }

  const labels = history.map((snapshot) => `Week ${snapshot.week}`);

  const datasets = useMemo(() => {
    return candidates.map((candidate) => {
      const color = candidate.colour || '#0f172a';
      return {
        label: candidate.party,
        data: history.map((snapshot) => snapshot.percentages[candidate.party] ?? null),
        borderColor: color,
        backgroundColor: hexToRgba(color, 0.15),
        pointBackgroundColor: color,
        pointBorderColor: '#0f172a',
        pointHoverRadius: 5,
        pointRadius: 3,
        fill: false,
        tension: 0.25,
      };
    });
  }, [candidates, history]);

  const data = { labels, datasets };

  const yAxisMax = useMemo(() => {
    let highest: number | null = null;

    history.forEach((snapshot) => {
      candidates.forEach((candidate) => {
        const value = snapshot.percentages[candidate.party];
        if (typeof value === 'number' && Number.isFinite(value)) {
          highest = highest === null ? value : Math.max(highest, value);
        }
      });
    });

    if (highest === null) {
      return 50;
    }

    return Math.ceil(highest + 10);
  }, [candidates, history]);

  const options = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      intersect: false,
      mode: 'nearest' as const,
    },
    scales: {
      x: {
        title: {
          display: true,
          text: 'Week',
          color: '#cbd5f5',
        },
        ticks: {
          color: '#cbd5f5',
        },
        grid: {
          color: 'rgba(148, 163, 184, 0.2)',
        },
      },
      y: {
        title: {
          display: true,
          text: 'Polling %',
          color: '#cbd5f5',
        },
        ticks: {
          color: '#cbd5f5',
          callback: (value: number | string) => `${value}%`,
        },
        grid: {
          color: 'rgba(205, 209, 214, 0.2)',
        },
        beginAtZero: true,
        max: yAxisMax,
      },
    },
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          color: '#e2e8f0',
          padding: 16,
          usePointStyle: true,
        },
      },
      tooltip: {
        callbacks: {
          label: (context: TooltipItem<'line'>) => {
            if (context.parsed.y === null || context.parsed.y === undefined) {
              return `${context.dataset.label}: —`;
            }
            return `${context.dataset.label}: ${context.parsed.y.toFixed(1)}%`;
          },
        },
      },
    },
  }), [yAxisMax]);

  const modalContent = (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 px-4 py-6"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-6xl rounded-xl bg-slate-700/25 border border-slate-700 shadow-2xl backdrop-blur-md"
        style={{ minHeight: '70vh' }}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-700 px-6 py-4">
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight">Campaign Polling Trajectory</h2>
            <p className="text-xs text-slate-300 font-mono">Tracking weekly polling averages by party</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-md border border-slate-600 px-3 py-1 text-xs font-semibold text-slate-200 hover:bg-slate-800"
          >
            Close
          </button>
        </div>
        <div className="h-[60vh] px-6 pb-6 pt-4">
          <Line data={data} options={options} />
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, modalRoot);
}
