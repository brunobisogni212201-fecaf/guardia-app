export interface CpfResult {
  nome: string;
  nomeMae: string | null;
  dataNascimento: string;
  sexo: "M" | "F";
  situacao: "regular" | "irregular" | "cancelada" | "suspensa" | "falecido";
  cpf: string;
  cpfFormatado: string;
}

export interface CpfError {
  error: string;
  code: "INVALID_CPF" | "NOT_FOUND" | "API_ERROR" | "RATE_LIMITED";
}

export function validateCPF(cpf: string): boolean {
  const cleaned = cpf.replace(/\D/g, "");
  if (cleaned.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cleaned)) return false;

  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleaned[i]) * (10 - i);
  }
  let remainder = (sum * 10) % 11;
  if (remainder !== parseInt(cleaned[9])) return false;

  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cleaned[i]) * (11 - i);
  }
  remainder = (sum * 10) % 11;
  return remainder === parseInt(cleaned[10]);
}

export async function consultaCPF(cpf: string): Promise<CpfResult | CpfError> {
  const cleaned = cpf.replace(/\D/g, "");

  if (!validateCPF(cleaned)) {
    return { error: "CPF inválido", code: "INVALID_CPF" };
  }

  const apiKey = process.env.APICPF_API_KEY;
  if (!apiKey) {
    return { error: "API não configurada", code: "API_ERROR" };
  }

  try {
    const response = await fetch(`https://apicpf.com/api/consulta?cpf=${cleaned}`, {
      headers: {
        "X-API-KEY": apiKey,
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(10000),
    });

    if (response.status === 429) {
      return { error: "Limite de consultas excedido", code: "RATE_LIMITED" };
    }

    const json = await response.json();

    if (!response.ok || json.error || json.message?.includes("não encontrado")) {
      return { error: json.message || "CPF não encontrado", code: "NOT_FOUND" };
    }

    const data = json.data || json;

    const situacao = parseSituacao(data.situacao || data.status);

    return {
      nome: data.nome || "",
      nomeMae: data.nomeMae || data.nome_mae || null,
      dataNascimento: formatDate(data.data_nascimento || data.dataNascimento),
      sexo: (data.genero || data.sexo) === "M" ? "M" : "F",
      situacao,
      cpf: cleaned,
      cpfFormatado: formatCPF(cleaned),
    };
  } catch (error) {
    console.error("CPF API error:", error);
    return { error: "Erro ao consultar CPF", code: "API_ERROR" };
  }
}

function parseSituacao(situacao: string | undefined): CpfResult["situacao"] {
  const s = (situacao || "regular").toLowerCase();
  if (s.includes("cancelada")) return "cancelada";
  if (s.includes("suspensa")) return "suspensa";
  if (s.includes("falecido") || s.includes("óbito")) return "falecido";
  if (s.includes("irregular")) return "irregular";
  return "regular";
}

function formatDate(dateStr: string | undefined): string {
  if (!dateStr) return "";
  if (dateStr.includes("/")) return dateStr;
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString("pt-BR");
  } catch {
    return dateStr;
  }
}

function formatCPF(cpf: string): string {
  return `${cpf.slice(0, 3)}.${cpf.slice(3, 6)}.${cpf.slice(6, 9)}-${cpf.slice(9)}`;
}

export function maskCPF(cpf: string): string {
  const cleaned = cpf.replace(/\D/g, "");
  if (cleaned.length !== 11) return cpf;
  return `${cleaned.slice(0, 3)}.***.***-${cleaned.slice(9)}`;
}

export function maskName(nome: string | null): string {
  if (!nome || nome.length < 3) return "***";
  const parts = nome.split(" ");
  return parts.map(part => {
    if (part.length <= 2) return part[0] + "***";
    return part[0] + "*".repeat(part.length - 1);
  }).join(" ");
}

export function getSearchNames(cpfResult: CpfResult): { nome: string; nomeMae: string | null } {
  return {
    nome: cpfResult.nome,
    nomeMae: cpfResult.nomeMae,
  };
}
