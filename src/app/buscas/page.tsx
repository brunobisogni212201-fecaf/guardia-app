"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface CpfResult {
  cpf: string;
  cpfRaw?: string;
  nome: string;
  nomeMae: string | null;
  dataNascimento: string;
  situacao: string;
  sexo: string;
  source?: string;
}

interface AntecedentesResult {
  processosCriminais: Processo[];
  processosCiveis: Processo[];
  total: number;
  found: boolean;
}

interface Processo {
  numero: string;
  tribunal: string;
  tipo: string;
  classe: string;
  assunto: string;
  dataInicio: string;
  situacao: string;
  ultimaMovimentacao: string;
}

type Tab = "manual" | "json" | "csv" | "antecedentes";

export default function BuscasPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [tab, setTab] = useState<Tab>("manual");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rateLimit, setRateLimit] = useState<{ remaining: number; resetAt: number } | null>(null);

  const [cpfInput, setCpfInput] = useState("");
  const [cpfResult, setCpfResult] = useState<CpfResult | null>(null);
  const [nomeInput, setNomeInput] = useState("");
  const [antecedentesResult, setAntecedentesResult] = useState<AntecedentesResult | null>(null);

  const handleLogout = async () => {
    await fetch("/api/auth/signout", { method: "POST" });
    router.push("/");
  };

  const formatCPF = (value: string) => {
    const cleaned = value.replace(/\D/g, "");
    if (cleaned.length <= 11) {
      return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/g, "$1.$2.$3-$4");
    }
    return value;
  };

  const handleCPFSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setCpfResult(null);

    try {
      const res = await fetch("/api/busca/cpf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cpf: cpfInput }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 429) {
          setError(`Limite de consultas excedido. Tente novamente em ${Math.ceil((data.resetAt - Date.now()) / 60000)} minutos.`);
        } else {
          setError(data.error || "Erro ao consultar CPF");
        }
        if (data.rateLimit) setRateLimit(data.rateLimit);
        return;
      }

      setCpfResult(data.data || data);
      if (data.rateLimit) setRateLimit(data.rateLimit);
    } catch {
      setError("Erro ao consultar CPF");
    } finally {
      setLoading(false);
    }
  };

  const handleJSONUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError(null);
    setCpfResult(null);

    try {
      const text = await file.text();
      const dados = JSON.parse(text);

      const res = await fetch("/api/busca/cpf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dados),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Erro ao processar JSON");
        return;
      }

      setCpfResult(data.data || data);
      if (data.rateLimit) setRateLimit(data.rateLimit);
    } catch (err) {
      setError("Erro ao processar arquivo JSON");
    } finally {
      setLoading(false);
    }
  };

  const handleCSVUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError(null);
    setCpfResult(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/busca/cpf", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Erro ao processar CSV");
        return;
      }

      setCpfResult(data.data || data);
      if (data.rateLimit) setRateLimit(data.rateLimit);
    } catch {
      setError("Erro ao processar arquivo CSV");
    } finally {
      setLoading(false);
    }
  };

  const handleAntecedentesSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setAntecedentesResult(null);

    try {
      const res = await fetch("/api/busca/antecedentes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome: nomeInput }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 429) {
          setError("Limite de consultas excedido. Tente novamente mais tarde.");
        } else {
          setError(data.error || "Erro ao consultar antecedentes");
        }
        if (data.rateLimit) setRateLimit(data.rateLimit);
        return;
      }

      setAntecedentesResult(data);
      if (data.rateLimit) setRateLimit(data.rateLimit);
    } catch {
      setError("Erro ao consultar antecedentes");
    } finally {
      setLoading(false);
    }
  };

  const getSituacaoColor = (situacao: string) => {
    const s = situacao.toLowerCase();
    if (s === "regular") return "text-green-400 bg-green-500/20 border-green-500/30";
    if (s.includes("cancelada") || s.includes("falecido")) return "text-red-400 bg-red-500/20 border-red-500/30";
    if (s.includes("suspensa")) return "text-orange-400 bg-orange-500/20 border-orange-500/30";
    return "text-yellow-400 bg-yellow-500/20 border-yellow-500/30";
  };

  const tabs: { id: Tab; label: string }[] = [
    { id: "manual", label: "Manual" },
    { id: "json", label: "JSON" },
    { id: "csv", label: "CSV" },
    { id: "antecedentes", label: "Antecedentes" },
  ];

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <nav className="fixed top-0 left-0 right-0 z-40 bg-zinc-900/80 backdrop-blur-md border-b border-zinc-800">
        <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
          <Link href="/dashboard" className="text-2xl font-bold text-rose-400">
            Guardiã
          </Link>
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="text-zinc-400 hover:text-white">Dashboard</Link>
            <Link href="/buscas" className="text-white font-medium">Buscas</Link>
            <button onClick={handleLogout} className="text-zinc-400 hover:text-white">Sair</button>
          </div>
        </div>
      </nav>

      <div className="pt-24 px-6 pb-12">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Buscas</h1>
            <p className="text-zinc-400">
              Consultas de dados. {rateLimit && (
                <span className="text-amber-400">{rateLimit.remaining}/10 consultas restantes</span>
              )}
            </p>
          </div>

          <div className="flex gap-2 mb-8 bg-zinc-900/50 p-1.5 rounded-xl w-fit overflow-x-auto">
            {tabs.map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${
                  tab === t.id ? "bg-rose-500 text-white" : "text-zinc-400 hover:text-white"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-6 py-4 rounded-xl mb-6">
              {error}
            </div>
          )}

          {tab === "manual" && (
            <div className="space-y-6">
              <form onSubmit={handleCPFSearch} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8">
                <h2 className="text-xl font-bold mb-6">Consultar CPF</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-2">Número do CPF</label>
                    <input
                      type="text"
                      value={cpfInput}
                      onChange={(e) => setCpfInput(formatCPF(e.target.value))}
                      placeholder="000.000.000-00"
                      maxLength={14}
                      className="w-full md:w-80 bg-zinc-800 border border-zinc-700 rounded-xl px-5 py-4 text-lg tracking-wider placeholder:text-zinc-600 focus:outline-none focus:border-rose-500/50 transition-colors"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading || cpfInput.length < 14}
                    className="bg-rose-600 hover:bg-rose-500 disabled:bg-zinc-700 disabled:cursor-not-allowed px-8 py-4 rounded-xl font-bold text-lg transition-colors"
                  >
                    {loading ? "Consultando..." : "Consultar"}
                  </button>
                </div>
              </form>
            </div>
          )}

          {tab === "json" && (
            <div className="space-y-6">
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8">
                <h2 className="text-xl font-bold mb-4">Upload JSON</h2>
                <p className="text-zinc-400 text-sm mb-6">
                  Envie um arquivo JSON com os dados do CPF. Campos aceitos: cpf, nome, nomeMae, dataNascimento, sexo, situacao
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json,application/json"
                  onChange={handleJSONUpload}
                  className="block w-full text-sm text-zinc-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-rose-600 file:text-white file:font-semibold hover:file:bg-rose-500 cursor-pointer"
                />
                {loading && <p className="mt-4 text-amber-400">Processando...</p>}
              </div>

              <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
                <h3 className="font-bold mb-2">Exemplo JSON:</h3>
                <pre className="bg-zinc-800 p-4 rounded-lg text-sm overflow-x-auto">
{`{
  "cpf": "31603566805",
  "nome": "Bruno de Araujo Bisogni",
  "nomeMae": "Maria da Silva",
  "dataNascimento": "07/08/1981",
  "sexo": "M",
  "situacao": "regular"
}`}
                </pre>
              </div>
            </div>
          )}

          {tab === "csv" && (
            <div className="space-y-6">
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8">
                <h2 className="text-xl font-bold mb-4">Upload CSV</h2>
                <p className="text-zinc-400 text-sm mb-6">
                  Envie um arquivo CSV com os dados. Cabeçalhos: cpf, nome, nomeMae, dataNascimento, sexo, situacao
                </p>
                <input
                  type="file"
                  accept=".csv,text/csv"
                  onChange={handleCSVUpload}
                  className="block w-full text-sm text-zinc-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-rose-600 file:text-white file:font-semibold hover:file:bg-rose-500 cursor-pointer"
                />
                {loading && <p className="mt-4 text-amber-400">Processando...</p>}
              </div>

              <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
                <h3 className="font-bold mb-2">Exemplo CSV:</h3>
                <pre className="bg-zinc-800 p-4 rounded-lg text-sm overflow-x-auto">
{`cpf,nome,nomeMae,dataNascimento,sexo,situacao
31603566805,Bruno de Araujo Bisogni,Maria da Silva,07/08/1981,M,regular`}
                </pre>
              </div>
            </div>
          )}

          {tab === "antecedentes" && (
            <div className="space-y-6">
              <form onSubmit={handleAntecedentesSearch} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8">
                <h2 className="text-xl font-bold mb-6">Consultar Antecedentes</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-2">Nome completo</label>
                    <input
                      type="text"
                      value={nomeInput}
                      onChange={(e) => setNomeInput(e.target.value)}
                      placeholder="Nome a ser consultado"
                      className="w-full md:w-96 bg-zinc-800 border border-zinc-700 rounded-xl px-5 py-4 text-lg placeholder:text-zinc-600 focus:outline-none focus:border-rose-500/50 transition-colors"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading || nomeInput.length < 3}
                    className="bg-rose-600 hover:bg-rose-500 disabled:bg-zinc-700 disabled:cursor-not-allowed px-8 py-4 rounded-xl font-bold text-lg transition-colors"
                  >
                    {loading ? "Buscando em todos os tribunais..." : "Buscar"}
                  </button>
                </div>
                <p className="mt-4 text-sm text-zinc-500">
                  A busca será realizada em todos os tribunais do Brasil. Pode levar alguns segundos.
                </p>
              </form>
            </div>
          )}

          {cpfResult && (tab === "manual" || tab === "json" || tab === "csv") && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 mt-8">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold">Resultado</h3>
                <span className="text-xs text-zinc-500">Fonte: {cpfResult.source || "API"}</span>
              </div>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <div className="text-xs text-zinc-500 uppercase tracking-wider mb-1">CPF</div>
                  <div className="text-2xl font-mono font-bold">{cpfResult.cpf}</div>
                </div>
                <div>
                  <div className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Situação</div>
                  <span className={`inline-block px-4 py-1.5 rounded-full text-sm font-bold border ${getSituacaoColor(cpfResult.situacao)}`}>
                    {cpfResult.situacao}
                  </span>
                </div>
                <div>
                  <div className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Nome</div>
                  <div className="text-lg font-medium">{cpfResult.nome}</div>
                </div>
                {cpfResult.nomeMae && (
                  <div>
                    <div className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Nome da Mãe</div>
                    <div className="text-lg">{cpfResult.nomeMae}</div>
                  </div>
                )}
                <div>
                  <div className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Data de Nascimento</div>
                  <div className="text-lg">{cpfResult.dataNascimento}</div>
                </div>
                <div>
                  <div className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Sexo</div>
                  <div className="text-lg">{cpfResult.sexo}</div>
                </div>
              </div>
            </div>
          )}

          {antecedentesResult && tab === "antecedentes" && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 mt-8">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold">Resultado</h3>
                <span className={`px-4 py-1.5 rounded-full text-sm font-bold ${
                  antecedentesResult.found 
                    ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30"
                    : "bg-green-500/20 text-green-400 border border-green-500/30"
                }`}>
                  {antecedentesResult.found
                    ? `${antecedentesResult.total} processos encontrados`
                    : "Nenhum processo encontrado"}
                </span>
              </div>

              {antecedentesResult.processosCriminais.length > 0 && (
                <div className="mb-8">
                  <h4 className="text-lg font-bold text-red-400 mb-4 flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    Processos Criminais ({antecedentesResult.processosCriminais.length})
                  </h4>
                  <div className="space-y-4">
                    {antecedentesResult.processosCriminais.map((p, i) => (
                      <div key={i} className="bg-zinc-800/50 border border-red-500/20 rounded-xl p-5">
                        <div className="flex justify-between items-start mb-2">
                          <span className="font-mono font-bold">{p.numero}</span>
                          <span className="text-xs text-zinc-500">{p.tribunal}</span>
                        </div>
                        <div className="text-sm text-zinc-400"><span className="text-zinc-500">Classe:</span> {p.classe}</div>
                        <div className="text-sm text-zinc-400"><span className="text-zinc-500">Assunto:</span> {p.assunto}</div>
                        <div className="text-sm text-zinc-400"><span className="text-zinc-500">Situação:</span> {p.situacao}</div>
                        <div className="text-xs text-zinc-600 mt-2">Última movimentação: {p.ultimaMovimentacao}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {antecedentesResult.processosCiveis.length > 0 && (
                <div>
                  <h4 className="text-lg font-bold text-yellow-400 mb-4">
                    Processos Cíveis ({antecedentesResult.processosCiveis.length})
                  </h4>
                  <div className="space-y-3">
                    {antecedentesResult.processosCiveis.slice(0, 10).map((p, i) => (
                      <div key={i} className="bg-zinc-800/50 border border-zinc-700 rounded-xl p-4">
                        <div className="flex justify-between">
                          <div>
                            <span className="font-mono text-sm">{p.numero}</span>
                            <span className="ml-2 text-xs text-zinc-500">{p.classe}</span>
                          </div>
                          <span className="text-xs text-zinc-600">{p.tribunal}</span>
                        </div>
                      </div>
                    ))}
                    {antecedentesResult.processosCiveis.length > 10 && (
                      <p className="text-center text-zinc-500 py-2">
                        +{antecedentesResult.processosCiveis.length - 10} processos cíveis
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
