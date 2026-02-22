import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { openAIService } from "../lib/openai";
import { useAuth } from "./useAuth";
import type {
  Exam,
  ExamQuestion,
  ExamVersion,
  ExamAnswerKey,
  ExamAlternative,
  CreateExamInput,
  Difficulty,
} from "../types";

// Bypass de tipagem até regenerar os tipos do Supabase com:
// npx supabase gen types typescript --project-id SEU_PROJECT_ID > src/types/database.types.ts
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

/**
 * Remove sequências Unicode inválidas e caracteres problemáticos para o PostgreSQL.
 * Corrige o erro 22P05: unsupported Unicode escape sequence.
 */
function sanitizeForPostgres(text: string): string {
  return (
    text
      // Remove null bytes
      .replace(/\0/g, "")
      // Remove sequências de escape Unicode inválidas (\uXXXX com valores problemáticos)
      .replace(/\\u[0-9a-fA-F]{0,3}(?![0-9a-fA-F])/g, "")
      // Remove surrogate pairs isolados (U+D800 a U+DFFF) que o PostgreSQL rejeita
      .replace(/[\uD800-\uDFFF]/g, "")
      // Remove caracteres de controle (exceto tab, newline, carriage return)
      // eslint-disable-next-line no-control-regex
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
      .trim()
  );
}

