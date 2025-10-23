import type { FC } from "react";
import { cn } from "../../lib/utils";

interface SpinnerProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

const sizeClasses = {
  sm: "w-4 h-4 border-2",
  md: "w-8 h-8 border-2",
  lg: "w-12 h-12 border-3",
};

export const Spinner: FC<SpinnerProps> = ({ className, size = "md" }) => {
  return (
    <div
      className={cn("animate-spin rounded-full border-primary border-t-transparent", sizeClasses[size], className)}
      role="status"
      aria-label="Ładowanie"
    >
      <span className="sr-only">Ładowanie...</span>
    </div>
  );
};
