import React from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  children: React.ReactNode;
}

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  children,
  className = "",
  disabled,
  ...props
}: ButtonProps) {
  const baseClasses = "inline-flex items-center justify-center gap-2 font-semibold rounded-xl border cursor-pointer transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[#09090B] disabled:opacity-50 disabled:cursor-not-allowed";
  
  const variantClasses = {
    primary: "bg-[var(--color-coral-500)] text-white border-transparent hover:bg-[var(--color-coral-400)] focus-visible:ring-[var(--color-coral-400)] active:bg-[var(--color-coral-600)]",
    secondary: "bg-[var(--color-base-800)] text-[var(--color-base-100)] border-[var(--color-base-700)] hover:bg-[var(--color-base-700)] focus-visible:ring-[var(--color-base-600)]",
    ghost: "bg-transparent text-[var(--color-base-300)] border-transparent hover:bg-[var(--color-base-800)] hover:text-[var(--color-base-100)] focus-visible:ring-[var(--color-base-600)]",
    danger: "bg-[var(--color-error)] text-white border-transparent hover:bg-[#B91C1C] focus-visible:ring-[var(--color-error)]",
  };
  
  const sizeClasses = {
    sm: "px-4 py-2 text-xs",
    md: "px-6 py-3 text-sm",
    lg: "px-8 py-4 text-base",
  };

  return (
    <button
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      )}
      {children}
    </button>
  );
}
