import React from "react";

interface TimelineItem {
  id: string;
  date: string;
  title: string;
  description?: string;
  type?: "upload" | "edit" | "share" | "verification";
  active?: boolean;
}

interface TimelineProps {
  items: TimelineItem[];
  className?: string;
}

const typeConfig = {
  upload: { color: "bg-[var(--color-success)]", label: "Upload" },
  edit: { color: "bg-[var(--color-info)]", label: "Editado" },
  share: { color: "bg-[var(--color-lavender-400)]", label: "Compartilhado" },
  verification: { color: "bg-[var(--color-coral-500)]", label: "Verificado" },
};

export function Timeline({ items, className = "" }: TimelineProps) {
  return (
    <div className={`relative pl-8 ${className}`}>
      {/* Line */}
      <div className="absolute left-[11px] top-4 bottom-4 w-[2px] bg-[var(--color-base-700)]" />
      
      {items.map((item, index) => {
        const config = item.type ? typeConfig[item.type] : typeConfig.upload;
        const isLast = index === items.length - 1;
        
        return (
          <div key={item.id} className={`relative pb-6 ${isLast ? "pb-0" : ""}`}>
            {/* Marker */}
            <div
              className={`
                absolute left-[-17px] top-1
                w-3 h-3 rounded-full
                border-2 border-[var(--color-base-900)]
                ${item.active ? config.color : "bg-[var(--color-base-600)]"}
              `}
            />
            
            {/* Content */}
            <div className="bg-[var(--color-base-900)] border border-[var(--color-base-800)] rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-[var(--color-base-500)]">
                  {item.date}
                </span>
                {item.type && (
                  <span className={`text-xs px-2 py-0.5 rounded-full text-white ${config.color}`}>
                    {config.label}
                  </span>
                )}
              </div>
              <h4 className="font-semibold text-[var(--color-base-100)] mb-1">
                {item.title}
              </h4>
              {item.description && (
                <p className="text-sm text-[var(--color-base-400)]">
                  {item.description}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

interface TimelineFileProps {
  name: string;
  size: string;
  hash: string;
  date: string;
  type: "pdf" | "image" | "document";
}

export function TimelineFile({ name, size, hash, date, type }: TimelineFileProps) {
  const iconMap = {
    pdf: "M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z",
    image: "M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z",
    document: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
  };

  return (
    <div className="flex items-center gap-4 p-4 bg-[var(--color-base-900)] border border-[var(--color-base-800)] rounded-xl">
      <div className="w-10 h-10 rounded-lg bg-[var(--color-base-800)] flex items-center justify-center">
        <svg className="w-5 h-5 text-[var(--color-base-400)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={iconMap[type]} />
        </svg>
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-[var(--color-base-100)] truncate">{name}</p>
        <div className="flex items-center gap-3 text-xs text-[var(--color-base-500)]">
          <span>{size}</span>
          <span className="font-mono">{hash.slice(0, 8)}...</span>
        </div>
      </div>
      <span className="text-xs text-[var(--color-base-500)]">{date}</span>
    </div>
  );
}
