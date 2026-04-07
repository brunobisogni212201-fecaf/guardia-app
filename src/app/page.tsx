"use client";

import { useState } from "react";
import type { ViolenceAnalysis, RiskLevel } from "@/types";

function RiskBadge({ level }: { level: RiskLevel }) {
  const styles = {
    low: "bg-green-500/20 text-green-400 border-green-500/30",
    medium: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    high: "bg-orange-500/20 text-orange-400 border-orange-500/30",
    critical: "bg-red-500/20 text-red-400 border-red-500/30",
  };

  const labels = {
    low: "Baixo",
    medium: "Médio",
    high: "Alto",
    critical: "Crítico",
  };

  return (
    <span
      className={`px-3 py-1 rounded-full text-sm font-medium border ${styles[level]}`}
    >
      {labels[level]}
    </span>
  );
}

function ScoreGauge({ score }: { score: number }) {
  const circumference = 2 * Math.PI * 45;
  const strokeDashoffset = circumference - (score / 10) * circumference;
  const color =
    score >= 7 ? "#ef4444" : score >= 4 ? "#f59e0b" : "#22c55e";

  return (
    <div className="relative w-32 h-32">
      <svg className="w-full h-full transform -rotate-90">
        <circle
          cx="64"
          cy="64"
          r="45"
          stroke="currentColor"
          strokeWidth="8"
          fill="none"
          className="text-zinc-700"
        />
        <circle
          cx="64"
          cy="64"
          r="45"
          stroke={color}
          strokeWidth="8"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className="transition-all duration-1000"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold" style={{ color }}>
          {score.toFixed(1)}
        </span>
        <span className="text-xs text-zinc-400">/10</span>
      </div>
    </div>
  );
}

export default function Home() {
  const [text, setText] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<{
    score: number;
    riskLevel: RiskLevel;
    patterns: ViolenceAnalysis["patterns"];
    summary: string;
    recommendations: string[];
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async () => {
    if (!text.trim()) return;

    setIsAnalyzing(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, sourceType: "text" }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erro ao analisar");
      }

      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido");
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="max-w-4xl mx-auto px-6 py-12">
        <header className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-2">
            <span className="text-rose-400">Guardiã</span>
          </h1>
          <p className="text-zinc-400">
            Analisador de conversas para proteção de mulheres
          </p>
        </header>

        <section className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Cole a conversa do WhatsApp
            </label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={`Cole aqui a conversa exportada do WhatsApp ou o texto colado...\n\nExemplo:\n12/03/2024 14:30 - João: Oi amor, onde você está?\n12/03/2024 14:31 - Maria: No trabalho ainda\n12/03/2024 14:32 - João: Já falou com aquele amigo seu de novo?`}
              className="w-full h-64 bg-zinc-900 border border-zinc-700 rounded-lg p-4 text-sm font-mono text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-rose-400 focus:ring-1 focus:ring-rose-400 resize-none"
            />
          </div>

          <button
            onClick={handleAnalyze}
            disabled={!text.trim() || isAnalyzing}
            className="w-full py-3 bg-rose-500 hover:bg-rose-600 disabled:bg-zinc-700 disabled:cursor-not-allowed rounded-lg font-medium transition-colors"
          >
            {isAnalyzing ? (
              <span className="flex items-center justify-center gap-2">
                <svg
                  className="animate-spin h-5 w-5"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                Analisando...
              </span>
            ) : (
              "Analisar Conversa"
            )}
          </button>
        </section>

        {error && (
          <div className="mt-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400">
            {error}
          </div>
        )}

        {result && (
          <section className="mt-12 space-y-6">
            <h2 className="text-2xl font-bold">Resultado da Análise</h2>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-6 flex flex-col items-center">
                <h3 className="text-lg font-medium text-zinc-300 mb-4">
                  Score de Risco
                </h3>
                <ScoreGauge score={result.score} />
                <div className="mt-4">
                  <RiskBadge level={result.riskLevel} />
                </div>
              </div>

              <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-6">
                <h3 className="text-lg font-medium text-zinc-300 mb-4">
                  Contato Identificado
                </h3>
                <p className="text-zinc-400 text-sm">{result.summary}</p>
              </div>
            </div>

            {result.patterns.length > 0 && (
              <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-6">
                <h3 className="text-lg font-medium text-zinc-300 mb-4">
                  Padrões Identificados
                </h3>
                <ul className="space-y-3">
                  {result.patterns.map((pattern, index) => (
                    <li
                      key={index}
                      className="flex items-start gap-3 p-3 bg-zinc-800 rounded-lg"
                    >
                      <span
                        className={`mt-1 w-2 h-2 rounded-full ${
                          pattern.severity >= 7
                            ? "bg-red-500"
                            : pattern.severity >= 4
                              ? "bg-yellow-500"
                              : "bg-green-500"
                        }`}
                      />
                      <div>
                        <span className="font-medium text-rose-400 capitalize">
                          {pattern.type.replace("_", " ")}
                        </span>
                        <p className="text-sm text-zinc-400 mt-1">
                          {pattern.description}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {result.recommendations.length > 0 && (
              <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-6">
                <h3 className="text-lg font-medium text-rose-400 mb-4">
                  Recomendações
                </h3>
                <ul className="space-y-2">
                  {result.recommendations.map((rec, index) => (
                    <li
                      key={index}
                      className="flex items-start gap-2 text-zinc-300"
                    >
                      <span className="text-rose-400">•</span>
                      {rec}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        )}

        <footer className="mt-16 text-center text-zinc-500 text-sm">
          <p>
            Seus dados são processados e armazenados de forma anonimizada em
            conformidade com a LGPD.
          </p>
        </footer>
      </div>
    </main>
  );
}