export const useExams = () => {
  const { user, loading: authLoading } = useAuth();
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const fetchExams = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      const { data, error } = await db
        .from("exams")
        .select("*")
        .eq("created_by", user.id)
        .is("workspace_id", null)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setExams((data as Exam[]) || []);
    } catch (err) {
      console.error("Erro ao carregar provas:", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (authLoading) return;
    fetchExams();
  }, [authLoading, fetchExams]);

  const fetchExamWithQuestions = async (
    examId: string,
  ): Promise<Exam | null> => {
    try {
      const { data: exam, error: examError } = await db
        .from("exams")
        .select("*")
        .eq("id", examId)
        .single();

      if (examError) throw examError;

      const { data: questions, error: qError } = await db
        .from("exam_questions")
        .select("*")
        .eq("exam_id", examId)
        .order("question_number", { ascending: true });

      if (qError) throw qError;

      return {
        ...(exam as Exam),
        questions: (questions as ExamQuestion[]) || [],
      };
    } catch (err) {
      console.error("Erro ao carregar prova:", err);
      return null;
    }
  };

  const createExam = async (input: CreateExamInput): Promise<Exam | null> => {
    if (!user) throw new Error("Usuário não autenticado");

    try {
      const { data, error } = await db
        .from("exams")
        .insert({
          title: sanitizeForPostgres(input.title),
          subject: sanitizeForPostgres(input.subject),
          question_count: input.question_count,
          question_type: input.question_type,
          difficulty: input.difficulty,
          reference_material: input.reference_material
            ? sanitizeForPostgres(input.reference_material)
            : null,
          mixed_mc_count:
            input.question_type === "mixed"
              ? input.mixed_mc_count || null
              : null,
          mixed_essay_count:
            input.question_type === "mixed"
              ? input.mixed_essay_count || null
              : null,
          created_by: user.id,
          status: "draft",
        })
        .select()
        .single();

      if (error) {
        console.error("Supabase error code:", error.code);
        console.error("Supabase error message:", error.message);
        console.error("Supabase error details:", error.details);
        console.error("Supabase error hint:", error.hint);
        throw new Error(
          `Erro ao salvar prova [${error.code}]: ${error.message}${error.hint ? ` — Dica: ${error.hint}` : ""}`,
        );
      }

      const newExam = data as Exam;
      setExams((prev) => [newExam, ...prev]);
      return newExam;
    } catch (err) {
      console.error("Erro ao criar prova:", err);
      throw err;
    }
  };

  const generateQuestions = async (exam: Exam, options?: Partial<CreateExamInput>): Promise<ExamQuestion[]> => {
    setGenerating(true);
    try {
      const difficultyMap: Record<string, string> = {
        easy: "Fácil",
        medium: "Médio",
        hard: "Difícil",
      };

      const buildDifficultyDesc = (
        levels: Difficulty[] | undefined,
        fallback: Difficulty,
        count: number,
      ): string => {
        const eff = levels && levels.length > 0 ? levels : [fallback];
        if (eff.length === 1) return difficultyMap[eff[0]] || eff[0];
        const per = Math.floor(count / eff.length);
        const rem = count % eff.length;
        return (
          "Distribuição: " +
          eff
            .map((l, i) => `${per + (i < rem ? 1 : 0)} ${difficultyMap[l] || l}`)
            .join(" + ")
        );
      };

      const buildStyleDesc = (style?: string): string => {
        if (style === "contextualizada") {
          return "Contextualizada — inclua situações-problema, contexto real ou cotidiano antes do enunciado. Evite questões puramente memorísticas.";
        }
        return "Simples — questões diretas e objetivas, sem texto introdutório elaborado.";
      };

      let typeDescription: string;
      let difficultySection: string;
      let styleSection: string;

      if (exam.question_type === "multiple_choice") {
        typeDescription = "múltipla escolha (5 alternativas: A, B, C, D, E)";
        difficultySection = buildDifficultyDesc(
          options?.difficulty_levels,
          exam.difficulty,
          exam.question_count,
        );
        styleSection = buildStyleDesc(options?.question_style);
      } else if (exam.question_type === "essay") {
        typeDescription = "dissertativa";
        difficultySection = buildDifficultyDesc(
          options?.difficulty_levels,
          exam.difficulty,
          exam.question_count,
        );
        styleSection = buildStyleDesc(options?.question_style);
      } else {
        const mcCount =
          exam.mixed_mc_count || Math.ceil(exam.question_count / 2);
        const essayCount =
          exam.mixed_essay_count || Math.floor(exam.question_count / 2);
        typeDescription = `mista: exatamente ${mcCount} questões de múltipla escolha (5 alternativas A, B, C, D, E) e ${essayCount} questões dissertativas`;
        const mcDiff = buildDifficultyDesc(
          options?.mc_difficulty_levels,
          exam.difficulty,
          mcCount,
        );
        const essayDiff = buildDifficultyDesc(
          options?.essay_difficulty_levels,
          exam.difficulty,
          essayCount,
        );
        difficultySection = `Múltipla Escolha: ${mcDiff} | Dissertativas: ${essayDiff}`;
        styleSection = `Múltipla Escolha: ${buildStyleDesc(options?.mc_style)}\nDissertativas: ${buildStyleDesc(options?.essay_style)}`;
      }

      const prompt = `
Gere ${exam.question_count} questões para uma prova sobre "${exam.subject}".
Título da prova: "${exam.title}"
Tipo de questões: ${typeDescription}
Dificuldade: ${difficultySection}
Estilo: ${styleSection}
${exam.reference_material ? `\nMaterial de referência:\n${exam.reference_material}` : ""}

REGRAS OBRIGATÓRIAS:
1. Questões de múltipla escolha: SEMPRE exatamente 5 alternativas (A, B, C, D, E). Uma única resposta correta.
2. Questões dissertativas: alternatives = [], correct_answer = null.
3. O campo "question_type" deve ser EXATAMENTE "multiple_choice" ou "essay".
${exam.question_type === "mixed" ? `4. Gere EXATAMENTE ${exam.mixed_mc_count} questões de múltipla escolha SEGUIDAS de ${exam.mixed_essay_count} dissertativas, nessa ordem.` : ""}

Responda em JSON com a seguinte estrutura:
{
  "questions": [
    {
      "question_number": 1,
      "question_type": "multiple_choice",
      "statement": "Enunciado da questão",
      "alternatives": [
        {"letter": "A", "text": "Alternativa A"},
        {"letter": "B", "text": "Alternativa B"},
        {"letter": "C", "text": "Alternativa C"},
        {"letter": "D", "text": "Alternativa D"},
        {"letter": "E", "text": "Alternativa E"}
      ],
      "correct_answer": "A",
      "explanation": "Explicação da resposta correta"
    },
    {
      "question_number": 2,
      "question_type": "essay",
      "statement": "Enunciado da questão dissertativa",
      "alternatives": [],
      "correct_answer": null,
      "explanation": "Critérios de avaliação"
    }
  ]
}

Para questões de múltipla escolha: question_type = "multiple_choice", alternatives com 5 opções (A,B,C,D,E), correct_answer com a letra correta.
Para questões dissertativas: question_type = "essay", alternatives = [], correct_answer = null.
Gere questões variadas, cobrindo diferentes aspectos do tema.
`;

      const response = await openAIService.chatCompletion(
        [
          {
            role: "system",
            content:
              "Você é um professor experiente criando provas acadêmicas. Responda sempre em JSON válido.",
          },
          { role: "user", content: prompt },
        ],
        true,
      );

      const cleanResponse = response
        .replace(/^```json\s*/g, "")
        .replace(/\s*```$/g, "")
        .trim();

      let parsed;
      try {
        parsed = JSON.parse(cleanResponse);
      } catch {
        console.error("JSON inválido da IA:", cleanResponse.substring(0, 500));
        throw new Error(
          "A IA retornou uma resposta inválida (JSON malformado). Tente gerar novamente.",
        );
      }

      if (!parsed.questions || !Array.isArray(parsed.questions)) {
        throw new Error(
          "A IA não retornou questões no formato esperado. Tente gerar novamente.",
        );
      }

      const questions: ExamQuestion[] = parsed.questions.map(
        (q: Record<string, unknown>, index: number) => {
          const hasAlternatives =
            Array.isArray(q.alternatives) &&
            (q.alternatives as unknown[]).length > 0;
          const rawType = String(q.question_type || "").toLowerCase();
          let questionType: string =
            rawType === "multiple_choice" || rawType === "essay"
              ? rawType
              : hasAlternatives
                ? "multiple_choice"
                : "essay";

          // Enforce o tipo solicitado pelo professor
          // Para provas não-mistas, a IA não pode desviar do tipo pedido
          if (exam.question_type === "multiple_choice") {
            questionType = "multiple_choice";
          } else if (exam.question_type === "essay") {
            questionType = "essay";
          }
          // Para "mixed", mantém o que a IA decidiu

          const finalAlternatives =
            questionType === "multiple_choice" && hasAlternatives
              ? (q.alternatives as ExamAlternative[]).map((alt) => ({
                  ...alt,
                  text: sanitizeForPostgres(String(alt.text || "")),
                }))
              : [];

          const finalCorrectAnswer =
            questionType === "multiple_choice"
              ? (q.correct_answer as string) || null
              : null;

          return {
            id: crypto.randomUUID(),
            exam_id: exam.id,
            question_number: index + 1,
            question_type: questionType,
            statement: sanitizeForPostgres(q.statement as string),
            alternatives: finalAlternatives,
            correct_answer: finalCorrectAnswer,
            explanation: q.explanation
              ? sanitizeForPostgres(q.explanation as string)
              : null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
        },
      );

      const questionsToInsert = questions.map((q) => ({
        exam_id: q.exam_id,
        question_number: q.question_number,
        question_type: q.question_type,
        statement: q.statement,
        alternatives: q.alternatives,
        correct_answer: q.correct_answer,
        explanation: q.explanation,
      }));

      const { data: savedQuestions, error } = await db
        .from("exam_questions")
        .insert(questionsToInsert)
        .select();

      if (error) {
        throw new Error(`Erro ao salvar questões no banco: ${error.message}`);
      }

      const { error: updateError } = await db
        .from("exams")
        .update({ status: "generated" })
        .eq("id", exam.id);

      if (updateError) {
        console.error("Erro ao atualizar status:", updateError);
      }

      setExams((prev) =>
        prev.map((e) =>
          e.id === exam.id ? { ...e, status: "generated" as const } : e,
        ),
      );

      return (savedQuestions as ExamQuestion[]) || questions;
    } catch (err) {
      console.error("Erro ao gerar questões:", err);
      if (err instanceof Error) throw err;
      const msg =
        typeof err === "object" && err !== null && "message" in err
          ? (err as { message: string }).message
          : String(err);
      throw new Error(msg);
    } finally {
      setGenerating(false);
    }
  };

  const regenerateQuestion = async (
    exam: Exam,
    questionId: string,
    currentQuestion: ExamQuestion,
  ): Promise<ExamQuestion> => {
    const difficultyMap = {
      easy: "Fácil",
      medium: "Médio",
      hard: "Difícil",
    };

    const prompt = `
Gere UMA nova questão de ${currentQuestion.question_type === "multiple_choice" ? "múltipla escolha (5 alternativas A, B, C, D, E)" : "dissertativa"} sobre "${exam.subject}".
Nível: ${difficultyMap[exam.difficulty]}
A questão anterior era: "${currentQuestion.statement}"
Gere uma questão DIFERENTE cobrindo outro aspecto do tema.

Responda em JSON:
{
  "question_type": "${currentQuestion.question_type}",
  "statement": "Novo enunciado",
  "alternatives": ${currentQuestion.question_type === "multiple_choice" ? '[{"letter":"A","text":"..."},{"letter":"B","text":"..."},{"letter":"C","text":"..."},{"letter":"D","text":"..."},{"letter":"E","text":"..."}]' : "[]"},
  "correct_answer": ${currentQuestion.question_type === "multiple_choice" ? '"A"' : "null"},
  "explanation": "Explicação"
}
`;

    const response = await openAIService.chatCompletion(
      [
        {
          role: "system",
          content:
            "Você é um professor criando questões de prova. Responda em JSON válido.",
        },
        { role: "user", content: prompt },
      ],
      true,
    );

    const cleanResponse = response
      .replace(/^```json\s*/g, "")
      .replace(/\s*```$/g, "")
      .trim();
    const parsed = JSON.parse(cleanResponse);

    const { error } = await db
      .from("exam_questions")
      .update({
        statement: sanitizeForPostgres(parsed.statement),
        alternatives: parsed.alternatives
          ? parsed.alternatives.map((alt: ExamAlternative) => ({
              ...alt,
              text: sanitizeForPostgres(alt.text),
            }))
          : [],
        correct_answer: parsed.correct_answer || null,
        explanation: parsed.explanation
          ? sanitizeForPostgres(parsed.explanation)
          : null,
      })
      .eq("id", questionId);

    if (error) throw error;

    return {
      ...currentQuestion,
      statement: sanitizeForPostgres(parsed.statement),
      alternatives: parsed.alternatives || [],
      correct_answer: parsed.correct_answer || null,
      explanation: parsed.explanation
        ? sanitizeForPostgres(parsed.explanation)
        : null,
    };
  };

  const updateQuestion = async (
    questionId: string,
    updates: Partial<ExamQuestion>,
  ) => {
    const { error } = await db
      .from("exam_questions")
      .update({
        statement: updates.statement
          ? sanitizeForPostgres(updates.statement)
          : undefined,
        alternatives: updates.alternatives,
        correct_answer: updates.correct_answer,
        explanation: updates.explanation
          ? sanitizeForPostgres(updates.explanation)
          : undefined,
      })
      .eq("id", questionId);

    if (error) throw error;
  };

  const deleteQuestion = async (questionId: string) => {
    const { error } = await db
      .from("exam_questions")
      .delete()
      .eq("id", questionId);

    if (error) throw error;
  };

  const shuffleArray = <T,>(array: T[]): T[] => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  const generateVersions = async (
    exam: Exam,
    questions: ExamQuestion[],
    versionCount: number,
  ): Promise<{ versions: ExamVersion[]; answerKeys: ExamAnswerKey[] }> => {
    const labels = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"];
    const versions: ExamVersion[] = [];
    const answerKeys: ExamAnswerKey[] = [];

    await db.from("exam_answer_keys").delete().eq("exam_id", exam.id);
    await db.from("exam_versions").delete().eq("exam_id", exam.id);

    for (let v = 0; v < Math.min(versionCount, 10); v++) {
      // Item 5: MC questions first (shuffled), dissertativas always at end (shuffled among themselves)
      const mcIdx = questions
        .map((q, i) => ({ q, i }))
        .filter(({ q }) => q.question_type === "multiple_choice")
        .map(({ i }) => i);
      const essayIdx = questions
        .map((q, i) => ({ q, i }))
        .filter(({ q }) => q.question_type === "essay")
        .map(({ i }) => i);
      const questionOrder = [...shuffleArray(mcIdx), ...shuffleArray(essayIdx)];

      const alternativesOrder: Record<string, string[]> = {};
      const answers: Record<string, string> = {};

      questionOrder.forEach((originalIndex, newIndex) => {
        const q = questions[originalIndex];
        if (
          q.question_type === "multiple_choice" &&
          q.alternatives.length > 0
        ) {
          const shuffledAlts = shuffleArray(q.alternatives);
          alternativesOrder[String(newIndex + 1)] = shuffledAlts.map(
            (a) => a.letter,
          );

          const correctOriginal = q.correct_answer;
          const newPosition = shuffledAlts.findIndex(
            (a) => a.letter === correctOriginal,
          );
          const newLetters = ["A", "B", "C", "D", "E"];
          answers[String(newIndex + 1)] =
            newPosition >= 0 ? newLetters[newPosition] : "-";
        } else {
          alternativesOrder[String(newIndex + 1)] = [];
          answers[String(newIndex + 1)] = "Dissertativa";
        }
      });

      const qrData = JSON.stringify({
        exam: exam.title,
        version: labels[v],
        answers,
      });

      // Build questions_json: full reordered questions with corrected letters for the editor
      const questionsJson: ExamQuestion[] = questionOrder.map(
        (origIdx, newIdx) => {
          const q = questions[origIdx];
          if (
            q.question_type === "multiple_choice" &&
            alternativesOrder[String(newIdx + 1)]?.length
          ) {
            const altOrder = alternativesOrder[String(newIdx + 1)];
            const reorderedAlts = altOrder
              .map((letter) => q.alternatives.find((a) => a.letter === letter))
              .filter(Boolean)
              .map((a, i) => ({
                letter: ["A", "B", "C", "D", "E"][i] ?? String.fromCharCode(65 + i),
                text: a!.text,
              }));
            return { ...q, question_number: newIdx + 1, alternatives: reorderedAlts };
          }
          return { ...q, question_number: newIdx + 1 };
        },
      );

      const { data: versionData, error: vError } = await db
        .from("exam_versions")
        .insert({
          exam_id: exam.id,
          version_label: labels[v],
          question_order: questionOrder,
          alternatives_order: alternativesOrder,
          qr_code_data: qrData,
          questions_json: questionsJson,
        })
        .select()
        .single();

      if (vError) throw vError;

      const version = versionData as ExamVersion;
      versions.push(version);

      const { data: akData, error: akError } = await db
        .from("exam_answer_keys")
        .insert({
          exam_id: exam.id,
          version_id: version.id,
          answers,
        })
        .select()
        .single();

      if (akError) throw akError;
      answerKeys.push(akData as ExamAnswerKey);
    }

    await db
      .from("exams")
      .update({ status: "finalized" })
      .eq("id", exam.id);

    setExams((prev) =>
      prev.map((e) =>
        e.id === exam.id ? { ...e, status: "finalized" as const } : e,
      ),
    );

    return { versions, answerKeys };
  };

  const fetchVersions = async (examId: string): Promise<ExamVersion[]> => {
    const { data, error } = await db
      .from("exam_versions")
      .select("*")
      .eq("exam_id", examId)
      .order("version_label", { ascending: true });

    if (error) throw error;
    return (data as ExamVersion[]) || [];
  };

  const fetchAnswerKeys = async (examId: string): Promise<ExamAnswerKey[]> => {
    const { data, error } = await db
      .from("exam_answer_keys")
      .select("*")
      .eq("exam_id", examId);

    if (error) throw error;
    return (data as ExamAnswerKey[]) || [];
  };

  const deleteExam = async (examId: string) => {
    const { error } = await db.from("exams").delete().eq("id", examId);
    if (error) throw error;
    setExams((prev) => prev.filter((e) => e.id !== examId));
  };

  return {
    exams,
    loading,
    generating,
    fetchExams,
    fetchExamWithQuestions,
    createExam,
    generateQuestions,
    regenerateQuestion,
    updateQuestion,
    deleteQuestion,
    generateVersions,
    fetchVersions,
    fetchAnswerKeys,
    deleteExam,
  };
};
