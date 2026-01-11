import { useEffect, useState } from "react";
import { CheckCircle2, XCircle, X } from "lucide-react";

export type SnackbarType = "success" | "error" | "info";
export type SnackbarPosition =
  | "top-left"
  | "top-center"
  | "top-right"
  | "bottom-left"
  | "bottom-center"
  | "bottom-right";

interface SnackbarProps {
  message: string;
  type?: SnackbarType;
  isOpen: boolean;
  onClose: () => void;
  duration?: number;
  position?: SnackbarPosition;
}

export function Snackbar({
  message,
  type = "info",
  isOpen,
  onClose,
  duration = 3000,
  position = "bottom-right",
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
      ? "bg-green-50 dark:bg-green-900/40 border-green-200 dark:border-green-800 backdrop-blur-sm"
      : type === "error"
      ? "bg-red-50 dark:bg-red-900/40 border-red-200 dark:border-red-800 backdrop-blur-sm"
      : "bg-blue-50 dark:bg-blue-900/40 border-blue-200 dark:border-blue-800 backdrop-blur-sm";

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

  const positionClasses = {
    "top-left": "top-18 left-4",
    "top-center": "top-18 left-1/2 -translate-x-1/2",
    "top-right": "top-18 right-4",
    "bottom-left": "bottom-4 left-4",
    "bottom-center": "bottom-4 left-1/2 -translate-x-1/2",
    "bottom-right": "bottom-4 right-4",
  };

  const slideAnimation = position.startsWith("top")
    ? isVisible
      ? "translate-y-0"
      : "-translate-y-2"
    : isVisible
    ? "translate-y-0"
    : "translate-y-2";

  return (
    <div
      className={`fixed ${
        positionClasses[position]
      } z-50 flex items-center gap-3 px-4 py-3 rounded-lg border shadow-lg transition-all duration-300 transform ${slideAnimation} ${
        isVisible ? "opacity-100" : "opacity-0"
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
