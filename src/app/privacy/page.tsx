"use client";

import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent } from "@/shared/design-system/components/Card";
import { Alert } from "@/shared/design-system/components/Alert";
import { Badge } from "@/shared/design-system/components/Badge";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[var(--color-base-950)]">
      <nav className="fixed top-0 left-0 right-0 z-40 bg-[var(--color-base-900)]/80 backdrop-blur-xl border-b border-[var(--color-base-800)]">
        <div className="max-w-4xl mx-auto px-6 py-4 flex justify-between items-center">
          <Link href="/" className="text-2xl font-bold flex items-center gap-2">
            <span className="text-[var(--color-ocean-500)]">Íris</span>
          </Link>
          <Link
            href="/"
            className="text-[var(--color-base-400)] hover:text-[var(--color-base-100)] font-medium transition-colors"
          >
            Voltar para Início
          </Link>
        </div>
      </nav>

      <main className="pt-32 pb-24 px-4">
        <div className="max-w-3xl mx-auto space-y-8">
          <div className="text-center">
            <Badge variant="info" className="mb-4">
              Transparência e Confiança
            </Badge>
            <h1 className="text-4xl md:text-5xl font-bold text-[var(--color-base-50)] mb-6">
              Privacidade e Uso de Dados
            </h1>
            <p className="text-[var(--color-base-400)] text-lg leading-relaxed max-w-2xl mx-auto">
              A sua segurança e o sigilo de suas informações são nosso compromisso fundamental. 
              Estruturamos toda a plataforma com ferramentas de proteção e anonimização de dados 
              a partir da <strong className="text-[var(--color-base-200)]">Lei Geral de Proteção de Dados (LGPD)</strong>.
            </p>
          </div>

          <Alert variant="warning" title="Propósito educacional e limitações">
            <div className="space-y-3 text-[var(--color-base-200)]">
              <p>
                O Íris é uma ferramenta com intuito de ajudar a prevenir e informar indicativos 
                e sinais de alerta em conversas.
              </p>
              <p>
                <strong className="text-[var(--color-coral-400)]">NÓS NÃO OFERECEMOS DIAGNÓSTICOS</strong> clínicos, 
                psicológicos ou legais.
              </p>
              <p>
                Os resultados e análises gerados por esta plataforma <strong className="text-[var(--color-coral-400)]">NUNCA DEVEM SER USADOS COMO PROVA</strong> ou 
                parecer técnico em processos judiciais. Se você estiver sob risco, entre em contato com as autoridades.
              </p>
            </div>
          </Alert>

          <Card>
            <CardHeader>
              <CardTitle>Como protegemos seus dados?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-[var(--color-base-300)]">
              <div className="flex gap-4">
                <div className="w-10 h-10 rounded-xl bg-[var(--color-ocean-950)] flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-[var(--color-ocean-400)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <div>
                  <h4 className="font-semibold text-[var(--color-base-100)] mb-1">Anonimização Automática</h4>
                  <p className="text-sm">
                    Antes de qualquer análise, informações que possam identificá-la (PII) como nomes, 
                    telefones, e-mails e CPFs são automaticamente hasheados.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="w-10 h-10 rounded-xl bg-[var(--color-ocean-950)] flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-[var(--color-ocean-400)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <div>
                  <h4 className="font-semibold text-[var(--color-base-100)] mb-1">Sem Exposição</h4>
                  <p className="text-sm">
                    Implementamos tecnologias de prevenção de capturas de tela para inibir 
                    vazamentos locais das suas informações.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="w-10 h-10 rounded-xl bg-[var(--color-ocean-950)] flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-[var(--color-ocean-400)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </div>
                <div>
                  <h4 className="font-semibold text-[var(--color-base-100)] mb-1">Descarte e Retenção</h4>
                  <p className="text-sm">
                    Mensagens enviadas para análise não retroalimentam IAs com seus dados pessoais reais. 
                    Evitamos retenção de conversas em formato legível duradouro.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Sobre a Inteligência Artificial</CardTitle>
            </CardHeader>
            <CardContent className="text-[var(--color-base-300)]">
              <p className="mb-4">
                Utilizamos tecnologia Gemini para investigar comportamentos que frequentemente se 
                caracterizam como ciclos de abuso. O objetivo é fornecer a você um contexto sobre 
                <em className="text-[var(--color-base-200)]"> &ldquo;o que significa isso?&rdquo; </em> 
                e apontar alertas antes de uma potencial piora de comportamento.
              </p>
              <p className="text-sm text-[var(--color-base-500)]">
                As IAs são passíveis de erros, não compreendendo falas de duplo sentido em sua totalidade, 
                por isso o caráter é sempre educativo e reflexivo.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Direitos do Titular (LGPD)</CardTitle>
            </CardHeader>
            <CardContent className="text-[var(--color-base-300)]">
              <p>
                Como usuária, você detém todos os direitos previstos na legislação brasileira:
              </p>
              <ul className="mt-4 space-y-2">
                {[
                  "Exclusão definitiva da conta",
                  "Revogação de acessos",
                  "Confirmação dos seus dados",
                  "Anonimato garantido",
                ].map((right, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-[var(--color-success)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>{right}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Alert variant="info" title="Precisa de ajuda?">
            <div className="space-y-2 text-[var(--color-base-200)]">
              <p>
                <strong className="text-[var(--color-ocean-300)]">180</strong> — Central de Atendimento à Mulher
              </p>
              <p>
                <strong className="text-[var(--color-ocean-300)]">190</strong> — Emergência Policial
              </p>
              <p>
                <strong className="text-[var(--color-ocean-300)]">https://www.whiterose.com.br</strong> — Rede de apoio
              </p>
            </div>
          </Alert>
        </div>
      </main>
    </div>
  );
}
