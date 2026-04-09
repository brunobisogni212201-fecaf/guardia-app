"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [step, setStep] = useState<"complete">("complete");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);

  const [form, setForm] = useState({
    cpf: "",
    whatsapp: "",
    cep: "",
    whatsappFormatted: "",
    cepFormatted: "",
    addressData: {
      logradouro: "",
      bairro: "",
      cidade: "",
      estado: "",
    },
  });

  const [userData, setUserData] = useState({
    name: "",
    email: "",
  });

  useEffect(() => {
    const stepParam = searchParams.get("step");
    const tokenParam = searchParams.get("token");
    const nameParam = searchParams.get("name") || "";
    const emailParam = searchParams.get("email") || "";

    if (stepParam === "complete" && tokenParam) {
      setStep("complete");
      setToken(tokenParam);
      setUserData({
        name: decodeURIComponent(nameParam),
        email: decodeURIComponent(emailParam),
      });
    } else {
      router.push("/");
    }
  }, [searchParams, router]);

  useEffect(() => {
    if (form.cepFormatted.length === 8) {
      fetch(`https://viacep.com.br/ws/${form.cepFormatted}/json/`)
        .then((res) => res.json())
        .then((data) => {
          if (!data.erro) {
            setForm((prev) => ({
              ...prev,
              addressData: {
                logradouro: data.logradouro || "",
                bairro: data.bairro || "",
                cidade: data.localidade || "",
                estado: data.uf || "",
              },
            }));
          }
        })
        .catch(() => {});
    }
  }, [form.cepFormatted]);

  const formatCPF = (value: string) => {
    const cleaned = value.replace(/\D/g, "").slice(0, 11);
    return cleaned
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
      .replace(/(\d{3})\.(\d{3})\.(\d{3})(\d)/, "$1.$2.$3-$4");
  };

  const formatWhatsApp = (value: string) => {
    const cleaned = value.replace(/\D/g, "").slice(0, 11);
    if (cleaned.length <= 2) return cleaned;
    if (cleaned.length <= 7) return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2)}`;
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
  };

  const formatCEP = (value: string) => {
    const cleaned = value.replace(/\D/g, "").slice(0, 8);
    if (cleaned.length <= 5) return cleaned;
    return `${cleaned.slice(0, 5)}-${cleaned.slice(5)}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/complete-registration", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          cpf: form.cpf,
          whatsapp: form.whatsapp,
          cep: form.cep,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erro ao completar cadastro");
      }

      router.push("/dashboard?welcome=true");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao completar cadastro");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[var(--color-base-950)]">
      <div className="max-w-lg mx-auto px-6 py-16">
        <div className="text-center mb-10">
          <Link href="/" className="inline-flex items-center gap-2 mb-8">
            <div className="w-2 h-2 rounded-full bg-[var(--color-coral-400)] animate-pulse" />
            <span className="text-xl font-black tracking-tight text-white">
              <span className="text-[var(--color-coral-400)]">ÍRIS</span>
            </span>
          </Link>

          <h1 className="text-3xl font-bold text-white mb-2">
            Complete seu cadastro
          </h1>
          <p className="text-[var(--color-base-400)]">
            Olá, <span className="text-white font-medium">{userData.name || userData.email}</span>! 
            <br />Precisamos de mais algumas informações.
          </p>
        </div>

        <div className="bg-[var(--color-base-900)] border border-[var(--color-base-800)] rounded-2xl p-8">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-full bg-[var(--color-petroleum-500)]/20 flex items-center justify-center text-[var(--color-petroleum-400)]">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-white">Dados protegidos</p>
              <p className="text-xs text-[var(--color-base-500)]">Suas informações são criptografadas</p>
            </div>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-[var(--color-warning)]/10 border border-[var(--color-warning)]/30 rounded-xl">
              <p className="text-sm text-[var(--color-warning)]">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-[var(--color-base-300)] mb-2">
                CPF <span className="text-[var(--color-coral-400)]">*</span>
              </label>
              <input
                type="text"
                value={form.cpf}
                onChange={(e) => setForm({ ...form, cpf: formatCPF(e.target.value) })}
                placeholder="000.000.000-00"
                className="w-full px-4 py-3 bg-[var(--color-base-800)] border border-[var(--color-base-700)] rounded-xl text-white placeholder-[var(--color-base-500)] focus:outline-none focus:border-[var(--color-coral-500)] transition-colors"
                required
              />
              <p className="mt-1 text-xs text-[var(--color-base-500)]">
                Apenas para mulheres. Seus dados são protegidos pela LGPD.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--color-base-300)] mb-2">
                WhatsApp <span className="text-[var(--color-coral-400)]">*</span>
              </label>
              <input
                type="tel"
                value={form.whatsappFormatted}
                onChange={(e) => {
                  const raw = e.target.value.replace(/\D/g, "");
                  setForm({
                    ...form,
                    whatsapp: raw,
                    whatsappFormatted: formatWhatsApp(raw),
                  });
                }}
                placeholder="(00) 00000-0000"
                className="w-full px-4 py-3 bg-[var(--color-base-800)] border border-[var(--color-base-700)] rounded-xl text-white placeholder-[var(--color-base-500)] focus:outline-none focus:border-[var(--color-coral-500)] transition-colors"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--color-base-300)] mb-2">
                CEP <span className="text-[var(--color-coral-400)]">*</span>
              </label>
              <input
                type="text"
                value={form.cepFormatted}
                onChange={(e) => {
                  const raw = e.target.value.replace(/\D/g, "");
                  setForm({
                    ...form,
                    cep: raw,
                    cepFormatted: formatCEP(raw),
                  });
                }}
                placeholder="00000-000"
                className="w-full px-4 py-3 bg-[var(--color-base-800)] border border-[var(--color-base-700)] rounded-xl text-white placeholder-[var(--color-base-500)] focus:outline-none focus:border-[var(--color-coral-500)] transition-colors"
                required
              />
              {form.addressData.cidade && (
                <p className="mt-1 text-xs text-[var(--color-base-400)]">
                  {form.addressData.logradouro && `${form.addressData.logradouro}, `}
                  {form.addressData.bairro && `${form.addressData.bairro}, `}
                  {form.addressData.cidade} - {form.addressData.estado}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-[var(--color-coral-500)] hover:bg-[var(--color-coral-600)] text-white font-semibold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Salvando...
                </span>
              ) : (
                "Completar Cadastro"
              )}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-[var(--color-base-800)]">
            <p className="text-xs text-[var(--color-base-500)] text-center">
              Ao continuar, você concorda com nossa{" "}
              <Link href="/privacy" className="text-[var(--color-coral-400)] hover:underline">
                Política de Privacidade
              </Link>
            </p>
          </div>
        </div>

        <p className="text-center mt-6">
          <Link href="/" className="text-sm text-[var(--color-base-500)] hover:text-white transition-colors">
            ← Voltar para home
          </Link>
        </p>
      </div>
    </main>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[var(--color-base-950)] flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-2 border-[var(--color-coral-500)] border-t-transparent rounded-full" />
      </div>
    }>
      <RegisterForm />
    </Suspense>
  );
}
