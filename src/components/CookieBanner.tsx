"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const CONSENT_KEY = "guardia_lgpd_consent";
const CONSENT_VERSION = "v1";

export function CookieBanner({
  onAccept,
  onDecline,
}: {
  onAccept?: () => void;
  onDecline?: () => void;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(CONSENT_KEY);
    if (!stored) setVisible(true);
  }, []);

  function accept() {
    localStorage.setItem(CONSENT_KEY, CONSENT_VERSION);
    document.cookie = `${CONSENT_KEY}=${CONSENT_VERSION};max-age=31536000;path=/;SameSite=Lax`;
    setVisible(false);
    onAccept?.();
  }

  function decline() {
    localStorage.setItem(CONSENT_KEY, "declined");
    setVisible(false);
    onDecline?.();
  }

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 md:p-6">
      <div className="max-w-4xl mx-auto bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl p-5 flex flex-col md:flex-row gap-4 items-start md:items-center">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold uppercase tracking-widest text-rose-400 mb-1">
            LGPD — Privacidade
          </p>
          <p className="text-sm text-zinc-300 leading-relaxed">
            Usamos dados de localização <strong className="text-white">anonimizados</strong> (sem IP, sem identificação pessoal) para exibir o mapa de pedidos de ajuda no Brasil.
            Nenhuma informação pessoal é coletada ou armazenada.{" "}
            <Link href="/privacy" className="text-rose-400 underline underline-offset-2 hover:text-rose-300">
              Política de Privacidade
            </Link>
          </p>
        </div>
        <div className="flex gap-3 shrink-0">
          <button
            onClick={decline}
            className="px-5 py-2.5 rounded-xl border border-zinc-700 text-zinc-400 hover:text-white text-sm font-bold transition-colors"
          >
            Recusar
          </button>
          <button
            onClick={accept}
            className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-sm font-bold transition-colors shadow-lg shadow-rose-900/30"
          >
            Aceitar
          </button>
        </div>
      </div>
    </div>
  );
}

export function useConsentStatus(): "accepted" | "declined" | "pending" {
  const [status, setStatus] = useState<"accepted" | "declined" | "pending">("pending");

  useEffect(() => {
    const stored = localStorage.getItem(CONSENT_KEY);
    if (stored === CONSENT_VERSION) setStatus("accepted");
    else if (stored === "declined") setStatus("declined");
    else setStatus("pending");
  }, []);

  return status;
}
