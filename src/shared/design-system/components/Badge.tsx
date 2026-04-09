import React from "react";

type BadgeVariant = "success" | "warning" | "error" | "info" | "risk-low" | "risk-medium" | "risk-high" | "risk-critical";

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

const variantClasses: Record<BadgeVariant, string> = {
  success: "bg-[var(--color-success-light)] text-[var(--color-success)]",
  warning: "bg-[var(--color-warning-light)] text-[var(--color-warning)]",
  error: "bg-[var(--color-error-light)] text-[var(--color-error)]",
  info: "bg-[var(--color-info-light)] text-[var(--color-info)]",
  "risk-low": "bg-[var(--color-risk-low-bg)] text-[var(--color-risk-low-text)] border border-[var(--color-risk-low-border)]",
  "risk-medium": "bg-[var(--color-risk-medium-bg)] text-[var(--color-risk-medium-text)] border border-[var(--color-risk-medium-border)]",
  "risk-high": "bg-[var(--color-risk-high-bg)] text-[var(--color-risk-high-text)] border border-[var(--color-risk-high-border)]",
  "risk-critical": "bg-[var(--color-risk-critical-bg)] text-[var(--color-risk-critical-text)] border border-[var(--color-risk-critical-border)]",
};

export function Badge({ children, variant = "info", className = "" }: BadgeProps) {
  return (
    <span
      className={`
        inline-flex items-center px-3 py-1
        text-xs font-semibold rounded-full uppercase tracking-wide
        ${variantClasses[variant]}
        ${className}
      `}
    >
      {children}
    </span>
  );
}

export function getRiskBadgeVariant(risk: "low" | "medium" | "high" | "critical"): BadgeVariant {
  const map: Record<string, BadgeVariant> = {
    low: "risk-low",
    medium: "risk-medium",
    high: "risk-high",
    critical: "risk-critical",
  };
  return map[risk] || "info";
}
