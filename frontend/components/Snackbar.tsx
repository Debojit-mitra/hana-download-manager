import { useEffect, useState } from "react";
import { CheckCircle2, XCircle, X } from "lucide-react";

export type SnackbarType = "success" | "error" | "info";

interface SnackbarProps {
  message: string;
  type?: SnackbarType;
  isOpen: boolean;
  onClose: () => void;
  duration?: number;
}

export function Snackbar({
  message,
  type = "info",
  isOpen,
  onClose,
  duration = 3000,
}: SnackbarProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(onClose, 300); // Wait for exit animation
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [isOpen, duration, onClose]);

  if (!isOpen && !isVisible) return null;

  const bgColor =
    type === "success"
      ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
      : type === "error"
      ? "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800"
      : "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800";

  const textColor =
    type === "success"
      ? "text-green-800 dark:text-green-300"
      : type === "error"
      ? "text-red-800 dark:text-red-300"
      : "text-blue-800 dark:text-blue-300";

  const Icon =
    type === "success"
      ? CheckCircle2
      : type === "error"
      ? XCircle
      : CheckCircle2;

  return (
    <div
      className={`fixed bottom-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-lg border shadow-lg transition-all duration-300 transform ${
        isVisible ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
      } ${bgColor}`}
    >
      <Icon className={`w-5 h-5 ${textColor}`} />
      <p className={`text-sm font-medium ${textColor}`}>{message}</p>
      <button
        onClick={() => {
          setIsVisible(false);
          setTimeout(onClose, 300);
        }}
        className={`ml-2 p-1 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors ${textColor}`}
      >
        <X size={14} />
      </button>
    </div>
  );
}
