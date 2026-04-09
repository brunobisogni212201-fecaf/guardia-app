"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/shared/design-system/components/Button";
import { Card, CardTitle, CardDescription } from "@/shared/design-system/components/Card";

interface GeoStats {
  regions: { name: string; count: number }[];
  total: number;
}

const quickActions = [
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-1.227l-4.082 1.718A5.963 5.963 0 003 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
    ),
    title: "Analisar conversa",
    description: "Cole uma conversa e receba insights",
    href: "/analyze",
    color: "coral",
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
    title: "Íris Registro",
    description: "Preserve suas evidências com segurança",
    href: "/evidence",
    color: "petroleum",
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    ),
    title: "Busca Preventiva",
    description: "Consulte CPF e antecedentes",
    href: "/buscas",
    color: "lavender",
  },
];

const recentActivity = [
  {
    type: "analysis",
    title: "Análise de conversa",
    date: "Há 2 horas",
    risk: "medium",
  },
  {
    type: "evidence",
    title: "Evidência adicionada",
    date: "Ontem",
    risk: null,
  },
];

export default function Dashboard() {
  const router = useRouter();
  const [geoStats, setGeoStats] = useState<GeoStats | null>(null);

  useEffect(() => {
    fetch("/api/geo/heatmap")
      .then((res) => res.json())
      .then((data) => setGeoStats(data))
      .catch(() => setGeoStats(null));
  }, []);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/signout", { method: "POST" });
      router.push("/");
    } catch (error) {
      console.error("Erro ao sair:", error);
    }
  };

  return (
    <main className="min-h-screen bg-[var(--color-base-950)]">
      <nav className="fixed top-0 left-0 right-0 z-40 bg-[var(--color-base-900)]/80 backdrop-blur-xl border-b border-[var(--color-base-800)]">
        <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
          <Link href="/dashboard" className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-[var(--color-coral-400)] animate-pulse" />
            <h1 className="text-xl font-black tracking-tight">
              <span className="text-[var(--color-coral-400)]">ÍRIS</span>
            </h1>
          </Link>
          <div className="flex items-center gap-6">
            <Link href="/analyze" className="text-sm text-[var(--color-base-400)] hover:text-white transition-colors">
              Analisar
            </Link>
            <Link href="/evidence" className="text-sm text-[var(--color-base-400)] hover:text-white transition-colors">
              Registro
            </Link>
            <Link href="/buscas" className="text-sm text-[var(--color-base-400)] hover:text-white transition-colors">
              Busca
            </Link>
            <button onClick={handleLogout} className="text-sm text-[var(--color-base-400)] hover:text-white transition-colors">
              Sair
            </button>
          </div>
        </div>
      </nav>

      <div className="pt-28 px-6 pb-12">
        <div className="max-w-6xl mx-auto">
          <div className="mb-10">
            <h2 className="text-3xl md:text-4xl font-bold mb-2">
              Bem-vinda ao <span className="text-[var(--color-coral-400)]">Íris</span>
            </h2>
            <p className="text-[var(--color-base-400)]">
              Sua privacidade e segurança são nossa prioridade.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 mb-10">
            <div className="bg-[var(--color-base-900)] border border-[var(--color-base-800)] rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <span className="text-[var(--color-base-500)] text-sm">Análises realizadas</span>
                <div className="w-8 h-8 rounded-lg bg-[var(--color-coral-500)]/10 flex items-center justify-center">
                  <svg className="w-4 h-4 text-[var(--color-coral-400)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
              </div>
              <div className="text-4xl font-bold text-[var(--color-base-50)]">0</div>
            </div>

            <div className="bg-[var(--color-base-900)] border border-[var(--color-base-800)] rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <span className="text-[var(--color-base-500)] text-sm">Evidências salvas</span>
                <div className="w-8 h-8 rounded-lg bg-[var(--color-petroleum-500)]/10 flex items-center justify-center">
                  <svg className="w-4 h-4 text-[var(--color-petroleum-400)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
              </div>
              <div className="text-4xl font-bold text-[var(--color-base-50)]">0</div>
            </div>

            <div className="bg-[var(--color-base-900)] border border-[var(--color-base-800)] rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <span className="text-[var(--color-base-500)] text-sm">Buscas realizadas</span>
                <div className="w-8 h-8 rounded-lg bg-[var(--color-lavender-500)]/10 flex items-center justify-center">
                  <svg className="w-4 h-4 text-[var(--color-lavender-400)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>
              <div className="text-4xl font-bold text-[var(--color-base-50)]">0</div>
            </div>
          </div>

          <h3 className="text-lg font-semibold mb-4 text-[var(--color-base-300)]">Ações rápidas</h3>
          <div className="grid md:grid-cols-3 gap-4 mb-10">
            {quickActions.map((action, i) => (
              <Link key={i} href={action.href}>
                <Card hover className="h-full">
                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      action.color === "coral" ? "bg-[var(--color-coral-500)]/10 text-[var(--color-coral-400)]" :
                      action.color === "petroleum" ? "bg-[var(--color-petroleum-500)]/10 text-[var(--color-petroleum-400)]" :
                      "bg-[var(--color-lavender-500)]/10 text-[var(--color-lavender-400)]"
                    }`}>
                      {action.icon}
                    </div>
                    <div>
                      <CardTitle>{action.title}</CardTitle>
                      <CardDescription>{action.description}</CardDescription>
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>

          <h3 className="text-lg font-semibold mb-4 text-[var(--color-base-300)]">Atividade recente</h3>
          <div className="bg-[var(--color-base-900)] border border-[var(--color-base-800)] rounded-2xl p-6">
            {recentActivity.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 rounded-full bg-[var(--color-base-800)] mx-auto mb-4 flex items-center justify-center">
                  <svg className="w-8 h-8 text-[var(--color-base-600)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                  </svg>
                </div>
                <p className="text-[var(--color-base-400)] mb-2">Nenhuma atividade ainda</p>
                <p className="text-sm text-[var(--color-base-500)]">Comece fazendo uma análise ou adicionando uma evidência.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {recentActivity.map((item, i) => (
                  <div key={i} className="flex items-center justify-between py-3 border-b border-[var(--color-base-800)] last:border-0">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${
                        item.risk === "high" ? "bg-[var(--color-warning)]" :
                        item.risk === "medium" ? "bg-[var(--color-warning)]" :
                        "bg-[var(--color-base-600)]"
                      }`} />
                      <div>
                        <p className="font-medium text-[var(--color-base-100)]">{item.title}</p>
                        <p className="text-sm text-[var(--color-base-500)]">{item.date}</p>
                      </div>
                    </div>
                    {item.risk && (
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        item.risk === "high" ? "bg-[var(--color-risk-high-bg)] text-[var(--color-risk-high-text)]" :
                        "bg-[var(--color-risk-medium-bg)] text-[var(--color-risk-medium-text)]"
                      }`}>
                        {item.risk === "high" ? "Alto" : "Médio"}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-10 p-6 bg-[var(--color-petroleum-500)]/5 border border-[var(--color-petroleum-500)]/20 rounded-2xl">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-[var(--color-petroleum-500)]/20 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-[var(--color-petroleum-400)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <div>
                <h4 className="font-semibold text-[var(--color-base-100)] mb-1">Sua privacidade é garantida</h4>
                <p className="text-sm text-[var(--color-base-400)]">
                  Todos os seus dados são criptografados e apenas você tem acesso. Não compartilhamos informações com terceiros.
                </p>
              </div>
            </div>
          </div>

          {geoStats && geoStats.total > 0 && (
            <div className="mt-10">
              <h3 className="text-lg font-semibold mb-4 text-[var(--color-base-300)]">Distribuição geográfica</h3>
              <div className="bg-[var(--color-base-900)] border border-[var(--color-base-800)] rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-3 h-3 rounded-full bg-[var(--color-coral-400)] animate-pulse" />
                  <span className="text-[var(--color-base-400)] text-sm">
                    {geoStats.total.toLocaleString("pt-BR")} mulheres protegidas no Brasil
                  </span>
                </div>
                <div className="space-y-3">
                  {geoStats.regions.slice(0, 5).map((region, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="w-24 text-sm text-[var(--color-base-400)] truncate">{region.name}</div>
                      <div className="flex-1 h-2 bg-[var(--color-base-800)] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-[var(--color-coral-500)] to-[var(--color-coral-400)] rounded-full transition-all"
                          style={{ width: `${(region.count / geoStats.regions[0].count) * 100}%` }}
                        />
                      </div>
                      <div className="w-12 text-right text-sm text-[var(--color-base-300)]">{region.count}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
