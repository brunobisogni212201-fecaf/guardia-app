import React from "react";

interface TabsProps {
  tabs: { id: string; label: string }[];
  activeTab: string;
  onChange: (id: string) => void;
  className?: string;
}

export function Tabs({ tabs, activeTab, onChange, className = "" }: TabsProps) {
  return (
    <div className={`flex gap-1 p-1 bg-[var(--color-base-900)] rounded-xl border border-[var(--color-base-800)] ${className}`}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`
            flex-1 px-4 py-3 text-sm font-semibold rounded-lg
            transition-all duration-200 border-none cursor-pointer
            ${activeTab === tab.id
              ? "bg-[var(--color-coral-500)] text-white"
              : "text-[var(--color-base-400)] hover:text-[var(--color-base-200)] hover:bg-[var(--color-base-800)]"
            }
          `}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
