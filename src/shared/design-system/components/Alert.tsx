import React from "react";

type AlertVariant = "info" | "success" | "warning" | "error";

interface AlertProps {
  children: React.ReactNode;
  variant?: AlertVariant;
  title?: string;
  className?: string;
}

const variantConfig: Record<AlertVariant, { bg: string; border: string; text: string; icon: string }> = {
  info: {
    bg: "bg-[var(--color-info-light)]",
    border: "border-blue-200",
    text: "text-blue-800",
    icon: "M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
  },
  success: {
    bg: "bg-[var(--color-success-light)]",
    border: "border-emerald-200",
    text: "text-emerald-800",
    icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z",
  },
  warning: {
    bg: "bg-[var(--color-warning-light)]",
    border: "border-amber-200",
    text: "text-amber-800",
    icon: "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z",
  },
  error: {
    bg: "bg-[var(--color-error-light)]",
    border: "border-red-200",
    text: "text-red-800",
    icon: "M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z",
  },
};

export function Alert({ children, variant = "info", title, className = "" }: AlertProps) {
  const config = variantConfig[variant];
  
  return (
    <div
      className={`
        p-4 rounded-xl border
        flex items-start gap-3
        ${config.bg} ${config.border}
        ${className}
      `}
      role="alert"
    >
      <svg
        className={`w-5 h-5 mt-0.5 flex-shrink-0 ${config.text}`}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={config.icon} />
      </svg>
      <div className="flex-1">
        {title && (
          <h4 className={`font-semibold mb-1 ${config.text}`}>{title}</h4>
        )}
        <div className={`text-sm ${config.text}`}>{children}</div>
      </div>
    </div>
  );
}
