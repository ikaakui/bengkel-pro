"use client";

import { motion } from "framer-motion";
import { useMemo, useState } from "react";

interface BranchData {
    name: string;
    color: string;
    values: number[];
}

interface BranchComparisonChartProps {
    branches: BranchData[];
    labels: string[];
    height?: number;
}

export default function BranchComparisonChart({
    branches,
    labels,
    height = 320,
}: BranchComparisonChartProps) {
    const [hoveredGroup, setHoveredGroup] = useState<number | null>(null);
    const [hoveredBranch, setHoveredBranch] = useState<number | null>(null);

    const maxVal = useMemo(() => {
        const allVals = branches.flatMap((b) => b.values);
        return Math.max(...allVals, 1);
    }, [branches]);

    const groupCount = labels.length;
    const padding = { top: 40, right: 20, bottom: groupCount > 12 ? 80 : 60, left: 20 };
    const chartWidth = 800;
    const chartHeight = height - padding.top - padding.bottom;
    const barCount = branches.length;
    const groupWidth = (chartWidth - padding.left - padding.right) / groupCount;

    // Dynamic sizing to prevent "loose/empty" look for small datasets (2y, 3y)
    const barWidth = useMemo(() => {
        const base = groupWidth / (barCount + 1.2);
        if (groupCount <= 3) return Math.min(base, 100);
        if (groupCount <= 5) return Math.min(base, 70);
        if (groupCount <= 12) return Math.min(base, 50);
        if (groupCount <= 24) return 20;
        return 12;
    }, [groupWidth, barCount, groupCount]);

    const barGap = groupCount > 24 ? 2 : groupCount > 12 ? 4 : groupCount <= 5 ? 12 : 8;

    const formatRp = (v: number) => {
        if (v >= 1000000) return `${(v / 1000000).toFixed(1)}jt`;
        if (v >= 1000) return `${(v / 1000).toFixed(0)}rb`;
        return v.toString();
    };

    const formatFullRp = (v: number) => {
        return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumSignificantDigits: 3 }).format(v);
    };

    return (
        <div className="w-full relative group/bcomp" style={{ height }}>
            {/* Tooltip */}
            {hoveredGroup !== null && hoveredBranch !== null && (
                <div
                    className="absolute z-50 pointer-events-none bg-white/95 backdrop-blur-md border border-slate-100 shadow-2xl rounded-xl p-3 transform -translate-x-1/2 -translate-y-full mb-6 transition-all duration-200"
                    style={{
                        left: `${((padding.left + hoveredGroup * groupWidth + groupWidth / 2) / chartWidth) * 100}%`,
                        top: `${padding.top + chartHeight - ((branches[hoveredBranch].values[hoveredGroup] / maxVal) * chartHeight)}px`
                    }}
                >
                    <div className="flex items-center gap-2 mb-1">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: branches[hoveredBranch].color }} />
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">
                            {branches[hoveredBranch].name} • {labels[hoveredGroup]}
                        </p>
                    </div>
                    <p className="text-sm font-black text-slate-900 whitespace-nowrap">
                        {formatFullRp(branches[hoveredBranch].values[hoveredGroup])}
                    </p>
                </div>
            )}

            <svg
                viewBox={`0 0 ${chartWidth} ${height}`}
                className="w-full h-full overflow-visible"
                preserveAspectRatio="xMidYMid meet"
            >
                <defs>
                    {branches.map((b, i) => (
                        <linearGradient key={`grad-${i}`} id={`bar-grad-${i}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={b.color} />
                            <stop offset="100%" stopColor={b.color} stopOpacity="0.8" />
                        </linearGradient>
                    ))}
                    <filter id="bar-shadow" x="-10%" y="-10%" width="120%" height="120%">
                        <feGaussianBlur stdDeviation="3" result="shadow" />
                        <feOffset dx="0" dy="2" result="offsetShadow" />
                        <feComposite in="SourceGraphic" in2="offsetShadow" operator="over" />
                    </filter>
                </defs>

                {/* Grid Lines */}
                {[0, 0.25, 0.5, 0.75, 1].map((p) => {
                    const y = padding.top + chartHeight - p * chartHeight;
                    return (
                        <g key={p}>
                            <line
                                x1={padding.left}
                                y1={y}
                                x2={chartWidth - padding.right}
                                y2={y}
                                stroke="#f1f5f9"
                                strokeWidth="1.5"
                            />
                            <text
                                x={padding.left - 5}
                                y={y + 4}
                                textAnchor="end"
                                className="text-[10px] fill-slate-300 font-bold"
                            >
                                {formatRp(Math.round(maxVal * p))}
                            </text>
                        </g>
                    );
                })}

                {/* Bars */}
                {labels.map((label, gi) => {
                    const groupX =
                        padding.left +
                        gi * groupWidth +
                        groupWidth / 2 -
                        ((barCount * barWidth + (barCount - 1) * barGap) / 2);

                    return (
                        <g key={label}>
                            {branches.map((branch, bi) => {
                                const val = branch.values[gi] || 0;
                                const barH = Math.max((val / maxVal) * chartHeight, 4);
                                const x = groupX + bi * (barWidth + barGap);
                                const y = padding.top + chartHeight - barH;
                                const isHovered = hoveredGroup === gi && hoveredBranch === bi;

                                return (
                                    <g key={`${label}-${branch.name}`}>
                                        <motion.rect
                                            initial={{ height: 0, y: padding.top + chartHeight }}
                                            animate={{
                                                height: barH,
                                                y,
                                                fillOpacity: hoveredGroup === null || isHovered ? 1 : 0.3
                                            }}
                                            transition={{
                                                height: { duration: 1, delay: gi * 0.05 + bi * 0.1, ease: "circOut" },
                                                y: { duration: 1, delay: gi * 0.05 + bi * 0.1, ease: "circOut" },
                                                fillOpacity: { duration: 0.2 }
                                            }}
                                            x={x}
                                            width={barWidth}
                                            rx={groupCount > 24 ? 3 : groupCount > 12 ? 5 : 10}
                                            ry={groupCount > 24 ? 3 : groupCount > 12 ? 5 : 10}
                                            fill={`url(#bar-grad-${bi})`}
                                            className="cursor-pointer"
                                            onMouseEnter={() => {
                                                setHoveredGroup(gi);
                                                setHoveredBranch(bi);
                                            }}
                                            onMouseLeave={() => {
                                                setHoveredGroup(null);
                                                setHoveredBranch(null);
                                            }}
                                            filter={isHovered ? "url(#bar-shadow)" : "none"}
                                        />

                                        {/* Glow highlight on top of bar */}
                                        <rect
                                            x={x} y={y} width={barWidth} height={10} rx={10}
                                            fill="white" fillOpacity="0.2" className="pointer-events-none"
                                        />
                                    </g>
                                );
                            })}

                            {/* X-Axis Label */}
                            <text
                                x={padding.left + gi * groupWidth + groupWidth / 2}
                                y={height - 15}
                                textAnchor={groupCount > 12 ? "end" : "middle"}
                                transform={groupCount > 12 ? `rotate(-45, ${padding.left + gi * groupWidth + groupWidth / 2}, ${height - 15})` : undefined}
                                className={cn(
                                    "font-black uppercase tracking-widest transition-colors duration-200",
                                    hoveredGroup === gi ? "fill-slate-900" : "fill-slate-400",
                                    groupCount > 30 ? "text-[7px]" : groupCount > 12 ? "text-[9px]" : "text-[12px]"
                                )}
                                style={{ display: groupCount > 30 && gi % Math.ceil(groupCount / 15) !== 0 ? 'none' : 'block' }}
                            >
                                {label}
                            </text>
                        </g>
                    );
                })}
            </svg>

            {/* Legend */}
            <div className="flex items-center justify-center gap-10 mt-2">
                {branches.map((b, i) => (
                    <div
                        key={b.name}
                        className={cn(
                            "flex items-center gap-3 transition-opacity duration-200",
                            hoveredBranch !== null && hoveredBranch !== i ? "opacity-30" : "opacity-100"
                        )}
                    >
                        <div
                            className="w-4 h-4 rounded-xl shadow-lg ring-4 ring-white"
                            style={{ backgroundColor: b.color }}
                        />
                        <span className="text-[11px] font-black text-slate-600 uppercase tracking-[0.2em]">
                            {b.name}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}
function cn(...classes: any[]) {
    return classes.filter(Boolean).join(' ');
}

