export interface Processo {
  numero: string;
  tribunal: string;
  tipo: "Criminal" | "Cível" | "Trabalhista" | "Eleitoral" | "Federal" | "Outro";
  classe: string;
  assunto: string;
  dataInicio: string;
  situacao: string;
  ultimaMovimentacao: string;
  valor?: number;
}

export interface AntecedentesResult {
  processosCiveis: Processo[];
  processosCriminais: Processo[];
  total: number;
  found: boolean;
  searchedAt: string;
}

export interface AntecedentesError {
  error: string;
  code: "NOT_FOUND" | "API_ERROR" | "RATE_LIMITED" | "INVALID_NAME";
}

const DATAJUD_API_KEY = process.env.DATAJUD_API_KEY || "cDZHYzlZa0JadVREZDJCendQbXY6SkJlTzNjLV9TRENyQk1RdnFKZGRQdw==";

const TRIBUNAIS = [
  { codigo: "TJSP", nome: "Tribunal de Justiça de São Paulo" },
  { codigo: "TJRJ", nome: "Tribunal de Justiça do Rio de Janeiro" },
  { codigo: "TJMG", nome: "Tribunal de Justiça de Minas Gerais" },
  { codigo: "TJBA", nome: "Tribunal de Justiça da Bahia" },
  { codigo: "TJCE", nome: "Tribunal de Justiça do Ceará" },
  { codigo: "TJPE", nome: "Tribunal de Justiça de Pernambuco" },
  { codigo: "TJPR", nome: "Tribunal de Justiça do Paraná" },
  { codigo: "TJRS", nome: "Tribunal de Justiça do Rio Grande do Sul" },
  { codigo: "TJSC", nome: "Tribunal de Justiça de Santa Catarina" },
  { codigo: "TJGO", nome: "Tribunal de Justiça de Goiás" },
  { codigo: "TJDFT", nome: "Tribunal de Justiça do Distrito Federal" },
  { codigo: "TJPA", nome: "Tribunal de Justiça do Pará" },
  { codigo: "TJMA", nome: "Tribunal de Justiça do Maranhão" },
  { codigo: "TJAL", nome: "Tribunal de Justiça de Alagoas" },
  { codigo: "TJRN", nome: "Tribunal de Justiça do Rio Grande do Norte" },
  { codigo: "TJPB", nome: "Tribunal de Justiça da Paraíba" },
  { codigo: "TJES", nome: "Tribunal de Justiça do Espírito Santo" },
  { codigo: "TJPI", nome: "Tribunal de Justiça do Piauí" },
  { codigo: "TJMS", nome: "Tribunal de Justiça do Mato Grosso do Sul" },
  { codigo: "TJMT", nome: "Tribunal de Justiça do Mato Grosso" },
  { codigo: "TJSE", nome: "Tribunal de Justiça de Sergipe" },
  { codigo: "TJRO", nome: "Tribunal de Justiça de Rondônia" },
  { codigo: "TJAC", nome: "Tribunal de Justiça do Acre" },
  { codigo: "TJAM", nome: "Tribunal de Justiça do Amazonas" },
  { codigo: "TJAP", nome: "Tribunal de Justiça do Amapá" },
  { codigo: "TJRR", nome: "Tribunal de Justiça de Roraima" },
  { codigo: "TJTO", nome: "Tribunal de Justiça do Tocantins" },
  { codigo: "TRF1", nome: "Tribunal Regional Federal da 1ª Região" },
  { codigo: "TRF2", nome: "Tribunal Regional Federal da 2ª Região" },
  { codigo: "TRF3", nome: "Tribunal Regional Federal da 3ª Região" },
  { codigo: "TRF4", nome: "Tribunal Regional Federal da 4ª Região" },
  { codigo: "TRF5", nome: "Tribunal Regional Federal da 5ª Região" },
];

