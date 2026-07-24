import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// merge class names, used by the shadcn / animate-ui components
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
