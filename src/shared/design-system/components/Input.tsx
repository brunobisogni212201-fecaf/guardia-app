import React from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export function Input({
  label,
  error,
  hint,
  className = "",
  id,
  ...props
}: InputProps) {
  const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;
  
  return (
    <div className="space-y-2">
      {label && (
        <label 
          htmlFor={inputId}
          className="block text-sm font-medium text-[var(--color-base-300)]"
        >
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={`
          w-full px-4 py-3 text-base
          bg-[var(--color-base-900)] 
          border border-[var(--color-base-700)]
          rounded-xl
          text-[var(--color-base-100)]
          placeholder:text-[var(--color-base-600)]
          transition-all duration-200
          hover:border-[var(--color-base-600)]
          focus:outline-none focus:border-[var(--color-coral-400)] focus:ring-2 focus:ring-[rgba(244,114,102,0.15)]
          disabled:opacity-50 disabled:cursor-not-allowed
          ${error ? "border-[var(--color-error)] focus:border-[var(--color-error)] focus:ring-[rgba(220,38,38,0.15)]" : ""}
          ${className}
        `}
        {...props}
      />
      {error && (
        <p className="text-sm text-[var(--color-error)]">{error}</p>
      )}
      {hint && !error && (
        <p className="text-sm text-[var(--color-base-500)]">{hint}</p>
      )}
    </div>
  );
}

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export function Textarea({
  label,
  error,
  className = "",
  id,
  ...props
}: TextareaProps) {
  const textareaId = id || `textarea-${Math.random().toString(36).substr(2, 9)}`;
  
  return (
    <div className="space-y-2">
      {label && (
        <label 
          htmlFor={textareaId}
          className="block text-sm font-medium text-[var(--color-base-300)]"
        >
          {label}
        </label>
      )}
      <textarea
        id={textareaId}
        className={`
          w-full px-4 py-3 text-base min-h-[120px] resize-y
          bg-[var(--color-base-900)] 
          border border-[var(--color-base-700)]
          rounded-xl
          text-[var(--color-base-100)]
          placeholder:text-[var(--color-base-600)]
          transition-all duration-200
          hover:border-[var(--color-base-600)]
          focus:outline-none focus:border-[var(--color-coral-400)] focus:ring-2 focus:ring-[rgba(244,114,102,0.15)]
          disabled:opacity-50 disabled:cursor-not-allowed
          ${error ? "border-[var(--color-error)]" : ""}
          ${className}
        `}
        {...props}
      />
      {error && (
        <p className="text-sm text-[var(--color-error)]">{error}</p>
      )}
    </div>
  );
}
