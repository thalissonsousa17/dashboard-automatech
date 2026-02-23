// OpenAI Integration for ChatGPT Assistant
import { supabase } from "./supabase";

const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY;

// Preços por token (USD) — atualizar conforme tabela OpenAI
const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  "gpt-4o-mini": { input: 0.15 / 1_000_000, output: 0.60 / 1_000_000 },
  "gpt-4o":      { input: 2.50 / 1_000_000, output: 10.00 / 1_000_000 },
  "gpt-4-turbo": { input: 10.00 / 1_000_000, output: 30.00 / 1_000_000 },
};

/** Salva o uso de tokens no banco — fire-and-forget (não bloqueia o fluxo principal). */
async function saveTokenUsage(
  userId: string,
  model: string,
  usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number },
): Promise<void> {
  try {
    const pricing = MODEL_PRICING[model] ?? MODEL_PRICING["gpt-4o-mini"];
    const estimated_cost_usd =
      usage.prompt_tokens * pricing.input +
      usage.completion_tokens * pricing.output;

    await (supabase as any).from("ai_token_usage").insert({
      user_id: userId,
      model,
      prompt_tokens: usage.prompt_tokens,
      completion_tokens: usage.completion_tokens,
      total_tokens: usage.total_tokens,
      estimated_cost_usd,
    });
  } catch (err) {
    // Não propaga erro — log local apenas
    console.warn("Erro ao salvar token usage:", err);
  }
}

export class OpenAIService {
  private apiKey: string;

  constructor() {
    this.apiKey = OPENAI_API_KEY || "";
  }

  /**
   * Executa uma chamada ao endpoint de chat completions.
   * @param messages  Histórico de mensagens no formato OpenAI.
   * @param jsonMode  Se true, força resposta em JSON válido.
   * @param userId    Se fornecido, o uso de tokens é salvo no banco vinculado a este usuário.
   */
  async chatCompletion(
    messages: Array<{ role: string; content: string }>,
    jsonMode = false,
    userId?: string,
  ): Promise<string> {
    if (!this.apiKey) {
      return this.getMockResponse();
    }

    const model = "gpt-4o-mini";

    try {
      const body: Record<string, unknown> = {
        model,
        messages,
        max_tokens: 4096,
        temperature: 0.7,
      };

      if (jsonMode) {
        body.response_format = { type: "json_object" };
      }

      const response = await fetch(
        "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.apiKey}`,
          },
          body: JSON.stringify(body),
        },
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("OpenAI API error:", response.status, errorData);
        const detail =
          errorData?.error?.message || errorData?.error?.code || "";
        let userMsg = `Erro na API OpenAI (${response.status})`;
        if (response.status === 401)
          userMsg += ": Chave API inválida ou expirada";
        else if (response.status === 429)
          userMsg += ": Limite de requisições atingido. Aguarde e tente novamente";
        else if (response.status === 402 || response.status === 403)
          userMsg += ": Sem créditos ou acesso negado. Verifique seu plano OpenAI";
        else if (detail) userMsg += `: ${detail}`;
        throw new Error(userMsg);
      }

      const data = await response.json();

      // Salva uso de tokens de forma assíncrona (não bloqueia a resposta)
      if (userId && data.usage) {
        saveTokenUsage(userId, model, {
          prompt_tokens: data.usage.prompt_tokens ?? 0,
          completion_tokens: data.usage.completion_tokens ?? 0,
          total_tokens: data.usage.total_tokens ?? 0,
        });
      }

      return data.choices[0].message.content;
    } catch (error) {
      console.error("Erro OpenAI:", error);
      throw error;
    }
  }

  async evaluatePDF(pdfContent: string, theme: string) {
    const prompt = `
    Analise o seguinte texto de um trabalho acadêmico sobre "${theme}":

    ${pdfContent}

    Forneça uma avaliação estruturada em JSON com exatamente estas chaves:
    - "summary": resumo do trabalho (máximo 200 palavras)
    - "grammar_score": nota de 0 a 10 para gramática (número)
    - "coherence_score": nota de 0 a 10 para coerência com o tema (número)
    - "suggested_grade": nota sugerida de 0 a 10 (número)
    - "feedback": feedback detalhado para o aluno

    Responda APENAS com o objeto JSON, sem texto adicional.
    `;

    if (!this.apiKey) {
      return this.getMockEvaluation();
    }

    try {
      const response = await this.chatCompletion(
        [
          {
            role: "system",
            content:
              "Você é um professor experiente avaliando trabalhos acadêmicos. Responda sempre em JSON válido.",
          },
          { role: "user", content: prompt },
        ],
        true,
      );

      // Limpar possíveis fences de markdown
      const cleanResponse = response
        .replace(/^```json\s*/g, "")
        .replace(/\s*```$/g, "")
        .trim();
      return JSON.parse(cleanResponse);
    } catch (error) {
      console.error("Erro na avaliação IA:", error);
      return this.getMockEvaluation();
    }
  }

  private getMockResponse(): string {
    const responses = [
      "Como assistente da Automatech, posso ajudá-lo a revisar e melhorar seus textos. O que gostaria de analisar?",
      "Esse conteúdo está bem estruturado! Posso sugerir algumas melhorias na clareza e organização das ideias.",
      "Para aprofundar esse tema, recomendo adicionar exemplos práticos e dados mais específicos.",
      "A coerência do texto está boa. Que tal trabalharmos na fluidez entre os parágrafos?",
      "Posso ajudar a revisar a gramática e sugerir termos mais técnicos apropriados para o contexto.",
    ];

    return responses[Math.floor(Math.random() * responses.length)];
  }

  private getMockEvaluation() {
    return {
      summary:
        "Trabalho bem estruturado que aborda os principais conceitos do tema proposto. Demonstra compreensão adequada dos fundamentos teóricos.",
      grammar_score: Math.floor(Math.random() * 3) + 7,
      coherence_score: Math.floor(Math.random() * 3) + 7,
      suggested_grade: Math.floor(Math.random() * 3) + 7,
      feedback:
        "Bom trabalho! Recomendo aprofundar alguns conceitos e adicionar mais exemplos práticos para enriquecer a análise.",
    };
  }
}

export const openAIService = new OpenAIService();
