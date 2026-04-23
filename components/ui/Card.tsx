"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface CardProps {
    children: ReactNode;
    className?: string;
    delay?: number;
    onClick?: () => void;
    noGlass?: boolean;
}

export function Card({ children, className, delay = 0, onClick, noGlass = false }: CardProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay }}
            className={cn(
                noGlass ? "bg-white" : "glass",
                "rounded-2xl p-6 relative overflow-hidden card-hover",
                className
            )}
            onClick={onClick}
        >
            {children}
        </motion.div>
    );
}

export function CardHeader({ children, className }: { children: ReactNode; className?: string }) {
    return <div className={cn("mb-4", className)}>{children}</div>;
}

export function CardContent({ children, className }: { children: ReactNode; className?: string }) {
    return <div className={cn("", className)}>{children}</div>;
}

export function CardFooter({ children, className }: { children: ReactNode; className?: string }) {
    return <div className={cn("mt-6 pt-4 border-t border-slate-100 ", className)}>{children}</div>;
}
