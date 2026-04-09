import { NextRequest, NextResponse } from "next/server";
import { db, users } from "@/shared/lib/db";
import { hashData } from "@/shared/lib/utils/hash";
import { eq } from "drizzle-orm";

const AUTH0_DOMAIN = process.env.AUTH0_DOMAIN || "guardial-app.us.auth0.com";
const AUTH0_CLIENT_ID = process.env.AUTH0_CLIENT_ID;
const AUTH0_CLIENT_SECRET = process.env.AUTH0_CLIENT_SECRET;
const APICPF_API_KEY = process.env.APICPF_API_KEY;

function validateCPF(cpf: string): boolean {
  const cleaned = cpf.replace(/\D/g, "");
  if (cleaned.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cleaned)) return false;

  let sum = 0;
  let remainder;

  for (let i = 1; i <= 9; i++) {
    sum += parseInt(cleaned.substring(i - 1, i)) * (11 - i);
  }

  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cleaned.substring(9, 10))) return false;

  sum = 0;
  for (let i = 1; i <= 10; i++) {
    sum += parseInt(cleaned.substring(i - 1, i)) * (12 - i);
  }

  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cleaned.substring(10, 11))) return false;

  return true;
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
    const { 
      email, 
      password, 
      name, 
      cpf, 
      whatsapp, 
      cep,
      provider = "email",
      auth0Id 
    } = body;

    if (provider === "google" && auth0Id) {
      const emailHash = hashData(email);
      const existingUser = await db.query.users.findFirst({
        where: eq(users.emailHash, emailHash),
      });

      if (existingUser) {
        return NextResponse.json({
          message: "Login realizado com sucesso!",
        });
      }

      const userHash = hashData(`${email}:${Date.now()}`);
      const nameHash = name ? hashData(name) : null;
      const whatsappHash = whatsapp ? hashData(whatsapp) : null;
      const cepHash = cep ? hashData(cep) : null;

      let geoData = {};
      if (cep) {
        geoData = await getAddressByCEP(cep);
      }

      await db.insert(users).values({
        userHash,
        emailHash,
        nameHash,
        whatsappHash,
        cepHash,
        ...geoData,
        auth0Sub: auth0Id,
        auth0Provider: "google",
        role: "user",
        emailVerified: true,
      });

      return NextResponse.json({
        message: "Conta criada com sucesso!",
      });
    }

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email e senha são obrigatórios" },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Senha deve ter pelo menos 8 caracteres" },
        { status: 400 }
      );
    }

    if (cpf && !validateCPF(cpf)) {
      return NextResponse.json(
        { error: "CPF inválido" },
        { status: 400 }
      );
    }

    const emailHash = hashData(email);
    const existingUser = await db.query.users.findFirst({
      where: eq(users.emailHash, emailHash),
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "Email já cadastrado" },
        { status: 400 }
      );
    }

    let isFemale = true;
    if (cpf) {
      const cpfValidation = await verifyCPFWithAPI(cpf);
      if (!cpfValidation.isFemale) {
        return NextResponse.json(
          { error: "Este aplicativo é exclusivo para mulheres. Para apoio, ligue 180." },
          { status: 403 }
        );
      }
      isFemale = cpfValidation.isFemale;
    }

    const signupResponse = await fetch(`https://${AUTH0_DOMAIN}/dbconnections/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: AUTH0_CLIENT_ID,
        email,
        password,
        connection: "Username-Password-Authentication",
        user_metadata: {
          name: name || "",
          whatsapp: whatsapp || "",
        },
      }),
    });

    const signupData = await signupResponse.json();

    if (!signupResponse.ok) {
      return NextResponse.json(
        { error: signupData.description || "Erro ao criar conta" },
        { status: 400 }
      );
    }

    const userHash = hashData(`${email}:${Date.now()}`);
    const nameHash = name ? hashData(name) : null;
    const cpfHash = cpf ? hashData(cpf) : null;
    const whatsappHash = whatsapp ? hashData(whatsapp) : null;
    const cepHash = cep ? hashData(cep) : null;

    let geoData: { lat?: number; lng?: number } = {};
    if (cep) {
      geoData = await getAddressByCEP(cep);
    }

    await db.insert(users).values({
      userHash,
      emailHash,
      nameHash,
      cpfHash,
      whatsappHash,
      cepHash,
      isFemale,
      ...geoData,
      auth0Sub: signupData._id || signupData.user_id,
      auth0Provider: "email",
      role: "user",
      emailVerified: false,
    });

    return NextResponse.json({
      message: "Conta criada com sucesso! Verifique seu email para confirmar.",
    });
  } catch (error) {
    console.error("Auth0 SignUp Error:", error);
    return NextResponse.json(
      { error: "Erro ao criar conta" },
      { status: 500 }
    );
  }
}
