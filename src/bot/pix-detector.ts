export type PixKeyType = "cpf" | "cnpj" | "phone" | "email" | "evp";

export interface PixKeyResult {
  key: string;
  type: PixKeyType;
}

const PATTERNS: Array<{ type: PixKeyType; regex: RegExp; normalize?: (m: string) => string }> = [
  {
    type: "evp",
    regex: /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/i,
  },
  {
    type: "email",
    regex: /\b[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}\b/i,
  },
  {
    type: "phone",
    regex: /(\+55\s?)?(\(?\d{2}\)?\s?)(\d{4,5}[\s\-]?\d{4})\b/,
    normalize: (m) => {
      const digits = m.replace(/\D/g, "");
      return digits.startsWith("55") && digits.length > 11
        ? `+${digits}`
        : `+55${digits.slice(-11)}`;
    },
  },
  {
    type: "cnpj",
    regex: /\b\d{2}\.?\d{3}\.?\d{3}\/?0001-?\d{2}\b/,
    normalize: (m) => m.replace(/\D/g, ""),
  },
  {
    type: "cpf",
    regex: /\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/,
    normalize: (m) => m.replace(/\D/g, ""),
  },
];

const PIX_KEYWORDS = /\b(pix|chave|chavepix|chave\s+pix|minha\s+chave)\b/i;

export function detectPixKey(content: string): PixKeyResult | null {
  const hasKeyword = PIX_KEYWORDS.test(content);

  for (const { type, regex, normalize } of PATTERNS) {
    const match = content.match(regex);
    if (!match) continue;

    if (type === "cpf" || type === "cnpj" || type === "phone") {
      if (!hasKeyword) continue;
    }

    const raw = match[0];
    const key = normalize ? normalize(raw) : raw;

    return { key, type };
  }

  return null;
}

export const TYPE_LABEL: Record<PixKeyType, string> = {
  cpf: "CPF",
  cnpj: "CNPJ",
  phone: "Telefone",
  email: "E-mail",
  evp: "Chave Aleatória",
};
