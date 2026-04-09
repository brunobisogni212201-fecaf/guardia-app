import { NextRequest, NextResponse } from "next/server";
import { consultaAntecedentes } from "@/shared/lib/services/datajud";
import { checkRateLimit } from "@/shared/lib/services/rate-limit";

function getClientIP(request: NextRequest): string {
  const xff = request.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp;
  return "unknown";
}

export async function POST(request: NextRequest) {
  const ip = getClientIP(request);
  const rateLimit = checkRateLimit(ip);

  if (!rateLimit.allowed) {
    return NextResponse.json(
      {
        error: "Limite de consultas excedido",
        code: "RATE_LIMITED",
        retryAfter: rateLimit.retryAfter,
        resetAt: rateLimit.resetAt,
      },
      {
        status: 429,
        headers: {
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": String(rateLimit.resetAt),
          "Retry-After": String(rateLimit.retryAfter || 3600),
        },
      }
    );
  }

  try {
    const { nome, cpf } = await request.json();

    if (!nome || nome.trim().length < 3) {
      return NextResponse.json(
        { error: "Nome é obrigatório (mínimo 3 caracteres)" },
        { status: 400 }
      );
    }

    const result = await consultaAntecedentes(nome.trim(), cpf);

    if ("error" in result) {
      const status = result.code === "INVALID_NAME" ? 400 :
                     result.code === "RATE_LIMITED" ? 429 : 500;
      return NextResponse.json(result, { status });
    }

    return NextResponse.json(
      {
        ...result,
        rateLimit: {
          remaining: rateLimit.remaining,
          resetAt: rateLimit.resetAt,
        },
      },
      {
        headers: {
          "X-RateLimit-Remaining": String(rateLimit.remaining),
          "X-RateLimit-Reset": String(rateLimit.resetAt),
        },
      }
    );
  } catch (error) {
    console.error("Antecedentes search error:", error);
    return NextResponse.json(
      { error: "Erro ao processar consulta" },
      { status: 500 }
    );
  }
}
