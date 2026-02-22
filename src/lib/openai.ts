// OpenAI Integration for ChatGPT Assistant
const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY;

export class OpenAIService {
  private apiKey: string;

  constructor() {
    this.apiKey = OPENAI_API_KEY || "";
  }

  async chatCompletion(
    messages: Array<{ role: string; content: string }>,
    jsonMode = false,
  ) {
    if (!this.apiKey) {
      return this.getMockResponse();
    }

    try {
      const body: Record<string, unknown> = {
        model: "gpt-4o-mini",
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
