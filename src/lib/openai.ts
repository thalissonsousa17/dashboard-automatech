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
Você é um professor avaliando um trabalho acadêmico. O tema EXATO exigido foi: "${theme}".

TEXTO DO TRABALHO:
${pdfContent}

REGRAS DE AVALIAÇÃO — SIGA À RISCA:

ATENÇÃO: Não basta o trabalho ser da mesma área geral. Ele deve abordar ESPECIFICAMENTE o tema "${theme}".
Exemplo: se o tema é "Mecanismos de Lesão Celular e Inflamação", um trabalho sobre "História Natural das Doenças" ou "Processo Saúde-Doença" NÃO atende ao tema — mesmo que ambos sejam da área de saúde.

1. Leia o trabalho e identifique com precisão QUAL ASSUNTO ele trata.
2. Compare esse assunto com o tema exato: "${theme}".
3. Classifique a aderência:
   - TOTALMENTE FORA DO TEMA (o trabalho trata de outro assunto, mesmo que da mesma área): coherence_score 0–2, suggested_grade 0–3
   - PARCIALMENTE RELACIONADO (aborda aspectos periféricos ou tangenciais do tema): coherence_score 3–5, suggested_grade 3–6
   - DIRETAMENTE RELACIONADO (o trabalho aborda o tema com clareza, mesmo que superficialmente): coherence_score 6–8, suggested_grade 6–8
   - PLENAMENTE ADEQUADO (trabalho aprofundado e focado no tema): coherence_score 9–10, suggested_grade 8–10
4. Avalie gramática independentemente do tema.

Forneça a avaliação em JSON com exatamente estas chaves:
- "summary": descreva o que o trabalho REALMENTE aborda — não o que o tema pede (máximo 150 palavras)
- "grammar_score": nota de 0 a 10 para gramática e escrita (número)
- "coherence_score": nota de 0 a 10 para aderência ao tema EXATO "${theme}" conforme as regras acima (número)
- "suggested_grade": nota final de 0 a 10, fortemente penalizada se o trabalho não tratar do tema exato (número)
- "feedback": explique ao aluno o que o trabalho abordou, se corresponde ou não ao tema solicitado e o motivo da nota

Responda APENAS com o objeto JSON, sem texto adicional.
    `;

    if (!this.apiKey) {
      throw new Error(
        "Avaliação por IA indisponível no momento. Configure a chave da API para utilizar este recurso.",
      );
    }

    try {
      const response = await this.chatCompletion(
        [
          {
            role: "system",
            content:
              "Você é um professor experiente e criterioso avaliando trabalhos acadêmicos. Avalie com rigor se o trabalho trata ESPECIFICAMENTE do tema solicitado — não se contente com o mesmo campo de conhecimento. Dois temas da mesma área (ex: saúde) mas com foco diferente devem ser tratados como não aderentes. Seja direto e honesto no feedback. Responda sempre em JSON válido.",
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
      throw error;
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

  // getMockEvaluation removido — avaliação simulada mascarava erros reais e gerava notas falsas.
}

export const openAIService = new OpenAIService();
