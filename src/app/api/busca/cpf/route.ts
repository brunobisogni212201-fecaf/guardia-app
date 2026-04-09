import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/shared/lib/services/rate-limit";

function getClientIP(request: NextRequest): string {
  const xff = request.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp;
  return "unknown";
}

function validateCPF(cpf: string): boolean {
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

function formatCPF(cpf: string): string {
  return `${cpf.slice(0, 3)}.${cpf.slice(3, 6)}.${cpf.slice(6, 9)}-${cpf.slice(9)}`;
}

function maskName(nome: string | null): string {
  if (!nome || nome.length < 3) return "***";
  const parts = nome.split(" ");
  return parts.map(part => {
    if (part.length <= 2) return part[0] + "***";
    return part[0] + "*".repeat(part.length - 1);
  }).join(" ");
}

function maskBirthDate(date: string): string {
  if (!date) return "**/**/****";
  const parts = date.split("/");
  if (parts.length === 3) {
    return `**/**/${parts[2]}`;
  }
  return date;
}

function parseSituacao(situacao: string | undefined): string {
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

export async function POST(request: NextRequest) {
  const ip = getClientIP(request);
  const rateLimit = checkRateLimit(ip);

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Limite de consultas excedido", code: "RATE_LIMITED" },
      { status: 429 }
    );
  }

  try {
    const contentType = request.headers.get("content-type") || "";
    let cpf: string;
    let dadosManuais: Record<string, string | null> = {};

    if (contentType.includes("application/json")) {
      const body = await request.json();
      cpf = body.cpf;
      if (body.nome || body.nomeMae || body.dataNascimento || body.sexo || body.situacao) {
        dadosManuais = {
          nome: body.nome || "",
          nomeMae: body.nomeMae || body.nome_mae || null,
          dataNascimento: body.dataNascimento || body.data_nascimento || "",
          sexo: body.sexo || body.genero || "M",
          situacao: body.situacao || body.status || "regular",
        };
      }
    } else if (contentType.includes("text/csv") || contentType.includes("multipart/form-data")) {
      const body = await request.text();
      const lines = body.trim().split("\n");
      if (lines.length >= 2) {
        const headers = lines[0].split(",").map(h => h.trim().toLowerCase().replace(/"/g, ""));
        const values = lines[1].split(",").map(v => v.trim().replace(/"/g, ""));
        const parsed: Record<string, string> = {};
        headers.forEach((h, i) => { parsed[h] = values[i] || ""; });
        cpf = parsed.cpf || parsed.cpf_numero || "";
        if (parsed.nome || parsed.nomemae) {
          dadosManuais = {
            nome: parsed.nome || parsed.nomecompleto || "",
            nomeMae: parsed.nomemae || parsed.nomemae || parsed.mother || null,
            dataNascimento: parsed.datanascimento || parsed.data_nascimento || parsed.birthdate || "",
            sexo: parsed.sexo || parsed.genero || "M",
            situacao: parsed.situacao || parsed.status || "regular",
          };
        }
      } else {
        return NextResponse.json({ error: "CSV inválido" }, { status: 400 });
      }
    } else {
      return NextResponse.json(
        { error: "Content-Type deve ser application/json ou text/csv" },
        { status: 400 }
      );
    }

    if (!cpf) {
      return NextResponse.json({ error: "CPF é obrigatório" }, { status: 400 });
    }

    const cpfClean = cpf.replace(/\D/g, "");

    if (!validateCPF(cpfClean)) {
      return NextResponse.json({ error: "CPF inválido", code: "INVALID_CPF" }, { status: 400 });
    }

    const apiKey = process.env.APICPF_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "API não configurada", code: "API_ERROR" }, { status: 500 });
    }

    const response = await fetch(`https://apicpf.com/api/consulta?cpf=${cpfClean}`, {
      headers: {
        "X-API-KEY": apiKey,
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(10000),
    });

    if (response.status === 429) {
      return NextResponse.json({ error: "Limite de consultas excedido na API", code: "RATE_LIMITED" }, { status: 429 });
    }

    const json = await response.json();

    if (!response.ok || json.error || json.message?.includes("não encontrado")) {
      return NextResponse.json(
        { error: json.message || "CPF não encontrado", code: "NOT_FOUND" },
        { status: 404 }
      );
    }

    const data = json.data || json;

    const result = {
      cpf: formatCPF(cpfClean),
      nome: maskName(data.nome || ""),
      nomeCompleto: data.nome || "",
      nomeMae: data.nome_mae ? maskName(data.nome_mae) : null,
      nomeMaeCompleto: data.nome_mae || null,
      dataNascimento: maskBirthDate(formatDate(data.data_nascimento || data.dataNascimento)),
      dataNascimentoCompleta: formatDate(data.data_nascimento || data.dataNascimento),
      sexo: (data.genero || data.sexo) === "M" ? "Masculino" : "Feminino",
      situacao: parseSituacao(data.situacao || data.status),
      situacaoOriginal: data.situacao || data.status || "regular",
      source: "apicpf",
      rateLimit: {
        remaining: rateLimit.remaining,
        resetAt: rateLimit.resetAt,
      },
    };

    return NextResponse.json(result, {
      headers: {
        "X-RateLimit-Remaining": String(rateLimit.remaining),
        "X-RateLimit-Reset": String(rateLimit.resetAt),
      },
    });
  } catch (error) {
    console.error("CPF search error:", error);
    return NextResponse.json({ error: "Erro ao processar consulta" }, { status: 500 });
  }
}
