"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/shared/design-system/components/Button";
import { Textarea } from "@/shared/design-system/components/Input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/shared/design-system/components/Card";
import { Badge, getRiskBadgeVariant } from "@/shared/design-system/components/Badge";
import { Alert } from "@/shared/design-system/components/Alert";

interface Pattern {
  type: string;
  severity: number;
  evidence: string[];
  description: string;
}

interface CycleOfViolence {
  stage: string;
  confidence: number;
  evidence: string[];
}

interface AnalysisResult {
  conversationId: string;
  violenceScore: number;
  riskLevel: "low" | "medium" | "high" | "critical";
  patterns: Pattern[];
  cycleOfViolence: CycleOfViolence;
  summary: string;
  recommendations: string[];
  contactFound: {
    phone: string;
    name: string | null;
    cpf: string;
  };
  cloudArchive: {
    enabled: boolean;
    status: string;
    key?: string;
  };
}

const patternLabels: Record<string, string> = {
  control: "Controle",
  threat: "Ameaças",
  manipulation: "Manipulação",
  isolation: "Isolamento",
  verbal_abuse: "Abuso verbal",
  stalking: "Perseguição",
  gaslighting: "Manipulação emocional",
  love_bombing: "Idealização excessiva",
};

const cycleLabels: Record<string, string> = {
  tension: "Tensão",
  explosion: "Explosão",
  honeymoon: "Lua de mel",
  mixed: "Misto",
  not_detected: "Não identificado",
};

