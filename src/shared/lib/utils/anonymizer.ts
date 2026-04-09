import { createHash } from "crypto";

export class Anonymizer {
  private static readonly PHONE_REGEX = /(\+55\s?)?(\(?\d{2}\)?[\s-]?)?(\d{4,5}[\s-]?\d{4})/g;
  private static readonly CPF_REGEX = /\d{3}\.?\d{3}\.?\d{3}-?\d{2}/g;

  static hashPhone(phone: string): string {
    const normalized = phone.replace(/\D/g, "");
    return this.sha256(normalized);
  }

  static hashName(name: string): string {
    return this.sha256(name.toLowerCase().trim());
  }

  static hashCPF(cpf: string): string {
    const normalized = cpf.replace(/\D/g, "");
    return this.sha256(normalized);
  }

  static sha256(input: string): string {
    return createHash("sha256").update(input).digest("hex");
  }

  static extractPhones(text: string): string[] {
    const matches = text.match(this.PHONE_REGEX) || [];
    return matches.map((p) => p.replace(/\D/g, "")).filter((p) => p.length >= 10);
  }

  static extractCPF(text: string): string | null {
    const matches = text.match(this.CPF_REGEX);
    if (!matches) return null;
    const cpf = matches[0].replace(/\D/g, "");
    if (this.validateCPF(cpf)) {
      return cpf;
    }
    return null;
  }

  static validateCPF(cpf: string): boolean {
    if (cpf.length !== 11) return false;
    if (/^(\d)\1{10}$/.test(cpf)) return false;

    let sum = 0;
    for (let i = 0; i < 9; i++) {
      sum += parseInt(cpf[i]) * (10 - i);
    }
    let remainder = (sum * 10) % 11;
    if (remainder !== parseInt(cpf[9])) return false;

    sum = 0;
    for (let i = 0; i < 10; i++) {
      sum += parseInt(cpf[i]) * (11 - i);
    }
    remainder = (sum * 10) % 11;
    return remainder === parseInt(cpf[10]);
  }

  static removePII(text: string): string {
    let result = text;
    result = result.replace(this.PHONE_REGEX, "[TELEFONE]");
    result = result.replace(this.CPF_REGEX, "[CPF]");
    result = result.replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, "[EMAIL]");
    return result;
  }

  static anonymizeConversation(text: string): {
    anonymizedText: string;
    extractedPhones: string[];
    extractedCPF: string | null;
    phoneHashes: string[];
    cpfHash: string | null;
  } {
    const extractedPhones = this.extractPhones(text);
    const extractedCPF = this.extractCPF(text);

    const phoneHashes = extractedPhones.map((p) => this.hashPhone(p));
    const cpfHash = extractedCPF ? this.hashCPF(extractedCPF) : null;

    const anonymizedText = this.removePII(text);

    return {
      anonymizedText,
      extractedPhones,
      extractedCPF,
      phoneHashes,
      cpfHash,
    };
  }

  static generateContentHash(content: string): string {
    return this.sha256(content.substring(0, 1000));
  }
}
