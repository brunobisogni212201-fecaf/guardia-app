"use client";

import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/shared/design-system/components/Button";
import { Card, CardTitle, CardDescription } from "@/shared/design-system/components/Card";
import { Badge } from "@/shared/design-system/components/Badge";

const stats = [
  {
    value: "2.054+",
    label: "Mulheres protegidas",
    detail: "usam o Íris para se proteger",
    source: "Íris 2026",
    color: "text-[var(--color-ocean-400)]",
  },
  {
    value: "1.463",
    label: "Feminicídios em 2024",
    detail: "4 por dia — o maior em 5 anos",
    source: "Anuário Seg. Pública 2025",
    color: "text-[var(--color-coral-400)]",
  },
  {
    value: "a cada 6 min",
    label: "Uma mulher é agredida",
    detail: "no Brasil, por parceiro íntimo",
    source: "IPEA / DataSenade 2024",
    color: "text-[var(--color-warning)]",
  },
  {
    value: "72%",
    label: "Vítimas não denunciam",
    detail: "por medo, vergonha ou dependência",
    source: "PNAD Violência 2024",
    color: "text-[var(--color-base-400)]",
  },
];

const securityFeatures = [
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
    title: "Anti-Print",
    description: "Prevenção de captura de tela",
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
    ),
    title: "Criptografia E2E",
    description: "Dados protegidos ponta a ponta",
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
      </svg>
    ),
    title: "API Seguro",
    description: "Comunicação protegida por TLS 1.3",
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
      </svg>
    ),
    title: "LGPD Cloud",
    description: "Infraestrutura em conformidade",
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
      </svg>
    ),
    title: "Dados Anonimizados",
    description: "Hash de PII em ambos os lados",
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 21a9.004 9.004 0 008.716 6.824M12 21a9.004 9.004 0 01-8.716-6.824M12 21V3m0 18a9.004 9.004 0 008.716-6.824M12 21V3m0 0a9.004 9.004 0 01-8.716 6.824M12 3h12m0 0a9.004 9.004 0 01-8.716 6.824M12 3a9.004 9.004 0 018.716 6.824" />
      </svg>
    ),
    title: "Zero Retenção",
    description: "Sem armazenamento de texto puro",
  },
];

const features = [
  {
    icon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
    ),
    title: "Sua privacidade em primeiro lugar",
    description: "Dados criptografados, acesso apenas seu. Nenhuma informação é compartilhada com terceiros.",
  },
  {
    icon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
    ),
    title: "Clareza para entender",
    description: "Análise de conversas com linguagem simples, identificando padrões que você pode não ter percebido.",
  },
  {
    icon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
    title: "Preserve evidências",
    description: "Registre e armazene provas de forma segura com timestamps e hash de integridade.",
  },
  {
    icon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
      </svg>
    ),
    title: "Apoio quando precisar",
    description: "Conexão direta com redes de apoio e serviços de emergência, com linguagem acolhedora.",
  },
];

const plans = [
  {
    name: "Essencial",
    price: "R$ 29,90",
    period: "por mês",
    features: ["5 análises de conversa", "Registro de evidências", "Suporte por email"],
    highlight: false,
  },
  {
    name: "Proteção",
    price: "R$ 49,90",
    period: "por mês",
    features: ["15 análises de conversa", "Registro ilimitado", "Busca preventiva", "Suporte prioritário"],
    highlight: true,
  },
  {
    name: "Premium",
    price: "R$ 99,90",
    period: "por mês",
    features: ["Análises ilimitadas", "Registro ilimitado", "Busca completa", "Compartilhamento seguro"],
    highlight: false,
  },
];

const emergencyContacts = [
  { number: "180", label: "Central da Mulher", color: "coral" },
  { number: "190", label: "Polícia Militar", color: "neutral" },
  { number: "188", label: "CVV — Crise emocional", color: "neutral" },
  { number: "197", label: "Polícia Civil", color: "neutral" },
];

