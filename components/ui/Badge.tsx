import { cn } from "@/lib/utils";

interface BadgeProps {
    children: React.ReactNode;
    variant?: "success" | "warning" | "danger" | "info" | "neutral" | "primary";
    className?: string;
}

export function Badge({ children, variant = "neutral", className }: BadgeProps) {
    const variants = {
        success: "bg-emerald-100 text-emerald-700 ",
        warning: "bg-amber-100 text-amber-700 ",
        danger: "bg-red-100 text-red-700 ",
        info: "bg-blue-100 text-blue-700 ",
        neutral: "bg-slate-100 text-slate-700 ",
        primary: "bg-primary/10 text-primary ",
    };

    return (
        <span
            className={cn(
                "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider",
                variants[variant],
                className
            )}
        >
            {children}
        </span>
    );
}
