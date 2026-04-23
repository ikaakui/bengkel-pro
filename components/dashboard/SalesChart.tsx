"use client";

import { motion } from "framer-motion";
import { useMemo, useState } from "react";

interface DataPoint {
    label: string;
    value: number;
}

interface SalesChartProps {
    data: DataPoint[];
    height?: number;
    color?: string;
    showLabels?: boolean;
    showGrid?: boolean;
}

export default function SalesChart({
    data,
    height = 200,
    color = "#3b82f6",
    showLabels = true,
    showGrid = true
}: SalesChartProps) {
    const [hoveredPoint, setHoveredPoint] = useState<number | null>(null);
    const maxVal = useMemo(() => Math.max(...data.map(d => d.value), 1), [data]);

    // SVG Dimensions
    const width = 1000;
    const padding = 50;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;

    const totalPoints = data.length;
    const labelSkip = totalPoints <= 12 ? 1 : totalPoints <= 30 ? 3 : totalPoints <= 48 ? 4 : 6;
    const showDots = totalPoints <= 30;
    const lineWidth = totalPoints <= 12 ? 5 : totalPoints <= 30 ? 3 : 2;

    const points = useMemo(() => {
        return data.map((d, i) => {
            const x = padding + (i * (chartWidth / (data.length - 1 || 1)));
            const y = height - padding - (d.value / maxVal * chartHeight);
            return { x, y, value: d.value, label: d.label };
        });
    }, [data, maxVal, chartWidth, chartHeight, height]);

    // Generate smooth curve using cubic bezier
    const pathData = useMemo(() => {
        if (points.length < 2) return "";
        let d = `M ${points[0].x} ${points[0].y}`;

        for (let i = 0; i < points.length - 1; i++) {
            const p0 = points[i];
            const p1 = points[i + 1];
            // Control points for smooth curve
            const cp1x = p0.x + (p1.x - p0.x) / 2;
            const cp2x = p0.x + (p1.x - p0.x) / 2;
            d += ` C ${cp1x} ${p0.y}, ${cp2x} ${p1.y}, ${p1.x} ${p1.y}`;
        }
        return d;
    }, [points]);

    const areaData = useMemo(() => {
        if (points.length === 0) return "";
        return `${pathData} L ${points[points.length - 1].x} ${height - padding} L ${points[0].x} ${height - padding} Z`;
    }, [pathData, points, height]);

    const formatCurrency = (v: number) => {
        return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumSignificantDigits: 3 }).format(v);
    };

    return (
        <div className="w-full h-full relative group/chart" style={{ height }}>
            {/* Tooltip */}
            {hoveredPoint !== null && (
                <div
                    className="absolute z-50 pointer-events-none bg-white/90 backdrop-blur-md border border-slate-100 shadow-2xl rounded-xl p-2 sm:p-3 transform -translate-x-1/2 -translate-y-full mb-4 transition-all duration-200 max-w-[180px]"
                    style={{
                        left: `${Math.min(Math.max((points[hoveredPoint].x / width) * 100, 10), 90)}%`,
                        top: `${(points[hoveredPoint].y / height) * 100}%`
                    }}
                >
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">
                        {points[hoveredPoint].label}
                    </p>
                    <p className="text-sm font-black text-slate-900 whitespace-nowrap">
                        {formatCurrency(points[hoveredPoint].value)}
                    </p>
                </div>
            )}

            <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible" preserveAspectRatio="none">
                <defs>
                    <linearGradient id={`gradient-${color}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={color} stopOpacity="0.4" />
                        <stop offset="50%" stopColor={color} stopOpacity="0.1" />
                        <stop offset="100%" stopColor={color} stopOpacity="0" />
                    </linearGradient>

                    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                        <feGaussianBlur stdDeviation="6" result="blur" />
                        <feComposite in="SourceGraphic" in2="blur" operator="over" />
                    </filter>
                </defs>

                {/* Grid Lines */}
                {showGrid && [0, 0.25, 0.5, 0.75, 1].map((p) => (
                    <g key={p}>
                        <line
                            x1={padding}
                            y1={height - padding - (p * chartHeight)}
                            x2={width - padding}
                            y2={height - padding - (p * chartHeight)}
                            stroke="#f1f5f9"
                            strokeWidth="1.5"
                        />
                        {p > 0 && (
                            <text
                                x={padding - 10}
                                y={height - padding - (p * chartHeight) + 4}
                                textAnchor="end"
                                className="text-[10px] fill-slate-300 font-bold"
                            >
                                {Math.round((maxVal * p) / 1000000)}jt
                            </text>
                        )}
                    </g>
                ))}

                {/* Area Background */}
                <motion.path
                    key={`area-${data.length}-${color}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 1.2 }}
                    d={areaData}
                    fill={`url(#gradient-${color})`}
                />

                {/* Line Path with Glow */}
                <motion.path
                    key={`line-${data.length}-${color}`}
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: 1, opacity: 1 }}
                    transition={{ duration: 2, ease: "circOut" }}
                    d={pathData}
                    fill="none"
                    stroke={color}
                    strokeWidth={lineWidth}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    filter="url(#glow)"
                />

                {/* Vertical Indicator on hover */}
                {hoveredPoint !== null && (
                    <line
                        x1={points[hoveredPoint].x}
                        y1={padding}
                        x2={points[hoveredPoint].x}
                        y2={height - padding}
                        stroke={color}
                        strokeWidth="1"
                        strokeDasharray="4 4"
                        className="opacity-50"
                    />
                )}

                {/* Data Points Interactivity Layer */}
                {points.map((p, i) => (
                    <rect
                        key={`hit-${i}`}
                        x={p.x - (chartWidth / totalPoints / 2)}
                        y={0}
                        width={chartWidth / totalPoints}
                        height={height}
                        fill="transparent"
                        className="cursor-pointer"
                        onMouseEnter={() => setHoveredPoint(i)}
                        onMouseLeave={() => setHoveredPoint(null)}
                    />
                ))}

                {/* Visible Data Dots (fewer points only) */}
                {showDots && points.map((p, i) => (
                    <motion.circle
                        key={`dot-${i}`}
                        initial={{ scale: 0 }}
                        animate={{
                            scale: hoveredPoint === i ? 1.5 : 1,
                            fill: hoveredPoint === i ? color : "white"
                        }}
                        transition={{ duration: 0.2 }}
                        cx={p.x}
                        cy={p.y}
                        r={totalPoints <= 12 ? 6 : 4}
                        fill="white"
                        stroke={color}
                        strokeWidth={totalPoints <= 12 ? 4 : 2}
                        className="pointer-events-none shadow-xl"
                    />
                ))}

                {/* X-Axis Labels */}
                {showLabels && data.map((d, i) => (
                    (i % labelSkip === 0 || i === data.length - 1) && (
                        <text
                            key={`lbl-${i}`}
                            x={points[i]?.x}
                            y={height - 5}
                            textAnchor="middle"
                            className="text-[11px] fill-slate-400 font-black uppercase tracking-widest"
                        >
                            {d.label}
                        </text>
                    )
                ))}
            </svg>
        </div>
    );
}

