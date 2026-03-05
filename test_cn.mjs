import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs) {
    return twMerge(clsx(inputs));
}

export function cnCorrect(...inputs) {
    return twMerge(clsx(...inputs));
}

console.log("cn with array:", cn("flex", "items-center", true && "text-white"));
console.log("cnCorrect with spread:", cnCorrect("flex", "items-center", true && "text-white"));
