import { NextRequest, NextResponse } from "next/server";
import { db, users, sessions } from "@/shared/lib/db";
import { hashData, generateToken } from "@/shared/lib/utils/hash";
import { eq, and, gt } from "drizzle-orm";
import { sendWelcomeEmail } from "@/shared/lib/email";

const APICPF_API_KEY = process.env.APICPF_API_KEY;

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

async function verifyCPFWithAPI(cpf: string): Promise<{ isFemale: boolean }> {
  try {
    const cleaned = cpf.replace(/\D/g, "");
    const response = await fetch(`https://apicpf.com/api/consulta?cpf=${cleaned}`, {
      headers: {
        "X-API-KEY": `${APICPF_API_KEY}`,
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(10000),
    });

    if (response.ok) {
      const json = await response.json();
      const data = json.data || json;
      const gender = data.genero || data.gender;
      return { isFemale: gender === "F" };
    }
  } catch (error) {
    console.error("CPF API error:", error);
  }

  return { isFemale: true };
}

async function getAddressByCEP(cep: string): Promise<{ lat?: number; lng?: number }> {
  try {
    const cleaned = cep.replace(/\D/g, "");
    const response = await fetch(`https://viacep.com.br/ws/${cleaned}/json/`);

    if (response.ok) {
      const data = await response.json();
      if (data.cep && !data.erro) {
        const geoResponse = await fetch(
          `https://nominatim.openstreetmap.org/search?city=${encodeURIComponent(data.localidade || "")}&state=${encodeURIComponent(data.uf || "")}&country=Brazil&format=json&limit=1`
        );

        if (geoResponse.ok) {
          const geoData = await geoResponse.json();
          if (geoData && geoData.length > 0) {
            return {
              lat: parseFloat(geoData[0].lat),
              lng: parseFloat(geoData[0].lon),
            };
          }
        }
      }
    }
  } catch (error) {
    console.error("CEP lookup error:", error);
  }

  return {};
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, cpf, whatsapp, cep } = body;

    if (!token) {
      return NextResponse.json({ error: "Token inválido" }, { status: 400 });
    }

    const tempSession = await db.query.sessions.findFirst({
      where: and(
        eq(sessions.token, token),
        gt(sessions.expiresAt, new Date())
      ),
    });

    if (!tempSession) {
      return NextResponse.json(
        { error: "Sessão expirada. Faça login novamente." },
        { status: 401 }
      );
    }

    if (!validateCPF(cpf)) {
      return NextResponse.json({ error: "CPF inválido" }, { status: 400 });
    }

    const cpfValidation = await verifyCPFWithAPI(cpf);
    if (!cpfValidation.isFemale) {
      return NextResponse.json(
        { error: "Este aplicativo é exclusivo para mulheres. Para apoio, ligue 180." },
        { status: 403 }
      );
    }

    const geoData = await getAddressByCEP(cep);

    if (!tempSession.userId) {
      return NextResponse.json({ error: "Sessão inválida" }, { status: 400 });
    }

    const cpfHash = hashData(cpf);
    const whatsappHash = hashData(whatsapp);
    const cepHash = hashData(cep);

    await db
      .update(users)
      .set({
        cpfHash,
        whatsappHash,
        cepHash,
        isFemale: cpfValidation.isFemale,
        lat: geoData.lat,
        lng: geoData.lng,
      })
      .where(eq(users.id, tempSession.userId));

    await db.delete(sessions).where(eq(sessions.id, tempSession.id));

    const sessionToken = generateToken();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await db.insert(sessions).values({
      userId: tempSession.userId,
      token: sessionToken,
      expiresAt,
    });

    const userId = tempSession.userId;
    const user = await db.query.users.findFirst({
      where: userId ? eq(users.id, userId) : undefined,
    });

    if (user) {
      sendWelcomeEmail(
        "user_" + user.id + "@placeholder.com",
        "Usuária"
      ).catch(console.error);
    }

    const response = NextResponse.json({
      message: "Cadastro completado com sucesso!",
      token: sessionToken,
    });

    response.cookies.set("auth_token", sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Complete registration error:", error);
    return NextResponse.json(
      { error: "Erro ao completar cadastro" },
      { status: 500 }
    );
  }
}
