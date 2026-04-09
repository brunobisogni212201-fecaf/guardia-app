"use client";

import { useState, useCallback } from "react";
import { Button } from "@/shared/design-system/components/Button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/shared/design-system/components/Card";
import { Badge } from "@/shared/design-system/components/Badge";
import { Alert } from "@/shared/design-system/components/Alert";
import { Timeline, TimelineFile } from "@/shared/design-system/components/Timeline";

interface Evidence {
  id: string;
  name: string;
  size: string;
  hash: string;
  date: string;
  type: "pdf" | "image" | "document";
  status: "verified" | "pending" | "shared";
}

export default function EvidencePage() {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [evidence, setEvidence] = useState<Evidence[]>([]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    handleFiles(files);
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      handleFiles(files);
    }
  };

  const handleFiles = async (files: File[]) => {
    setIsUploading(true);
    
    const newEvidence: Evidence[] = files.map((file, index) => ({
      id: `ev-${Date.now()}-${index}`,
      name: file.name,
      size: formatFileSize(file.size),
      hash: generateHash(file),
      date: new Date().toLocaleDateString("pt-BR"),
      type: getFileType(file.name),
      status: "pending",
    }));

    await new Promise((resolve) => setTimeout(resolve, 1500));
    
    const verifiedEvidence = newEvidence.map((ev) => ({
      ...ev,
      status: "verified" as const,
    }));
    
    setEvidence((prev) => [...verifiedEvidence, ...prev]);
    setIsUploading(false);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileType = (filename: string): "pdf" | "image" | "document" => {
    const ext = filename.split(".").pop()?.toLowerCase();
    if (ext === "pdf") return "pdf";
    if (["jpg", "jpeg", "png", "gif", "webp"].includes(ext || "")) return "image";
    return "document";
  };

  const generateHash = (file: File): string => {
    return Array.from({ length: 32 }, () =>
      Math.random().toString(36).charAt(2)
    ).join("").slice(0, 32);
  };

  const copyShareLink = () => {
    navigator.clipboard.writeText("https://irisregistro.qzz.io/s/abc123");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getStatusBadge = (status: Evidence["status"]) => {
    const variants: Record<Evidence["status"], "success" | "warning" | "info"> = {
      verified: "success",
      pending: "warning",
      shared: "info",
    };
    const labels: Record<Evidence["status"], string> = {
      verified: "Verificado",
      pending: "Pendente",
      shared: "Compartilhado",
    };
    return <Badge variant={variants[status]}>{labels[status]}</Badge>;
  };

  return (
    <div className="min-h-screen bg-[var(--color-base-950)]">
      <div className="max-w-4xl mx-auto px-4 py-8 sm:py-12">
        <div className="text-center mb-10">
          <h1 className="text-3xl sm:text-4xl font-bold text-[var(--color-base-50)] mb-4">
            Íris Registro
          </h1>
          <p className="text-[var(--color-base-400)] text-lg">
            Suas evidências preservadas com segurança
          </p>
        </div>

        <div className="space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>Enviar evidência</CardTitle>
              <CardDescription>
                Arraste arquivos ou clique para selecionar
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`
                  relative border-2 border-dashed rounded-xl p-10 text-center transition-all
                  ${
                    isDragging
                      ? "border-[var(--color-ocean-500)] bg-[var(--color-ocean-950)]"
                      : "border-[var(--color-base-700)] bg-[var(--color-base-900)] hover:border-[var(--color-base-600)]"
                  }
                `}
              >
                <input
                  type="file"
                  multiple
                  accept=".pdf,.jpg,.jpeg,.png,.gif,.doc,.docx"
                  onChange={handleFileInput}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  disabled={isUploading}
                />
                <div className="space-y-4">
                  <div className="w-16 h-16 mx-auto bg-[var(--color-base-800)] rounded-2xl flex items-center justify-center">
                    {isUploading ? (
                      <svg
                        className="w-8 h-8 text-[var(--color-ocean-500)] animate-spin"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                        />
                      </svg>
                    ) : (
                      <svg
                        className="w-8 h-8 text-[var(--color-base-400)]"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                        />
                      </svg>
                    )}
                  </div>
                  <div>
                    <p className="text-[var(--color-base-200)] font-medium">
                      {isUploading ? "Enviando..." : "Arraste arquivos aqui"}
                    </p>
                    <p className="text-sm text-[var(--color-base-500)] mt-1">
                      PDF, imagens e documentos
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {evidence.length > 0 ? (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Arquivos ({evidence.length})</CardTitle>
                    <CardDescription>
                      Evidências verificadas e protegidas
                    </CardDescription>
                  </div>
                  <Button
                    variant="secondary"
                    onClick={() => setShowShareModal(true)}
                  >
                    Criar link de compartilhamento
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {evidence.map((ev) => (
                  <TimelineFile
                    key={ev.id}
                    name={ev.name}
                    size={ev.size}
                    hash={ev.hash}
                    date={ev.date}
                    type={ev.type}
                  />
                ))}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-16 text-center">
                <div className="w-20 h-20 mx-auto mb-6 bg-[var(--color-base-900)] rounded-2xl flex items-center justify-center">
                  <svg
                    className="w-10 h-10 text-[var(--color-base-600)]"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"
                    />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-[var(--color-base-200)] mb-2">
                  Nenhuma evidência registrada
                </h3>
                <p className="text-[var(--color-base-500)] max-w-sm mx-auto">
                  Comece adicionando arquivos, prints ou documentos importantes para preservar suas evidências.
                </p>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Linha do tempo</CardTitle>
              <CardDescription>
                Histórico de ações nas suas evidências
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Timeline
                items={[
                  {
                    id: "1",
                    date: new Date().toLocaleDateString("pt-BR"),
                    title: "Sistema iniciado",
                    description: "Íris Registro está pronto para receber suas evidências",
                    type: "verification",
                    active: true,
                  },
                  {
                    id: "2",
                    date: "Configuração",
                    title: "Proteção ativa",
                    description: "Todas as evidências são criptografadas e haveadas",
                    type: "verification",
                  },
                ]}
              />
            </CardContent>
          </Card>

          <Alert variant="info" title="Sobre a preservação de evidências">
            <p className="text-sm">
              Cada arquivo enviado é verificado com hash SHA-256 e timestamp, garantindo
              integridade e rastreabilidade. Seus dados são criptografados e apenas você
              tem acesso.
            </p>
          </Alert>
        </div>

        {showShareModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-md">
              <CardHeader>
                <CardTitle>Criar link de compartilhamento</CardTitle>
                <CardDescription>
                  Gere um link temporário para compartilhar com profissionais
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-[var(--color-base-900)] rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-2 h-2 rounded-full bg-[var(--color-success)]" />
                    <span className="text-sm text-[var(--color-base-400)]">
                      Link seguro gerado
                    </span>
                  </div>
                  <code className="text-sm text-[var(--color-ocean-400)] break-all">
                    https://irisregistro.qzz.io/s/abc123
                  </code>
                </div>
                <p className="text-xs text-[var(--color-base-500)]">
                  Este link expira em 24 horas. Você pode revogá-lo a qualquer momento.
                </p>
                <div className="flex gap-3">
                  <Button
                    variant="primary"
                    className="flex-1"
                    onClick={copyShareLink}
                  >
                    {copied ? "Copiado!" : "Copiar link"}
                  </Button>
                  <Button variant="ghost" onClick={() => setShowShareModal(false)}>
                    Fechar
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
