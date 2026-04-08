"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CookieBanner, useConsentStatus } from "@/components/CookieBanner";
import { BrazilMap } from "@/components/BrazilMap";

// ── Dados atualizados ──────────────────────────────
const stats = [
  {
    value: "1.463",
    label: "Feminicídios em 2024",
    detail: "4 por dia — o maior em 5 anos",
    source: "Anuário Seg. Pública 2025",
    color: "text-rose-500",
  },
  {
    value: "a cada 6 min",
    label: "Uma mulher é agredida",
    detail: "no Brasil, por parceiro íntimo",
    source: "IPEA / DataSenado 2024",
    color: "text-orange-400",
  },
  {
    value: "72%",
    label: "Vítimas não denunciam",
    detail: "por medo, vergonha ou dependência",
    source: "PNAD Violência 2024",
    color: "text-amber-400",
  },
  {
    value: "68%",
    label: "Ocorrem dentro do lar",
    detail: "a casa deveria ser o lugar mais seguro",
    source: "Atlas da Violência 2025",
    color: "text-rose-400",
  },
];

const features = [
  {
    icon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
    title: "Detecta o Invisível",
    description: "Nossa IA identifica padrões de controle, ciúme patológico e isolamento — os primeiros sinais do ciclo da violência que os olhos apaixonados não veem.",
  },
  {
    icon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
    ),
    title: "Sigilo Absoluto",
    description: "Criptografia de ponta, proteção anti-print e anonimização completa. Sua identidade e conversas nunca são expostas — a ninguém, jamais.",
  },
  {
    icon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    title: "Foco em Conscientização",
    description: "Não somos um tribunal. Somos um espelho. A Guardiã te ajuda a ver a realidade com clareza para que você tome decisões com mais segurança e informação.",
  },
  {
    icon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    title: "Rede de Apoio",
    description: "Conexão direta com o CVV (188), Ligue 180 e delegacias especializadas. Para quando a análise confirmar o que você já sentia.",
  },
];

const emergencyContacts = [
  { number: "180", label: "Central da Mulher", color: "rose" },
  { number: "190", label: "Polícia Militar", color: "zinc" },
  { number: "188", label: "CVV — Crise emocional", color: "zinc" },
  { number: "197", label: "Polícia Civil", color: "zinc" },
];

// ── Componente contador animado ──────────────────────
function AnimatedNumber({ value, suffix = "" }: { value: number; suffix?: string }) {
  const [display, setDisplay] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    let start = 0;
    const duration = 1500;
    const steps = 40;
    const increment = value / steps;
    const interval = duration / steps;

    const timer = setInterval(() => {
      start += increment;
      if (start >= value) {
        setDisplay(value);
        clearInterval(timer);
      } else {
        setDisplay(Math.floor(start));
      }
    }, interval);

    return () => clearInterval(timer);
  }, [value]);

  return (
    <span ref={ref}>
      {display.toLocaleString("pt-BR")}
      {suffix}
    </span>
  );
}