export default function AnalyzePage() {
  const [text, setText] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
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
        body: JSON.stringify({ text, sourceType: "web" }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Erro ao processar análise");
      }

      const data = await response.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao processar análise");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getRiskLabel = (level: string) => {
    const labels: Record<string, string> = {
      low: "Baixo",
      medium: "Médio",
      high: "Alto",
      critical: "Crítico",
    };
    return labels[level] || level;
  };

  const getCycleColor = (stage: string) => {
    const colors: Record<string, string> = {
      tension: "bg-[var(--color-ocean-400)]",
      explosion: "bg-[var(--color-coral-500)]",
      honeymoon: "bg-[var(--color-lavender-400)]",
      mixed: "bg-[var(--color-ocean-500)]",
      not_detected: "bg-[var(--color-base-600)]",
    };
    return colors[stage] || colors.not_detected;
  };

  return (
    <div className="min-h-screen bg-[var(--color-base-950)]">
      <div className="max-w-4xl mx-auto px-4 py-8 sm:py-12">
        <div className="text-center mb-10">
          <h1 className="text-3xl sm:text-4xl font-bold text-[var(--color-base-50)] mb-4">
            Analisar conversa
          </h1>
          <p className="text-[var(--color-base-400)] text-lg">
            Cole o texto de uma conversa para análise de padrões
          </p>
        </div>

        <div className="space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>Texto da conversa</CardTitle>
              <CardDescription>
                Cole o texto da conversa (formato WhatsApp ou texto simples)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Cole aqui o texto da conversa...

Exemplo formato WhatsApp:
12/01/2024, 14:30 - Maria: Oi amor, tudo bem?
12/01/2024, 14:32 - João: Tudo, e vc?
12/01/2024, 14:35 - Maria: Vamos sair hoje?
12/01/2024, 14:40 - João: Não, prefiro ficar em casa"
                rows={10}
                disabled={isAnalyzing}
                className="min-h-[200px] font-mono text-sm"
              />
              <div className="flex items-center justify-between">
                <p className="text-xs text-[var(--color-base-500)]">
                  Sua conversa é analisada localmente e nunca é armazenada em texto puro.
                </p>
                <Button
                  onClick={handleAnalyze}
                  disabled={!text.trim() || isAnalyzing}
                  loading={isAnalyzing}
                >
                  Analisar
                </Button>
              </div>
            </CardContent>
          </Card>

          {error && (
            <Alert variant="error" title="Erro na análise">
              {error}
            </Alert>
          )}

          {result && (
            <div className="space-y-6 animate-fade-in">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Resultado da análise</CardTitle>
                      <CardDescription>
                        Análise ID: {result.conversationId.slice(0, 8)}...
                      </CardDescription>
                    </div>
                    <Badge variant={getRiskBadgeVariant(result.riskLevel)}>
                      Risco {getRiskLabel(result.riskLevel)}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="bg-[var(--color-base-900)] rounded-xl p-6">
                    <div className="flex items-center justify-center gap-4 mb-4">
                      <div className="text-center">
                        <div className="text-5xl font-bold text-[var(--color-base-50)] mb-2">
                          {result.violenceScore.toFixed(1)}
                        </div>
                        <div className="text-sm text-[var(--color-base-400)]">Score de risco</div>
                      </div>
                      <div className="w-px h-16 bg-[var(--color-base-700)]" />
                      <div className="text-center">
                        <div className="text-lg font-semibold text-[var(--color-base-100)] mb-1">
                          {result.patterns.length}
                        </div>
                        <div className="text-sm text-[var(--color-base-400)]">Padrões</div>
                      </div>
                    </div>
                    <div className="w-full bg-[var(--color-base-800)] rounded-full h-3">
                      <div
                        className={`h-3 rounded-full transition-all ${getRiskColor(
                          result.riskLevel
                        )}`}
                        style={{ width: `${result.violenceScore * 10}%` }}
                      />
                    </div>
                  </div>

                  {result.summary && (
                    <div className="bg-[var(--color-ocean-950)] border border-[var(--color-ocean-800)] rounded-xl p-4">
                      <p className="text-[var(--color-base-100)]">{result.summary}</p>
                    </div>
                  )}

                  {result.cycleOfViolence && result.cycleOfViolence.stage !== "not_detected" && (
                    <div className="space-y-3">
                      <h3 className="text-sm font-semibold text-[var(--color-base-300)] uppercase tracking-wide">
                        Ciclo da violência
                      </h3>
                      <div className="flex items-center gap-3 bg-[var(--color-base-900)] rounded-xl p-4">
                        <div
                          className={`w-4 h-4 rounded-full ${getCycleColor(
                            result.cycleOfViolence.stage
                          )}`}
                        />
                        <div>
                          <p className="font-medium text-[var(--color-base-100)]">
                            {cycleLabels[result.cycleOfViolence.stage] || result.cycleOfViolence.stage}
                          </p>
                          <p className="text-sm text-[var(--color-base-400)]">
                            Confiança: {(result.cycleOfViolence.confidence * 100).toFixed(0)}%
                          </p>
                        </div>
                      </div>
                      {result.cycleOfViolence.evidence.length > 0 && (
                        <div className="space-y-2">
                          {result.cycleOfViolence.evidence.slice(0, 2).map((e, i) => (
                            <blockquote
                              key={i}
                              className="text-sm text-[var(--color-base-400)] italic border-l-2 border-[var(--color-ocean-600)] pl-3"
                            >
                              &ldquo;{e}&rdquo;
                            </blockquote>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {result.patterns.length > 0 && (
                    <div className="space-y-3">
                      <h3 className="text-sm font-semibold text-[var(--color-base-300)] uppercase tracking-wide">
                        Padrões detectados ({result.patterns.length})
                      </h3>
                      <div className="space-y-3">
                        {result.patterns.map((pattern, index) => (
                          <div
                            key={index}
                            className="bg-[var(--color-base-900)] rounded-xl p-4 border border-[var(--color-base-800)]"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-medium text-[var(--color-base-100)]">
                                {patternLabels[pattern.type] || pattern.type}
                              </span>
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-[var(--color-base-500)]">
                                  Severidade
                                </span>
                                <div className="flex gap-1">
                                  {[1, 2, 3, 4, 5].map((i) => (
                                    <div
                                      key={i}
                                      className={`w-2 h-2 rounded-full ${
                                        i <= Math.ceil(pattern.severity / 2)
                                          ? getSeverityColor(pattern.severity)
                                          : "bg-[var(--color-base-700)]"
                                      }`}
                                    />
                                  ))}
                                </div>
                              </div>
                            </div>
                            {pattern.description && (
                              <p className="text-sm text-[var(--color-base-400)] mb-3">
                                {pattern.description}
                              </p>
                            )}
                            {pattern.evidence.length > 0 && (
                              <div className="space-y-1">
                                {pattern.evidence.slice(0, 2).map((e, i) => (
                                  <p
                                    key={i}
                                    className="text-xs text-[var(--color-base-500)] italic border-l-2 border-[var(--color-base-700)] pl-2"
                                  >
                                    &ldquo;{e}&rdquo;
                                  </p>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {result.recommendations.length > 0 && (
                    <div className="space-y-3">
                      <h3 className="text-sm font-semibold text-[var(--color-base-300)] uppercase tracking-wide">
                        Recomendações
                      </h3>
                      <ul className="space-y-2">
                        {result.recommendations.map((rec, index) => (
                          <li
                            key={index}
                            className="flex items-start gap-3 text-[var(--color-base-300)]"
                          >
                            <svg
                              className="w-5 h-5 text-[var(--color-success)] flex-shrink-0 mt-0.5"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                              />
                            </svg>
                            <span>{rec}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="flex items-center gap-4 pt-4 border-t border-[var(--color-base-800)]">
                    <Link href="/evidence" className="flex-1">
                      <Button variant="secondary" className="w-full">
                        Salvar no Registro
                      </Button>
                    </Link>
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setResult(null);
                        setText("");
                      }}
                    >
                      Nova análise
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {result.riskLevel === "high" || result.riskLevel === "critical" ? (
                <Alert variant="warning" title="Precisa de ajuda?">
                  <p className="mb-3">
                    Se você está em situação de risco, procure ajuda:
                  </p>
                  <div className="space-y-2 text-sm">
                    <p>
                      <strong>Delegacia da Mulher:</strong> Ligue 180
                    </p>
                    <p>
                      <strong>Emergência:</strong> Ligue 190
                    </p>
                    <p>
                      <strong>Central de Atendimento à Mulher:</strong> 180
                    </p>
                  </div>
                </Alert>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function getRiskColor(level: string): string {
  const colors: Record<string, string> = {
    low: "bg-[var(--color-success)]",
    medium: "bg-[var(--color-warning)]",
    high: "bg-[var(--color-coral-500)]",
    critical: "bg-[var(--color-error)]",
  };
  return colors[level] || colors.low;
}

function getSeverityColor(severity: number): string {
  if (severity >= 8) return "bg-[var(--color-error)]";
  if (severity >= 6) return "bg-[var(--color-coral-500)]";
  if (severity >= 4) return "bg-[var(--color-warning)]";
  return "bg-[var(--color-ocean-500)]";
}
