import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Utility function to merge Tailwind CSS classes with proper deduplication
 *
 * Uses clsx to handle conditional class names (strings, objects, arrays, etc.)
 * and twMerge to intelligently merge Tailwind classes, resolving conflicts
 *
 * Example:
 * cn('px-2 py-1', isActive && 'bg-blue-500', { 'text-white': isActive })
 *
 * @param inputs - Class values that can be strings, objects, arrays, or conditional expressions
 * @returns Merged and deduplicated class string
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatBytes(bytes: number, decimals = 2) {
  if (!+bytes) return "0 Bytes";

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

// Speed Limit Slider Helpers
// Range 0-100
// 0-30: 0 - 1000 KB/s
// 30-100: 1000 KB/s - 51200 KB/s (50 MB/s)

export function sliderToSpeed(value: number): number {
  if (value <= 0) return 0;
  if (value >= 100) return 51200; // Exact 50 MB/s
  if (value <= 30) {
    return Math.round(value * (1000 / 30));
  }
  return Math.round(1000 + (value - 30) * ((51200 - 1000) / 70));
}

export function speedToSlider(speed: number): number {
  if (speed <= 0) return 0;
  if (speed >= 51200) return 100;
  if (speed <= 1000) {
    return speed * (30 / 1000);
  }
  return 30 + (speed - 1000) * (70 / (51200 - 1000));
}
