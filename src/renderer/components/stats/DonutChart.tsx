import { useMemo } from 'react';

interface Segment {
  label: string;
  value: number;
  color: string;
}

interface DonutChartProps {
  segments: Segment[];
  size?: number;
  strokeWidth?: number;
  centerLabel?: string;
  centerValue?: string;
}

const COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1',
  '#14b8a6', '#e11d48', '#a855f7', '#0ea5e9', '#eab308',
];

export function getSegmentColor(index: number): string {
  return COLORS[index % COLORS.length];
}

export default function DonutChart({
  segments,
  size = 200,
  strokeWidth = 32,
  centerLabel,
  centerValue,
}: DonutChartProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const cx = size / 2;
  const cy = size / 2;

  const total = useMemo(() => segments.reduce((sum, s) => sum + s.value, 0), [segments]);

  const arcs = useMemo(() => {
    let offset = 0;
    return segments.map((seg) => {
      const ratio = total > 0 ? seg.value / total : 0;
      const dashLength = ratio * circumference;
      const gap = circumference - dashLength;
      const rotation = (offset / total) * 360;
      offset += seg.value;
      return { ...seg, dashLength, gap, rotation, ratio };
    });
  }, [segments, total, circumference]);

  if (total === 0) {
    return (
      <div className="flex items-center justify-center" style={{ width: size, height: size }}>
        <span className="text-sm text-gray-400">데이터 없음</span>
      </div>
    );
  }

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {/* Background circle */}
      <circle cx={cx} cy={cy} r={radius} fill="none" stroke="#f3f4f6" strokeWidth={strokeWidth} />

      {/* Segments */}
      {arcs.map((arc) => (
        <circle
          key={arc.label}
          cx={cx}
          cy={cy}
          r={radius}
          fill="none"
          stroke={arc.color}
          strokeWidth={strokeWidth}
          strokeDasharray={`${arc.dashLength} ${arc.gap}`}
          strokeDashoffset={circumference / 4}
          transform={`rotate(${arc.rotation} ${cx} ${cy})`}
          className="transition-all duration-300"
        />
      ))}

      {/* Center text */}
      {(centerLabel || centerValue) && (
        <>
          {centerValue && (
            <text x={cx} y={centerLabel ? cy - 4 : cy} textAnchor="middle" dominantBaseline="central" className="fill-gray-800 text-lg font-bold" style={{ fontSize: 20, fontWeight: 700 }}>
              {centerValue}
            </text>
          )}
          {centerLabel && (
            <text x={cx} y={centerValue ? cy + 16 : cy} textAnchor="middle" dominantBaseline="central" className="fill-gray-400" style={{ fontSize: 11 }}>
              {centerLabel}
            </text>
          )}
        </>
      )}
    </svg>
  );
}
