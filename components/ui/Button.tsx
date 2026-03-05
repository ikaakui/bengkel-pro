"use client";

import { HTMLMotionProps, motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { forwardRef, ReactNode } from "react";

interface ButtonProps extends HTMLMotionProps<"button"> {
    variant?: "primary" | "secondary" | "outline" | "ghost" | "danger" | "success" | "warning";
    size?: "sm" | "md" | "lg";
    isLoading?: boolean;
    children?: ReactNode;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant = "primary", size = "md", isLoading, children, ...props }, ref) => {
        const variants = {
            primary: "bg-blue-600 text-white hover:bg-blue-700 shadow-blue-500/20",
            secondary: "bg-slate-600 text-white hover:bg-slate-700 shadow-slate-500/20",
            outline: "border-2 border-slate-200 text-foreground hover:bg-slate-100 :bg-slate-800",
            ghost: "text-foreground hover:bg-slate-100 :bg-slate-800",
            danger: "bg-red-600 text-white hover:bg-red-700 shadow-red-500/20",
            success: "bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-500/20",
            warning: "bg-amber-500 text-white hover:bg-amber-600 shadow-amber-500/20",
        };

        const sizes = {
            sm: "px-3 py-1.5 text-sm",
            md: "px-4 py-2",
            lg: "px-6 py-3 text-lg",
        };

        return (
            <motion.button
                ref={ref}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={cn(
                    "inline-flex items-center justify-center rounded-xl font-medium transition-all shadow-lg disabled:opacity-50 disabled:pointer-events-none",
                    variants[variant],
                    sizes[size],
                    className
                )}
                {...props}
            >
                {isLoading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                ) : null}
                {children}
            </motion.button>
        );
    }
);

Button.displayName = "Button";

export { Button };
