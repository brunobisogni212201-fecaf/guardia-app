import React from "react";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  highlight?: boolean;
}

export function Card({ children, className = "", hover = false, highlight = false }: CardProps) {
  return (
    <div
      className={`
        bg-[var(--color-base-900)] 
        border border-[var(--color-base-800)] 
        rounded-2xl 
        p-6 
        transition-all duration-200
        ${hover ? "hover:border-[var(--color-base-700)] hover:-translate-y-0.5 hover:shadow-lg cursor-pointer" : ""}
        ${highlight ? "border-[var(--color-coral-500)] bg-gradient-to-br from-[var(--color-base-900)] to-[var(--color-base-800)]" : ""}
        ${className}
      `}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`mb-4 ${className}`}>
      {children}
    </div>
  );
}

export function CardTitle({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <h3 className={`text-xl font-bold text-[var(--color-base-50)] m-0 ${className}`}>
      {children}
    </h3>
  );
}

export function CardDescription({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={`text-sm text-[var(--color-base-400)] mt-1 ${className}`}>
      {children}
    </p>
  );
}

export function CardContent({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      {children}
    </div>
  );
}

export function CardFooter({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`mt-4 pt-4 border-t border-[var(--color-base-800)] flex items-center gap-3 ${className}`}>
      {children}
    </div>
  );
}
