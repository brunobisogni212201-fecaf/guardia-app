"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const stats = [
  {
    value: "87.000+",
    label: "Estupros registrados",
    year: "2024",
    source: "Anuário Brasileiro de Segurança Pública",
  },
  {
    value: "1.492",
    label: "Feminicídios",
    year: "2024",
    source: "Anuário Brasileiro de Segurança Pública",
  },
  {
    value: "+19%",
    label: "Aumento de feminicídios",
    year: "2024 vs 2023",
    source: "Anuário Brasileiro de Segurança Pública",
  },
  {
    value: "1 a cada 4min",
    label: "Violência doméstica",
    year: "Brasil",
    source: "Atlas da Violência 2025",
  },
];

const features = [
  {
    icon: "🔒",
    title: "Anonimização LGPD",
    description: "Seus dados são protegidos. Seguimos rigorosamente a LGPD.",
  },
  {
    icon: "🤖",
    title: "Análise por IA",
    description: "Tecnologia Gemini para detectar padrões de violência.",
  },
  {
    icon: "💜",
    title: "acolhimento",
    description: "Um espaço seguro para vítimas e profissionais.",
  },
];

function AuthModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [registerForm, setRegisterForm] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    acceptTerms: false,
  });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/signin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(loginForm),
      });
      if (res.ok) {
        router.push("/dashboard");
      } else {
        const data = await res.json();
        alert(data.error || "Erro ao fazer login");
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
        body: JSON.stringify({
          email: registerForm.email,
          password: registerForm.password,
        }),
      });
      if (res.ok) {
        alert("Conta criada! Verifique seu email para confirmar.");
        setMode("login");
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl p-8 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-zinc-400 hover:text-white"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>

        <div className="flex mb-6 bg-zinc-800 rounded-lg p-1">
          <button
            onClick={() => setMode("login")}
            className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${
              mode === "login"
                ? "bg-rose-500 text-white"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            Login
          </button>
          <button
            onClick={() => setMode("register")}
            className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${
              mode === "register"
                ? "bg-rose-500 text-white"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            Cadastrar
          </button>
        </div>

        {mode === "login" ? (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm text-zinc-400 mb-1">Email</label>
              <input
                type="email"
                value={loginForm.email}
                onChange={(e) =>
                  setLoginForm({ ...loginForm, email: e.target.value })
                }
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-rose-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm text-zinc-400 mb-1">Senha</label>
              <input
                type="password"
                value={loginForm.password}
                onChange={(e) =>
                  setLoginForm({ ...loginForm, password: e.target.value })
                }
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-rose-500"
                required
              />
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-rose-500 hover:bg-rose-600 disabled:bg-zinc-700 py-3 rounded-lg font-medium transition-colors"
            >
              {isLoading ? "Entrando..." : "Entrar"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="block text-sm text-zinc-400 mb-1">Email</label>
              <input
                type="email"
                value={registerForm.email}
                onChange={(e) =>
                  setRegisterForm({ ...registerForm, email: e.target.value })
                }
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-rose-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm text-zinc-400 mb-1">Senha</label>
              <input
                type="password"
                value={registerForm.password}
                onChange={(e) =>
                  setRegisterForm({ ...registerForm, password: e.target.value })
                }
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-rose-500"
                required
                minLength={8}
              />
            </div>
            <div>
              <label className="block text-sm text-zinc-400 mb-1">
                Confirmar Senha
              </label>
              <input
                type="password"
                value={registerForm.confirmPassword}
                onChange={(e) =>
                  setRegisterForm({
                    ...registerForm,
                    confirmPassword: e.target.value,
                  })
                }
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-rose-500"
                required
              />
            </div>
            <div className="flex items-start gap-2">
              <input
                type="checkbox"
                id="terms"
                checked={registerForm.acceptTerms}
                onChange={(e) =>
                  setRegisterForm({
                    ...registerForm,
                    acceptTerms: e.target.checked,
                  })
                }
                className="mt-1 rounded bg-zinc-800 border-zinc-700"
              />
              <label htmlFor="terms" className="text-xs text-zinc-400">
                Eu aceito os termos de uso e concordo que meus dados serão
                anonimizados conforme LGPD
              </label>
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-rose-500 hover:bg-rose-600 disabled:bg-zinc-700 py-3 rounded-lg font-medium transition-colors"
            >
              {isLoading ? "Criando conta..." : "Criar conta"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default function LandingPage() {
  const [showAuth, setShowAuth] = useState(false);

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <nav className="fixed top-0 left-0 right-0 z-40 bg-zinc-950/80 backdrop-blur-md border-b border-zinc-800">
        <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">
            <span className="text-rose-400">Guardiã</span>
          </h1>
          <button
            onClick={() => setShowAuth(true)}
            className="bg-rose-500 hover:bg-rose-600 px-6 py-2 rounded-full font-medium transition-colors"
          >
            Entrar
          </button>
        </div>
      </nav>

      <section className="pt-32 pb-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="max-w-3xl">
            <span className="inline-block px-4 py-1 bg-rose-500/10 text-rose-400 rounded-full text-sm font-medium mb-6">
              Proteção para mulheres
            </span>
            <h2 className="text-5xl md:text-6xl font-bold leading-tight mb-6">
              A tecnologia que{" "}
              <span className="text-rose-400">protege</span> quem mais precisa
            </h2>
            <p className="text-xl text-zinc-400 mb-8 leading-relaxed">
              A cada 4 minutos, uma mulher é violentada no Brasil. O Guardiã
              usa inteligência artificial para analisar conversas e identificar
              padrões de violência, ajudando a quebrar o ciclo antes que seja
              tarde demais.
            </p>
            <div className="flex flex-wrap gap-4">
              <button
                onClick={() => setShowAuth(true)}
                className="bg-rose-500 hover:bg-rose-600 px-8 py-4 rounded-full font-medium text-lg transition-colors"
              >
                Começar agora
              </button>
              <button className="border border-zinc-700 hover:border-zinc-600 px-8 py-4 rounded-full font-medium text-lg transition-colors">
                Saber mais
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 bg-zinc-900/50">
        <div className="max-w-6xl mx-auto px-6">
          <h3 className="text-center text-3xl font-bold mb-4">
            A realidade da violência contra mulheres no Brasil
          </h3>
          <p className="text-center text-zinc-400 mb-12 max-w-2xl mx-auto">
            Dados do Atlas da Violência 2025 e Anuário Brasileiro de Segurança
            Pública 2025
          </p>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {stats.map((stat, i) => (
              <div
                key={i}
                className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 text-center"
              >
                <div className="text-4xl font-bold text-rose-400 mb-2">
                  {stat.value}
                </div>
                <div className="text-white font-medium mb-1">{stat.label}</div>
                <div className="text-zinc-500 text-sm">
                  {stat.year} • {stat.source}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <h3 className="text-center text-3xl font-bold mb-16">
            Por que usar o Guardiã?
          </h3>
          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, i) => (
              <div
                key={i}
                className="bg-zinc-900 border border-zinc-800 rounded-xl p-8"
              >
                <div className="text-4xl mb-4">{feature.icon}</div>
                <h4 className="text-xl font-bold mb-3">{feature.title}</h4>
                <p className="text-zinc-400">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 bg-gradient-to-b from-zinc-900 to-zinc-950 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h3 className="text-3xl md:text-4xl font-bold mb-6">
            Entre para a rede de proteção
          </h3>
          <p className="text-xl text-zinc-400 mb-8">
            Junte-se a profissionais e organizações que estão transformando a
            forma como protegemos mulheres no Brasil.
          </p>
          <button
            onClick={() => setShowAuth(true)}
            className="bg-rose-500 hover:bg-rose-600 px-10 py-4 rounded-full font-medium text-lg transition-colors"
          >
            Criar conta gratuita
          </button>
        </div>
      </section>

      <footer className="py-12 border-t border-zinc-800">
        <div className="max-w-6xl mx-auto px-6 text-center text-zinc-500">
          <p className="mb-4">
            © 2026 Guardiã. Todos os direitos reservados. Seus dados são
            protegidos pela LGPD.
          </p>
          <div className="flex justify-center gap-6 text-sm">
            <a href="#" className="hover:text-zinc-300">
              Privacidade
            </a>
            <a href="#" className="hover:text-zinc-300">
              Termos
            </a>
            <a href="#" className="hover:text-zinc-300">
              LGPD
            </a>
          </div>
        </div>
      </footer>

      <AuthModal isOpen={showAuth} onClose={() => setShowAuth(false)} />
    </main>
  );
}