const faq = [
  {
    q: "Meus dados estão seguros?",
    a: "Sim. Utilizamos criptografia E2E, anti-print, dados anonimizados com hash e infraestrutura LGPD compliant. Nenhum dado pessoal é retido em texto puro.",
  },
  {
    q: "Como funciona a proteção de dados?",
    a: "Todas as informações são criptografadas, anonimizadas e processadas sem retenção. Utilizamos TLS 1.3, hash de PII e prevenção de captura de tela.",
  },
  {
    q: "O Íris é gratuito?",
    a: "Oferecemos um plano gratuito com funcionalidades básicas. Planos pagos oferecem análises ilimitadas e recursos avançados.",
  },
  {
    q: "É legal usar o Íris?",
    a: "Sim. O Íris é uma ferramenta de conscientização e preservação de evidências. Não substitui orientação jurídica profissional.",
  },
];

interface AddressData {
  logradouro?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
}

function AuthModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addressData, setAddressData] = useState<AddressData | null>(null);
  
  const [form, setForm] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    name: "",
    cpf: "",
    whatsapp: "",
    cep: "",
  });

  const handleGoogleLogin = () => {
    const auth0Url = `https://guardial-app.us.auth0.com/authorize?response_type=code&client_id=5ouCg6pFwQH9TmvSl2Vnf38ajTAU9k4T&redirect_uri=${encodeURIComponent("https://irisregistro.qzz.io/api/auth/callback/google")}&scope=openid profile email&state=${mode}&connection=google-oauth2`;
    window.location.href = auth0Url;
  };

  useEffect(() => {
    if (form.cep.length === 8) {
      fetch(`https://viacep.com.br/ws/${form.cep}/json/`)
        .then((res) => res.json())
        .then((data) => {
          if (!data.erro) {
            setAddressData({
              logradouro: data.logradouro,
              bairro: data.bairro,
              cidade: data.localidade,
              estado: data.uf,
            });
          }
        })
        .catch(() => {});
    }
  }, [form.cep]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (mode === "register" && form.password !== form.confirmPassword) {
        setError("As senhas não coincidem");
        setLoading(false);
        return;
      }

      const endpoint = mode === "login" ? "/api/auth/signin" : "/api/auth/signup";
      
      const payload: Record<string, string> = {
        email: form.email,
        password: form.password,
      };

      if (mode === "register") {
        if (form.name) payload.name = form.name;
        if (form.cpf) payload.cpf = form.cpf;
        if (form.whatsapp) payload.whatsapp = form.whatsapp;
        if (form.cep) payload.cep = form.cep;
      }

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Erro ao processar");
        setLoading(false);
        return;
      }

      if (mode === "login") {
        window.location.href = "/dashboard";
      } else {
        setMode("login");
        setForm({ email: "", password: "", confirmPassword: "", name: "", cpf: "", whatsapp: "", cep: "" });
        setAddressData(null);
      }
    } catch {
      setError("Erro de conexão");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
    >
      <div className="fixed inset-0 bg-black/80 backdrop-blur-md" onClick={onClose} />
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="relative w-full max-w-md bg-[var(--color-base-900)] border border-[var(--color-base-800)] rounded-[2rem] p-8 shadow-2xl my-8"
      >
        <button onClick={onClose} className="absolute top-6 right-6 text-[var(--color-base-500)] hover:text-white transition-colors">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="flex mb-6 bg-[var(--color-base-800)] rounded-xl p-1">
          <button
            onClick={() => setMode("login")}
            className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${mode === "login" ? "bg-[var(--color-coral-500)] text-white" : "text-[var(--color-base-400)]"}`}
          >
            Entrar
          </button>
          <button
            onClick={() => setMode("register")}
            className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${mode === "register" ? "bg-[var(--color-coral-500)] text-white" : "text-[var(--color-base-400)]"}`}
          >
            Cadastrar
          </button>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-sm text-red-400">
            {error}
          </div>
        )}

        <button
          onClick={handleGoogleLogin}
          className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white text-gray-800 rounded-xl font-semibold hover:bg-gray-100 transition-all mb-6"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          Continuar com Google
        </button>

        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-[var(--color-base-700)]"></div>
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="px-2 bg-[var(--color-base-900)] text-[var(--color-base-500)]">ou</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-[var(--color-base-500)] mb-2 ml-1">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full px-4 py-3 bg-[var(--color-base-900)] border border-[var(--color-base-700)] text-white rounded-xl placeholder:text-[var(--color-base-600)] focus:outline-none focus:border-[var(--color-coral-400)] transition-all"
              required
            />
          </div>

          {mode === "register" && (
            <>
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-[var(--color-base-500)] mb-2 ml-1">Nome Completo</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-4 py-3 bg-[var(--color-base-900)] border border-[var(--color-base-700)] text-white rounded-xl placeholder:text-[var(--color-base-600)] focus:outline-none focus:border-[var(--color-coral-400)] transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-[var(--color-base-500)] mb-2 ml-1">CPF</label>
                  <input
                    type="text"
                    value={form.cpf}
                    onChange={(e) => setForm({ ...form, cpf: e.target.value.replace(/\D/g, "") })}
                    placeholder="000.000.000-00"
                    maxLength={14}
                    className="w-full px-4 py-3 bg-[var(--color-base-900)] border border-[var(--color-base-700)] text-white rounded-xl placeholder:text-[var(--color-base-600)] focus:outline-none focus:border-[var(--color-coral-400)] transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-[var(--color-base-500)] mb-2 ml-1">WhatsApp</label>
                  <input
                    type="tel"
                    value={form.whatsapp}
                    onChange={(e) => setForm({ ...form, whatsapp: e.target.value.replace(/\D/g, "") })}
                    placeholder="(00) 00000-0000"
                    maxLength={15}
                    className="w-full px-4 py-3 bg-[var(--color-base-900)] border border-[var(--color-base-700)] text-white rounded-xl placeholder:text-[var(--color-base-600)] focus:outline-none focus:border-[var(--color-coral-400)] transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-[var(--color-base-500)] mb-2 ml-1">CEP</label>
                <input
                  type="text"
                  value={form.cep}
                  onChange={(e) => setForm({ ...form, cep: e.target.value.replace(/\D/g, "") })}
                  placeholder="00000-000"
                  maxLength={8}
                  className="w-full px-4 py-3 bg-[var(--color-base-900)] border border-[var(--color-base-700)] text-white rounded-xl placeholder:text-[var(--color-base-600)] focus:outline-none focus:border-[var(--color-coral-400)] transition-all"
                />
                {addressData && (
                  <p className="mt-1 text-xs text-[var(--color-ocean-400)]">
                    {addressData.logradouro}, {addressData.bairro} - {addressData.cidade}/{addressData.estado}
                  </p>
                )}
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-[var(--color-base-500)] mb-2 ml-1">Senha</label>
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="w-full px-4 py-3 bg-[var(--color-base-900)] border border-[var(--color-base-700)] text-white rounded-xl placeholder:text-[var(--color-base-600)] focus:outline-none focus:border-[var(--color-coral-400)] transition-all"
              required
              minLength={8}
            />
          </div>

          {mode === "register" && (
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-[var(--color-base-500)] mb-2 ml-1">Confirmar Senha</label>
              <input
                type="password"
                value={form.confirmPassword}
                onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                className="w-full px-4 py-3 bg-[var(--color-base-900)] border border-[var(--color-base-700)] text-white rounded-xl placeholder:text-[var(--color-base-600)] focus:outline-none focus:border-[var(--color-coral-400)] transition-all"
                required
              />
            </div>
          )}

          <p className="text-xs text-[var(--color-base-600)] text-center">
            {mode === "register" 
              ? "Seus dados são criptografados e anonimizados. CPF usado apenas para verificação de gênero."
              : "Ao continuar, você concorda com nossos Termos de Uso."
            }
          </p>

          <Button type="submit" loading={loading} className="w-full bg-[var(--color-coral-500)] hover:bg-[var(--color-coral-400)] text-white border-none font-bold">
            {mode === "login" ? "Entrar com segurança" : "Criar conta segura"}
          </Button>
        </form>
      </motion.div>
    </motion.div>
  );
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.25, 0.1, 0.25, 1] as const }
  }
};

