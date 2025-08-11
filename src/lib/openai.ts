// OpenAI Integration for ChatGPT Assistant
const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY;

export class OpenAIService {
  private apiKey: string;
  
  constructor() {
    this.apiKey = OPENAI_API_KEY || '';
  }

  async chatCompletion(messages: Array<{role: string, content: string}>) {
    if (!this.apiKey) {
      // Modo demo - respostas simuladas
      return this.getMockResponse(messages[messages.length - 1].content);
    }

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: messages,
          max_tokens: 1000,
          temperature: 0.7
        })
      });

      if (!response.ok) {
        throw new Error('Erro na API do OpenAI');
      }

      const data = await response.json();
      return data.choices[0].message.content;
    } catch (error) {
      console.error('Erro OpenAI:', error);
      return this.getMockResponse(messages[messages.length - 1].content);
    }
  }

  async evaluatePDF(pdfContent: string, theme: string) {
    const prompt = `
    Analise o seguinte texto de um trabalho acadêmico sobre "${theme}":

    ${pdfContent}

    Forneça uma avaliação estruturada em JSON com:
    - summary: resumo do trabalho (máximo 200 palavras)
    - grammar_score: nota de 0-10 para gramática
    - coherence_score: nota de 0-10 para coerência com o tema
    - suggested_grade: nota sugerida de 0-10
    - feedback: feedback detalhado para o aluno
    `;

    if (!this.apiKey) {
      return this.getMockEvaluation();
    }

    try {
      const response = await this.chatCompletion([
        { role: 'system', content: 'Você é um professor experiente avaliando trabalhos acadêmicos.' },
        { role: 'user', content: prompt }
      ]);

      // Remove markdown code block fences if present
      const cleanResponse = response.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      return JSON.parse(cleanResponse);
    } catch (error) {
      console.error('Erro na avaliação:', error);
      return this.getMockEvaluation();
    }
  }

  private getMockResponse(userMessage: string): string {
    const responses = [
      "Como assistente da Automatech, posso ajudá-lo a revisar e melhorar seus textos. O que gostaria de analisar?",
      "Esse conteúdo está bem estruturado! Posso sugerir algumas melhorias na clareza e organização das ideias.",
      "Para aprofundar esse tema, recomendo adicionar exemplos práticos e dados mais específicos.",
      "A coerência do texto está boa. Que tal trabalharmos na fluidez entre os parágrafos?",
      "Posso ajudar a revisar a gramática e sugerir termos mais técnicos apropriados para o contexto."
    ];
    
    return responses[Math.floor(Math.random() * responses.length)];
  }

  private getMockEvaluation() {
    return {
      summary: "Trabalho bem estruturado que aborda os principais conceitos do tema proposto. Demonstra compreensão adequada dos fundamentos teóricos.",
      grammar_score: Math.floor(Math.random() * 3) + 7, // 7-10
      coherence_score: Math.floor(Math.random() * 3) + 7, // 7-10
      suggested_grade: Math.floor(Math.random() * 3) + 7, // 7-10
      feedback: "Bom trabalho! Recomendo aprofundar alguns conceitos e adicionar mais exemplos práticos para enriquecer a análise."
    };
  }
}

export const openAIService = new OpenAIService();