// ── Modal de Auth ────────────────────────────────────
function AuthModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [mode, setMode] = useState<"login" | "register" | "verify">("login");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [registerForm, setRegisterForm] = useState({
    email: "", password: "", confirmPassword: "", acceptTerms: false,
  });
  const [verifyForm, setVerifyForm] = useState({ email: "", code: "" });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/signin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(loginForm),
      });
      const data = await res.json();
      if (res.ok) {
        router.push("/dashboard");
      } else {
        if (data.code === "USER_NOT_CONFIRMED") {
          setVerifyForm({ email: loginForm.email, code: "" });
          setMode("verify");
        } else {
          alert(data.error || "Erro ao fazer login");
        }
      }
    } catch {
      alert("Erro ao fazer login");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (registerForm.password !== registerForm.confirmPassword) {
      alert("As senhas não conferem");
      return;
    }
    if (!registerForm.acceptTerms) {
      alert("Você precisa aceitar os termos de uso");
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: registerForm.email, password: registerForm.password }),
      });
      if (res.ok) {
        setVerifyForm({ email: registerForm.email, code: "" });
        setMode("verify");
      } else {
        const data = await res.json();
        alert(data.error || "Erro ao criar conta");
      }
    } catch {
      alert("Erro ao criar conta");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(verifyForm),
      });
      const data = await res.json();
      if (res.ok) {
        alert(data.message);
        setMode("login");
        setLoginForm({ ...loginForm, email: verifyForm.email });
      } else {
        alert(data.error || "Erro ao verificar conta");
      }
    } catch {
      alert("Erro ao verificar conta");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/verify/resend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: verifyForm.email }),
      });
      const data = await res.json();
      alert(data.message || data.error);
    } catch {
      alert("Erro ao reenviar código");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/80 backdrop-blur-md" onClick={onClose} />
      <div className="relative w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-[2.5rem] p-8 shadow-2xl text-white">
        <button onClick={onClose} className="absolute top-6 right-6 text-zinc-500 hover:text-white transition-colors">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="flex mb-8 bg-black/40 rounded-2xl p-1.5 border border-zinc-800">
          <button
            onClick={() => setMode("login")}
            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${mode === "login" ? "bg-zinc-800 text-white shadow-lg" : "text-zinc-500 hover:text-zinc-300"}`}
          >
            Acessar
          </button>
          <button
            onClick={() => setMode("register")}
            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${mode === "register" ? "bg-zinc-800 text-white shadow-lg" : "text-zinc-500 hover:text-zinc-300"}`}
          >
            Cadastrar
          </button>
        </div>

        {mode === "login" && (
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-zinc-500 mb-2 ml-1">Email</label>
              <input type="email" placeholder="seu@email.com" value={loginForm.email}
                onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                className="w-full bg-black/40 border border-zinc-800 text-white placeholder:text-zinc-700 rounded-2xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500/50 transition-all" required />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-zinc-500 mb-2 ml-1">Senha</label>
              <input type="password" placeholder="••••••••" value={loginForm.password}
                onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                className="w-full bg-black/40 border border-zinc-800 text-white placeholder:text-zinc-700 rounded-2xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500/50 transition-all" required />
            </div>
            <button type="submit" disabled={isLoading}
              className="w-full bg-rose-600 hover:bg-rose-500 disabled:bg-rose-900 text-white py-4 rounded-2xl font-bold text-lg transition-all shadow-xl shadow-rose-900/20 active:scale-[0.98] mt-4">
              {isLoading ? "Validando..." : "Entrar com Segurança"}
            </button>
          </form>
        )}

        {mode === "register" && (
          <form onSubmit={handleRegister} className="space-y-5">
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-zinc-500 mb-2 ml-1">Email</label>
              <input type="email" placeholder="seu@email.com" value={registerForm.email}
                onChange={(e) => setRegisterForm({ ...registerForm, email: e.target.value })}
                className="w-full bg-black/40 border border-zinc-800 text-white placeholder:text-zinc-700 rounded-2xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500/50 transition-all" required />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-zinc-500 mb-2 ml-1">Senha</label>
              <input type="password" placeholder="Mínimo 8 caracteres" value={registerForm.password}
                onChange={(e) => setRegisterForm({ ...registerForm, password: e.target.value })}
                className="w-full bg-black/40 border border-zinc-800 text-white placeholder:text-zinc-700 rounded-2xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500/50 transition-all"
                required minLength={8} />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-zinc-500 mb-2 ml-1">Confirmar Senha</label>
              <input type="password" placeholder="Repita sua senha" value={registerForm.confirmPassword}
                onChange={(e) => setRegisterForm({ ...registerForm, confirmPassword: e.target.value })}
                className="w-full bg-black/40 border border-zinc-800 text-white placeholder:text-zinc-700 rounded-2xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500/50 transition-all" required />
            </div>
            <div className="flex items-start gap-3">
              <input type="checkbox" id="terms" checked={registerForm.acceptTerms}
                onChange={(e) => setRegisterForm({ ...registerForm, acceptTerms: e.target.checked })}
                className="mt-1 w-5 h-5 rounded border-zinc-800 bg-black text-rose-600 focus:ring-rose-500/20" />
              <label htmlFor="terms" className="text-[10px] text-zinc-500 leading-relaxed font-medium">
                Aceito os <Link href="/privacy" className="text-rose-500 hover:underline">Termos e a Política de Privacidade</Link>. Entendo que a Guardiã é uma ferramenta de conscientização.
              </label>
            </div>
            <button type="submit" disabled={isLoading}
              className="w-full bg-rose-600 hover:bg-rose-500 disabled:bg-rose-900 text-white py-4 rounded-2xl font-bold text-lg transition-all shadow-xl shadow-rose-900/20 active:scale-[0.98] mt-4">
              {isLoading ? "Criando conta..." : "Criar Conta Segura"}
            </button>
          </form>
        )}

        {mode === "verify" && (
          <form onSubmit={handleVerify} className="space-y-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-rose-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-rose-500/20">
                <svg className="w-8 h-8 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h4 className="text-xl font-bold mb-2">Verifique seu Email</h4>
              <p className="text-sm text-zinc-500 px-4">Código enviado para<br />
                <span className="text-zinc-300 font-semibold">{verifyForm.email}</span>
              </p>
            </div>
            <input type="text" placeholder="000000" value={verifyForm.code}
              onChange={(e) => setVerifyForm({ ...verifyForm, code: e.target.value })}
              className="w-full bg-black/40 border border-zinc-800 text-white rounded-2xl px-4 py-5 focus:outline-none focus:border-rose-500/50 text-center text-3xl tracking-[0.4em] font-black placeholder:text-zinc-800"
              required maxLength={6} />
            <button type="submit" disabled={isLoading}
              className="w-full bg-rose-600 hover:bg-rose-500 disabled:bg-rose-900 text-white py-4 rounded-2xl font-bold text-lg transition-all">
              {isLoading ? "Validando..." : "Confirmar Código"}
            </button>
            <button type="button" onClick={handleResendCode} disabled={isLoading}
              className="w-full text-xs text-zinc-500 hover:text-rose-500 font-bold uppercase tracking-widest transition-colors">
              Reenviar Código
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

// ── Página Principal ─────────────────────────────────
export default function LandingPage() {
  const [showAuth, setShowAuth] = useState(false);
  const consent = useConsentStatus();

  // Registra visita anonimizada após consentimento
  useEffect(() => {
    if (consent === "accepted") {
      fetch("/api/geo/record", { method: "POST" }).catch(() => {});
    }
  }, [consent]);

  return (
    <main className="min-h-screen bg-black text-white selection:bg-rose-500/30 selection:text-white overflow-x-hidden">
      {/* Background gradients */}
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none overflow-hidden -z-10">
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-rose-900/20 rounded-full blur-[120px] opacity-50" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-900/10 rounded-full blur-[100px] opacity-30" />
        <div className="absolute top-[40%] left-[30%] w-[40%] h-[40%] bg-rose-950/10 rounded-full blur-[100px] opacity-20" />
      </div>

      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-40 bg-black/60 backdrop-blur-xl border-b border-zinc-800/50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
            <h1 className="text-xl font-black tracking-tighter">
              <span className="text-rose-500">GUARDIÃ</span>
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden md:flex gap-6 text-xs font-bold uppercase tracking-widest text-zinc-500">
              <a href="#mapa" className="hover:text-rose-400 transition-colors">Mapa</a>
              <Link href="/privacy" className="hover:text-rose-400 transition-colors">Privacidade</Link>
            </div>
            <button
              onClick={() => setShowAuth(true)}
              className="bg-white text-black hover:bg-zinc-200 px-6 py-2 rounded-full font-bold text-sm transition-all active:scale-95"
            >
              Acessar
            </button>
          </div>
        </div>
      </nav>

      {/* ── Hero ────────────────────────────── */}
      <section className="relative pt-44 pb-28 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="max-w-5xl">
            <div className="inline-flex items-center gap-3 px-4 py-2 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-full text-xs font-black uppercase tracking-[0.2em] mb-8">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
              IA para Prevenção da Violência Doméstica
            </div>

            <h2 className="text-6xl md:text-8xl lg:text-[96px] font-black leading-[0.92] mb-10 tracking-tighter">
              Você não está<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-500 via-rose-400 to-pink-400">
                sozinha.
              </span>
            </h2>

            <div className="max-w-2xl text-xl text-zinc-400 leading-relaxed font-medium mb-14 space-y-4">
              <p>
                O abuso começa no silêncio — no controle sutil, na manipulação, no isolamento. A maioria das vítimas não reconhece os sinais até que seja tarde.
              </p>
              <p>
                A <span className="text-white font-bold">Guardiã</span> analisa o padrão das suas conversas com inteligência artificial, revelando o que os olhos apaixonados não conseguem ver.
              </p>
            </div>

            <div className="flex flex-wrap gap-4">
              <button
                onClick={() => setShowAuth(true)}
                className="bg-rose-600 hover:bg-rose-500 text-white px-10 py-5 rounded-[2rem] font-black text-xl transition-all shadow-2xl shadow-rose-900/40 hover:-translate-y-0.5 active:scale-95"
              >
                Analisar Agora
              </button>
              <a
                href="#mapa"
                className="bg-zinc-900/50 border border-zinc-800 hover:bg-zinc-800/80 text-zinc-300 px-10 py-5 rounded-[2rem] font-bold text-xl transition-all backdrop-blur-sm flex items-center gap-2"
              >
                <svg className="w-5 h-5 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                </svg>
                Ver Mapa Brasil
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ── Contatos de emergência ──────────── */}
      <section className="py-8 px-6 bg-rose-950/20 border-y border-rose-900/30">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-wrap items-center gap-4 justify-center md:justify-start">
            <span className="text-xs font-black uppercase tracking-widest text-rose-400/60">
              Em perigo?
            </span>
            {emergencyContacts.map((c) => (
              <a
                key={c.number}
                href={`tel:${c.number}`}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-all text-sm font-bold ${
                  c.color === "rose"
                    ? "bg-rose-600/20 border-rose-600/40 text-rose-300 hover:bg-rose-600/30"
                    : "bg-zinc-900/50 border-zinc-800 text-zinc-400 hover:text-white"
                }`}
              >
                <span className="text-lg font-black">{c.number}</span>
                <span className="text-xs opacity-70">{c.label}</span>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* ── Stats ───────────────────────────── */}
      <section className="py-28 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-xs font-black uppercase tracking-widest text-zinc-600 mb-3">A realidade que os dados revelam</p>
            <h3 className="text-4xl md:text-5xl font-black tracking-tighter">Números que não podemos ignorar.</h3>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {stats.map((stat, i) => (
              <div key={i} className="group p-8 bg-zinc-950/80 border border-zinc-800 rounded-3xl hover:border-rose-800/50 transition-all duration-500 hover:-translate-y-1">
                <div className={`text-4xl font-black mb-2 ${stat.color}`}>{stat.value}</div>
                <div className="text-white font-bold text-base mb-1">{stat.label}</div>
                <div className="text-zinc-500 text-sm mb-4 leading-snug">{stat.detail}</div>
                <div className="text-[10px] font-black uppercase tracking-widest text-zinc-700 border-t border-zinc-800 pt-3">
                  {stat.source}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Mapa Brasil ──────────────────────── */}
      <section id="mapa" className="py-28 px-6 bg-zinc-950/50 border-y border-zinc-800/40">
        <div className="max-w-7xl mx-auto">
          <div className="mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-full text-xs font-black uppercase tracking-widest mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
              Dados anonimizados — LGPD compliant
            </div>
            <h3 className="text-4xl md:text-6xl font-black tracking-tighter mb-4">
              Onde o silêncio<br />
              <span className="text-rose-500">pede socorro.</span>
            </h3>
            <p className="text-zinc-500 text-xl max-w-2xl font-medium leading-relaxed">
              Cada ponto no mapa representa alguém que buscou ajuda. Nenhum dado pessoal é coletado ou armazenado — apenas a região, com coordenadas propositalmente imprecisas.
            </p>
          </div>

          <div className="relative">
            <BrazilMap />
          </div>

          <div className="mt-8 flex flex-wrap gap-6 items-center">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-gradient-to-r from-rose-700 to-rose-400" />
              <span className="text-xs text-zinc-500 font-bold">Concentração de pedidos</span>
            </div>
            <div className="text-xs text-zinc-700 font-medium">
              Coordenadas imprecisas propositalmente (±33 km). Sem IP. Sem identificação.
            </div>
          </div>
        </div>
      </section>

      {/* ── Features ─────────────────────────── */}
      <section className="py-32 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <h3 className="text-4xl md:text-6xl font-black tracking-tighter mb-4">
              Construída para ouvir<br />o que não é dito.
            </h3>
            <p className="text-zinc-500 text-xl max-w-xl mx-auto font-medium">
              A Guardiã foi projetada com uma premissa: sua segurança vale mais que qualquer dado.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((f, i) => (
              <div key={i} className="group p-8 bg-zinc-950/60 border border-zinc-800 rounded-3xl hover:bg-zinc-900/60 transition-all duration-500 hover:-translate-y-1">
                <div className="w-14 h-14 bg-rose-500/10 rounded-2xl flex items-center justify-center text-rose-500 mb-6 border border-rose-500/20 group-hover:bg-rose-600 group-hover:text-white group-hover:border-rose-600 transition-all duration-500">
                  {f.icon}
                </div>
                <h4 className="text-xl font-bold mb-3 tracking-tight">{f.title}</h4>
                <p className="text-zinc-500 leading-relaxed text-sm">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Como funciona ─────────────────────── */}
      <section className="py-24 px-6 bg-zinc-950/40 border-y border-zinc-800/40">
        <div className="max-w-4xl mx-auto text-center">
          <h3 className="text-3xl md:text-5xl font-black tracking-tighter mb-4">Como funciona</h3>
          <p className="text-zinc-500 text-lg mb-16">Três passos. Totalmente privado.</p>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { n: "01", title: "Cole a conversa", desc: "Copie e cole o texto da conversa do WhatsApp, Instagram ou SMS. Nada é enviado para terceiros." },
              { n: "02", title: "IA analisa", desc: "Nossa IA identifica padrões de controle, ameaças veladas, isolamento e outros indicadores de violência." },
              { n: "03", title: "Receba o relatório", desc: "Um relatório claro e humano sobre o risco detectado, com orientações sobre os próximos passos." },
            ].map((step) => (
              <div key={step.n} className="flex flex-col items-center text-center">
                <div className="w-14 h-14 bg-rose-600/10 border border-rose-600/20 rounded-2xl flex items-center justify-center mb-5">
                  <span className="text-rose-500 font-black text-lg">{step.n}</span>
                </div>
                <h4 className="text-xl font-bold mb-3">{step.title}</h4>
                <p className="text-zinc-500 text-sm leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Final ─────────────────────────── */}
      <section className="py-32 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-gradient-to-br from-rose-700 via-rose-600 to-pink-700 rounded-[3rem] p-10 md:p-20 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/3" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-black/20 rounded-full blur-[60px] translate-y-1/2 -translate-x-1/4" />
            <div className="relative z-10 max-w-3xl">
              <h3 className="text-5xl md:text-7xl font-black text-white mb-6 tracking-tighter leading-[0.9]">
                Sua vida é valiosa demais<br />
                <span className="text-black/40">para viver com medo.</span>
              </h3>
              <p className="text-xl text-white/80 font-medium mb-10 leading-relaxed">
                Tome o controle da narrativa. A Guardiã não julga — ela ilumina. O primeiro passo para sair do ciclo é ver com clareza onde você está.
              </p>
              <div className="flex flex-wrap gap-4">
                <button
                  onClick={() => setShowAuth(true)}
                  className="bg-white text-black px-10 py-5 rounded-full font-black text-xl transition-all hover:bg-zinc-100 shadow-2xl active:scale-95"
                >
                  Começar agora — é gratuito
                </button>
                <a
                  href="tel:180"
                  className="border-2 border-white/40 text-white px-8 py-5 rounded-full font-bold text-xl transition-all hover:bg-white/10 flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  Ligue 180 — gratuito 24h
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────── */}
      <footer className="py-20 border-t border-zinc-900 bg-black">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-8 mb-12">
            <div>
              <h1 className="text-2xl font-black tracking-tighter text-rose-500 mb-1">GUARDIÃ</h1>
              <p className="text-xs text-zinc-600 font-medium">Proteção baseada em tecnologia</p>
            </div>
            <div className="flex flex-wrap gap-8 text-xs font-black uppercase tracking-widest text-zinc-600">
              <Link href="/privacy" className="hover:text-rose-500 transition-colors">Privacidade & LGPD</Link>
              <a href="tel:180" className="hover:text-rose-500 transition-colors">Ligue 180</a>
              <a href="tel:190" className="hover:text-rose-500 transition-colors">Emergência 190</a>
            </div>
          </div>
          <div className="p-6 bg-zinc-950 rounded-2xl border border-zinc-900">
            <p className="text-xs text-zinc-700 leading-relaxed text-center font-medium">
              AVISO: A Guardiã é uma plataforma educativa para detecção de padrões e conscientização. Não substitui a Polícia Civil (197), Polícia Militar (190) ou Central de Atendimento à Mulher (180). Os dados e relatórios gerados não possuem validade jurídica como prova pericial. Em situações de perigo imediato, ligue 190.
            </p>
          </div>
          <p className="mt-8 text-center text-zinc-800 text-xs">
            © {new Date().getFullYear()} GUARDIÃ. Todos os direitos reservados.
          </p>
        </div>
      </footer>

      <AuthModal isOpen={showAuth} onClose={() => setShowAuth(false)} />
      <CookieBanner
        onAccept={() => fetch("/api/geo/record", { method: "POST" }).catch(() => {})}
      />
    </main>
  );
}