export default function LandingPage() {
  const [showAuth, setShowAuth] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <main className="min-h-screen bg-[var(--color-base-950)] text-white selection:bg-[var(--color-coral-400)]/30 overflow-x-hidden">
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none -z-10">
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-[var(--color-petroleum-700)]/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-[var(--color-lavender-900)]/10 rounded-full blur-[100px]" />
      </div>

      <nav className="fixed top-0 left-0 right-0 z-40 bg-[var(--color-base-950)]/80 backdrop-blur-xl border-b border-[var(--color-base-800)]/50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-[var(--color-coral-400)] animate-pulse" />
            <h1 className="text-xl font-black tracking-tight">
              <span className="text-[var(--color-coral-400)]">ÍRIS</span>
            </h1>
          </div>
          <div className="flex items-center gap-6">
            <div className="hidden md:flex gap-6 text-xs font-bold uppercase tracking-widest text-[var(--color-base-500)]">
              <a href="#features" className="hover:text-[var(--color-coral-400)] transition-colors">Recursos</a>
              <a href="#plans" className="hover:text-[var(--color-coral-400)] transition-colors">Planos</a>
              <Link href="/privacy" className="hover:text-[var(--color-coral-400)] transition-colors">Privacidade</Link>
            </div>
            <Button onClick={() => setShowAuth(true)} size="sm" className="bg-[var(--color-coral-500)] hover:bg-[var(--color-coral-400)] text-white border-none font-bold">
              Começar
            </Button>
          </div>
        </div>
      </nav>

      <section className="relative pt-44 pb-28 px-6">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="max-w-5xl"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="inline-flex items-center gap-3 px-4 py-2 bg-[var(--color-coral-500)]/10 border border-[var(--color-coral-500)]/20 text-[var(--color-coral-400)] rounded-full text-xs font-black uppercase tracking-[0.2em] mb-8"
            >
              <span className="w-2 h-2 rounded-full bg-[var(--color-coral-400)] animate-pulse" />
              Tecnologia acolhedora para proteção
            </motion.div>

            <h2 className="text-6xl md:text-8xl lg:text-[96px] font-black leading-[0.92] mb-10 tracking-tight">
              Você não está<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--color-coral-400)] via-[var(--color-coral-300)] to-[var(--color-lavender-400)]">
                sozinha.
              </span>
            </h2>

            <div className="max-w-2xl text-xl text-[var(--color-base-400)] leading-relaxed font-medium mb-14 space-y-4">
              <p>
                O Íris oferece clareza e segurança para que você possa entender padrões e tomar decisões com mais confiança.
              </p>
              <p>
                Uma ferramenta acolhedora, diseñada para empowerment e proteção — sem julgamentos.
              </p>
            </div>

            <div className="flex flex-wrap gap-4">
              <Button onClick={() => setShowAuth(true)} size="lg" className="bg-[var(--color-coral-500)] hover:bg-[var(--color-coral-400)] text-white border-none font-bold shadow-lg shadow-[var(--color-coral-500)]/25">
                Começar agora — é gratuito
              </Button>
              <a
                href="#features"
                className="inline-flex items-center gap-2 px-8 py-4 bg-[var(--color-base-800)]/50 border border-[var(--color-base-700)] text-[var(--color-base-300)] rounded-full font-bold text-lg transition-all hover:bg-[var(--color-base-800)]"
              >
                Conhecer mais
              </a>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="py-8 px-6 bg-[var(--color-petroleum-700)]/10 border-y border-[var(--color-petroleum-700)]/20">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-wrap items-center gap-4 justify-center md:justify-start">
            <span className="text-xs font-black uppercase tracking-widest text-[var(--color-petroleum-400)]">
              Em perigo?
            </span>
            {emergencyContacts.map((c) => (
              <a
                key={c.number}
                href={`tel:${c.number}`}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-all text-sm font-bold ${
                  c.color === "coral"
                    ? "bg-[var(--color-coral-500)]/20 border-[var(--color-coral-500)]/40 text-[var(--color-coral-300)] hover:bg-[var(--color-coral-500)]/30"
                    : "bg-[var(--color-base-900)]/50 border-[var(--color-base-800)] text-[var(--color-base-400)] hover:text-white"
                }`}
              >
                <span className="text-lg font-black">{c.number}</span>
                <span className="text-xs opacity-70">{c.label}</span>
              </a>
            ))}
          </div>
        </div>
      </section>

      <section className="py-28 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-xs font-black uppercase tracking-widest text-[var(--color-base-600)] mb-3">A realidade que os dados revelam</p>
            <h3 className="text-4xl md:text-5xl font-black tracking-tight">Números que não podemos ignorar.</h3>
          </div>
          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6"
          >
            {stats.map((stat, i) => (
              <motion.div key={i} variants={itemVariants} className="group p-8 bg-[var(--color-base-900)]/80 border border-[var(--color-base-800)] rounded-3xl hover:border-[var(--color-petroleum-700)]/50 transition-all duration-500 hover:-translate-y-1">
                <div className={`text-4xl font-black mb-2 ${stat.color}`}>{stat.value}</div>
                <div className="text-white font-bold text-base mb-1">{stat.label}</div>
                <div className="text-[var(--color-base-500)] text-sm mb-4 leading-snug">{stat.detail}</div>
                <div className="text-[10px] font-black uppercase tracking-widest text-[var(--color-base-700)] border-t border-[var(--color-base-800)] pt-3">
                  {stat.source}
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      <section className="py-16 px-6 bg-[var(--color-base-900)]/30 border-y border-[var(--color-base-800)]/30">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h3 className="text-2xl md:text-3xl font-black tracking-tight mb-3">
              Sua segurança é nossa prioridade
            </h3>
            <p className="text-[var(--color-base-500)] text-base max-w-xl mx-auto">
              Implementamos múltiplas camadas de proteção para garantir sua privacidade e segurança.
            </p>
          </div>
          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4"
          >
            {securityFeatures.map((feature, i) => (
              <motion.div
                key={i}
                variants={itemVariants}
                className="p-4 bg-[var(--color-base-900)]/80 border border-[var(--color-base-800)] rounded-2xl text-center hover:border-[var(--color-ocean-600)]/50 transition-all group"
              >
                <div className="w-12 h-12 mx-auto mb-3 bg-[var(--color-ocean-500)]/10 rounded-xl flex items-center justify-center text-[var(--color-ocean-400)] group-hover:bg-[var(--color-ocean-500)]/20 group-hover:text-[var(--color-ocean-300)] transition-all">
                  {feature.icon}
                </div>
                <h4 className="text-sm font-bold mb-1 text-[var(--color-base-200)]">{feature.title}</h4>
                <p className="text-xs text-[var(--color-base-500)]">{feature.description}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      <section id="features" className="py-32 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <h3 className="text-4xl md:text-6xl font-black tracking-tight mb-4">
              Feito para você
            </h3>
            <p className="text-[var(--color-base-500)] text-xl max-w-xl mx-auto font-medium">
              Tecnologia acolhedora, sem vigilância. Clareza para decisões.
            </p>
          </div>
          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            className="grid md:grid-cols-2 lg:grid-cols-4 gap-6"
          >
            {features.map((f, i) => (
              <motion.div key={i} variants={itemVariants} className="group p-8 bg-[var(--color-base-900)]/60 border border-[var(--color-base-800)] rounded-3xl hover:bg-[var(--color-base-900)] transition-all duration-500 hover:-translate-y-1">
                <div className="w-14 h-14 bg-[var(--color-petroleum-500)]/10 rounded-2xl flex items-center justify-center text-[var(--color-petroleum-400)] mb-6 border border-[var(--color-petroleum-500)]/20 group-hover:bg-[var(--color-petroleum-500)] group-hover:text-white group-hover:border-[var(--color-petroleum-500)] transition-all duration-500">
                  {f.icon}
                </div>
                <h4 className="text-xl font-bold mb-3 tracking-tight">{f.title}</h4>
                <p className="text-[var(--color-base-500)] leading-relaxed text-sm">{f.description}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      <section id="plans" className="py-24 px-6 bg-[var(--color-base-900)]/40 border-y border-[var(--color-base-800)]/40">
        <div className="max-w-5xl mx-auto text-center">
          <h3 className="text-3xl md:text-5xl font-black tracking-tight mb-4">Planos acessíveis</h3>
          <p className="text-[var(--color-base-500)] text-lg mb-16">Escolha o que faz sentido para você</p>
          <div className="grid md:grid-cols-3 gap-8">
            {plans.map((plan, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                viewport={{ once: true }}
                className={`p-8 rounded-3xl border ${plan.highlight ? "bg-gradient-to-br from-[var(--color-coral-500)]/10 to-[var(--color-lavender-500)]/10 border-[var(--color-coral-500)]/30" : "bg-[var(--color-base-900)] border-[var(--color-base-800)]"}`}
              >
                {plan.highlight && <Badge className="mb-4">Mais popular</Badge>}
                <h4 className="text-xl font-bold mb-2">{plan.name}</h4>
                <div className="mb-6">
                  <span className="text-4xl font-black">{plan.price}</span>
                  <span className="text-[var(--color-base-500)]">/{plan.period}</span>
                </div>
                <ul className="space-y-3 mb-8 text-left">
                  {plan.features.map((feature, j) => (
                    <li key={j} className="flex items-center gap-3 text-sm">
                      <svg className="w-5 h-5 text-[var(--color-success)] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-[var(--color-base-300)]">{feature}</span>
                    </li>
                  ))}
                </ul>
                <Button variant={plan.highlight ? "primary" : "secondary"} className="w-full bg-[var(--color-coral-500)] hover:bg-[var(--color-coral-400)] text-white border-none" onClick={() => setShowAuth(true)}>
                  Escolher {plan.name}
                </Button>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24 px-6">
        <div className="max-w-3xl mx-auto">
          <h3 className="text-3xl md:text-5xl font-black tracking-tight mb-12 text-center">Perguntas frequentes</h3>
          <div className="space-y-4">
            {faq.map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                viewport={{ once: true }}
                className="bg-[var(--color-base-900)] border border-[var(--color-base-800)] rounded-2xl overflow-hidden"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full p-6 text-left flex items-center justify-between font-semibold"
                >
                  {item.q}
                  <svg className={`w-5 h-5 transition-transform ${openFaq === i ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {openFaq === i && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="px-6 pb-6 text-[var(--color-base-400)]"
                  >
                    {item.a}
                  </motion.div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-32 px-6">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="bg-gradient-to-br from-[var(--color-petroleum-600)] via-[var(--color-petroleum-500)] to-[var(--color-lavender-600)] rounded-[3rem] p-10 md:p-20 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/3" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-black/20 rounded-full blur-[60px] translate-y-1/2 -translate-x-1/4" />
            <div className="relative z-10 max-w-3xl">
              <h3 className="text-5xl md:text-7xl font-black text-white mb-6 tracking-tight leading-[0.9]">
                Sua voz merece<br />
                <span className="text-white/40">ser ouvida.</span>
              </h3>
              <p className="text-xl text-white/80 font-medium mb-10 leading-relaxed">
                O Íris está aqui para oferecer clareza, não julgamentos. O primeiro passo é seu.
              </p>
              <div className="flex flex-wrap gap-4">
                <Button onClick={() => setShowAuth(true)} size="lg" className="bg-white text-[var(--color-petroleum-700)] hover:bg-white/90 border-none font-bold shadow-xl">
                  Começar agora — é gratuito
                </Button>
                <a
                  href="tel:180"
                  className="inline-flex items-center gap-2 border-2 border-white/40 text-white px-8 py-4 rounded-full font-bold text-lg transition-all hover:bg-white/10"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  Ligue 180 — gratuito 24h
                </a>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <footer className="py-20 border-t border-[var(--color-base-900)] bg-[var(--color-base-950)]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-8 mb-12">
            <div>
              <h1 className="text-2xl font-black tracking-tight text-[var(--color-coral-400)] mb-1">ÍRIS</h1>
              <p className="text-xs text-[var(--color-base-600)] font-medium">Tecnologia acolhedora para proteção</p>
            </div>
            <div className="flex flex-wrap gap-8 text-xs font-black uppercase tracking-widest text-[var(--color-base-600)]">
              <Link href="/privacy" className="hover:text-[var(--color-coral-400)] transition-colors">Privacidade</Link>
              <a href="tel:180" className="hover:text-[var(--color-coral-400)] transition-colors">Ligue 180</a>
              <a href="tel:190" className="hover:text-[var(--color-coral-400)] transition-colors">Emergência 190</a>
            </div>
          </div>
          <div className="p-6 bg-[var(--color-base-900)] rounded-2xl border border-[var(--color-base-800)]">
            <p className="text-xs text-[var(--color-base-700)] leading-relaxed text-center font-medium">
              AVISO: O Íris é uma plataforma educativa para detecção de padrões e conscientização. Não substitui a Polícia Civil (197), Polícia Militar (190) ou Central de Atendimento à Mulher (180). Os dados e relatórios gerados não possuem validade jurídica como prova pericial. Em situações de perigo imediato, ligue 190.
            </p>
          </div>
          <p className="mt-8 text-center text-[var(--color-base-800)] text-xs">
            © {new Date().getFullYear()} ÍRIS. Todos os direitos reservados.
          </p>
        </div>
      </footer>

      <AuthModal isOpen={showAuth} onClose={() => setShowAuth(false)} />
    </main>
  );
}