function getTipoProcesso(classe: string, assunto: string): Processo["tipo"] {
  const lowerClasse = classe.toLowerCase();
  const lowerAssunto = lowerClasse + " " + assunto.toLowerCase();
  
  if (lowerClasse.includes("criminal") || lowerClasse.includes("penal") || 
      lowerClasse.includes("ação penal") || lowerClasse.includes("crime") ||
      lowerAssunto.includes("crime") || lowerAssunto.includes("homicídio") ||
      lowerAssunto.includes("lesão") || lowerAssunto.includes("ameaça") ||
      lowerAssunto.includes("violência") || lowerAssunto.includes("furto") ||
      lowerAssunto.includes("roubo") || lowerAssunto.includes("estupro") ||
      lowerAssunto.includes("tráfico")) {
    return "Criminal";
  }
  
  if (lowerClasse.includes("trabalhista") || lowerClasse.includes("clt")) {
    return "Trabalhista";
  }
  
  if (lowerClasse.includes("eleitoral")) {
    return "Eleitoral";
  }
  
  if (lowerClasse.includes("federal")) {
    return "Federal";
  }
  
  if (lowerClasse.includes("cível") || lowerClasse.includes("ação") ||
      lowerClasse.includes("civil") || lowerClasse.includes("indenização")) {
    return "Cível";
  }
  
  return "Outro";
}

function parseData(dataStr: string): string {
  if (!dataStr) return "";
  try {
    const date = new Date(dataStr);
    return date.toLocaleDateString("pt-BR");
  } catch {
    return dataStr;
  }
}

async function searchTribunal(codigo: string, nome: string): Promise<Processo[]> {
  try {
    const response = await fetch(
      `https://api.cnj.jus.br/api/v2/processos/tribunal/${codigo}`,
      {
        headers: {
          "Authorization": `APIKey ${DATAJUD_API_KEY}`,
          "Content-Type": "application/json",
        },
        signal: AbortSignal.timeout(15000),
      }
    );

    if (response.status === 429) {
      throw new Error("RATE_LIMITED");
    }

    if (!response.ok && response.status !== 404) {
      return [];
    }

    const data = await response.json();
    const processos: Processo[] = [];

    const items = data.items || data.dados || [];
    
    for (const item of items.slice(0, 10)) {
      processos.push({
        numero: item.numero || item.codigo || "",
        tribunal: nome,
        tipo: getTipoProcesso(item.classe || "", item.assunto || ""),
        classe: item.classe || "",
        assunto: item.assunto || "",
        dataInicio: parseData(item.dataInicio || item.dataAjuizamento),
        situacao: item.situacao || "Em tramitação",
        ultimaMovimentacao: parseData(item.ultimaMovimentacao?.data),
        valor: item.valorCausa,
      });
    }

    return processos;
  } catch (error) {
    if (error instanceof Error && error.message === "RATE_LIMITED") {
      throw error;
    }
    return [];
  }
}

export async function consultaAntecedentes(nome: string, cpf?: string): Promise<AntecedentesResult | AntecedentesError> {
  if (!nome || nome.trim().length < 3) {
    return { error: "Nome deve ter pelo menos 3 caracteres", code: "INVALID_NAME" };
  }

  const allProcessos: Processo[] = [];
  const errors: string[] = [];

  for (const tribunal of TRIBUNAIS) {
    try {
      const processos = await searchTribunal(tribunal.codigo, tribunal.nome);
      allProcessos.push(...processos);
      
      if (allProcessos.length >= 50) break;
      
      await new Promise(resolve => setTimeout(resolve, 200));
    } catch (error) {
      if (error instanceof Error && error.message === "RATE_LIMITED") {
        return { error: "Limite de consultas excedido. Tente novamente mais tarde.", code: "RATE_LIMITED" };
      }
      errors.push(tribunal.codigo);
    }
  }

  const processosCriminais = allProcessos.filter(p => p.tipo === "Criminal");
  const processosCiveis = allProcessos.filter(p => p.tipo !== "Criminal");

  return {
    processosCriminais,
    processosCiveis,
    total: allProcessos.length,
    found: allProcessos.length > 0,
    searchedAt: new Date().toISOString(),
  };
}
