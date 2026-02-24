import React, { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useExams } from "../hooks/useExams";
import { useAuth } from "../contexts/AuthContext";
import { useSubscriptionContext } from "../contexts/SubscriptionContext";
import { supabase } from "../lib/supabase";
import QRCode from "react-qr-code";
import QRCodeLib from "qrcode";
import jsPDF from "jspdf";
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from "docx";
import { saveAs } from "file-saver";
import JSZip from "jszip";
import type {
  Exam,
  ExamQuestion,
  ExamVersion,
  ExamAnswerKey,
  ExamAlternative,
  CreateExamInput,
  QuestionType,
  Difficulty,
} from "../types";
import {
  Plus,
  Brain,
  FileText,
  Trash2,
  Edit3,
  RefreshCw,
  Download,
  Eye,
  Shuffle,
  X,
  ChevronLeft,
  Check,
  QrCode,
  Camera,
  Loader2,
  BookOpen,
  Copy,
  Save,
  Upload,
  Paperclip,
  Layers,
} from "lucide-react";

const EXAM_FORM_STORAGE_KEY = "automatech_exam_form_draft";

// ─── Busca quantas provas o usuário criou no mês atual ───────────────────────
async function getProvasDoMes(userId: string): Promise<number> {
  const start = new Date();
  start.setDate(1);
  start.setHours(0, 0, 0, 0);

  const { count } = await (supabase as any)
    .from("exams")
    .select("*", { count: "exact", head: true })
    .eq("created_by", userId)
    .gte("created_at", start.toISOString());

  return count ?? 0;
}

// Utilitário para extrair texto de PDF
async function extractTextFromPDF(file: File): Promise<string> {
  const pdfjsLib = await import("pdfjs-dist");
  if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
    const version = pdfjsLib.version || "4.4.168";
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${version}/build/pdf.worker.min.mjs`;
  }
  const arrayBuffer = await file.arrayBuffer();
  const typedArray = new Uint8Array(arrayBuffer);
  let pdf;
  try {
    pdf = await pdfjsLib.getDocument({ data: typedArray }).promise;
  } catch {
    throw new Error("Não foi possível abrir o PDF. Verifique se não está protegido.");
  }
  const textParts: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items
      .filter((item: Record<string, unknown>) => "str" in item)
      .map((item: Record<string, unknown>) => (item as { str: string }).str)
      .join(" ");
    textParts.push(pageText);
  }
  return textParts.join("\n\n");
}

// Utilitário para extrair texto de DOCX
async function extractTextFromDOCX(file: File): Promise<string> {
  const mammoth = await import("mammoth");
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  return result.value;
}

// Gera XML de parágrafos das questões para injetar no DOCX
function buildQuestionsXML(questions: ExamQuestion[]): string {
  const escape = (str: string) =>
    str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;");

  let xml = `<w:p>
    <w:pPr><w:pStyle w:val="Heading2"/></w:pPr>
    <w:r><w:t>QUESTÕES</w:t></w:r>
  </w:p>`;

  for (const q of questions) {
    xml += `<w:p>
      <w:pPr><w:spacing w:before="200"/></w:pPr>
      <w:r><w:rPr><w:b/><w:sz w:val="24"/></w:rPr><w:t xml:space="preserve">${escape(String(q.question_number))}. </w:t></w:r>
      <w:r><w:rPr><w:sz w:val="24"/></w:rPr><w:t>${escape(q.statement)}</w:t></w:r>
    </w:p>`;

    if (q.question_type === "multiple_choice") {
      for (const alt of q.alternatives) {
        xml += `<w:p>
          <w:pPr><w:ind w:left="360"/><w:spacing w:before="60"/></w:pPr>
          <w:r><w:rPr><w:sz w:val="22"/></w:rPr><w:t xml:space="preserve">    (${escape(alt.letter)}) ${escape(alt.text)}</w:t></w:r>
        </w:p>`;
      }
    } else {
      for (let i = 0; i < 4; i++) {
        xml += `<w:p>
          <w:pPr><w:spacing w:before="100"/></w:pPr>
          <w:r><w:rPr><w:sz w:val="22"/><w:color w:val="CCCCCC"/></w:rPr><w:t>___________________________________________</w:t></w:r>
        </w:p>`;
      }
    }
  }
  return xml;
}

function replaceParagraphByTextContent(
  docXml: string,
  markerRegex: RegExp,
  replacement: string,
): string | null {
  const pRegex = /(<w:p\b[^>]*>[\s\S]*?<\/w:p>)/g;
  let found = false;

  const result = docXml.replace(pRegex, (paragraph) => {
    if (found) return paragraph;
    const textNodes = [...paragraph.matchAll(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g)];
    const paragraphText = textNodes.map((m) => m[1]).join("");
    if (markerRegex.test(paragraphText)) {
      found = true;
      return replacement;
    }
    return paragraph;
  });

  return found ? result : null;
}

async function injectQuestionsIntoDocx(
  templateFile: File,
  questions: ExamQuestion[],
): Promise<Blob> {
  const zip = new JSZip();
  await zip.loadAsync(await templateFile.arrayBuffer());

  const docXmlFile = zip.file("word/document.xml");
  if (!docXmlFile) throw new Error("DOCX inválido: word/document.xml não encontrado.");

  let docXml = await docXmlFile.async("string");
  const questionsXml = buildQuestionsXML(questions);

  const MARKER_REGEX = /\{\{[Qq][Uu][Ee][Ss][Tt][OoÕõ][Ee][Ss]\}\}/;
  const paragraphWithMarker =
    /<w:p\b[^>]*>(?:(?!<w:p\b).)*?\{\{[Qq][Uu][Ee][Ss][Tt][OoÕõ][Ee][Ss]\}\}(?:(?!<w:p\b).)*?<\/w:p>/s;

  if (paragraphWithMarker.test(docXml)) {
    docXml = docXml.replace(paragraphWithMarker, questionsXml);
  } else if (MARKER_REGEX.test(docXml)) {
    docXml = docXml.replace(MARKER_REGEX, questionsXml);
  } else {
    const resultWithMarker = replaceParagraphByTextContent(docXml, MARKER_REGEX, questionsXml);
    if (resultWithMarker) {
      docXml = resultWithMarker;
    } else {
      const sectPrIdx = docXml.lastIndexOf('<w:sectPr');
      const bodyEndIdx = docXml.lastIndexOf('</w:body>');
      const insertAt =
        sectPrIdx > -1 && sectPrIdx < bodyEndIdx ? sectPrIdx : bodyEndIdx;

      const separator = `<w:p><w:r><w:rPr><w:color w:val="AAAAAA"/><w:sz w:val="20"/></w:rPr><w:t>${"─".repeat(50)}</w:t></w:r></w:p>`;
      docXml =
        docXml.slice(0, insertAt) +
        separator +
        questionsXml +
        docXml.slice(insertAt);
    }
  }

  zip.file("word/document.xml", docXml);
  return await zip.generateAsync({ type: "blob" });
}

// =============================================
// SUB-COMPONENTES
// =============================================

// ---- FORMULÁRIO DE CRIAÇÃO ----
const CreateExamForm: React.FC<{
  onSubmit: (input: CreateExamInput, templateFile?: File) => Promise<void>;
  onCancel: () => void;
}> = ({ onSubmit, onCancel }) => {
  const [form, setForm] = useState<CreateExamInput>(() => {
    try {
      const saved = localStorage.getItem(EXAM_FORM_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          title: parsed.title || "",
          subject: parsed.subject || "",
          question_count: parsed.question_count || 10,
          question_type: parsed.question_type || "multiple_choice",
          difficulty: parsed.difficulty || "medium",
          reference_material: parsed.reference_material || "",
          mixed_mc_count: parsed.mixed_mc_count || 5,
          mixed_essay_count: parsed.mixed_essay_count || 5,
          difficulty_levels: parsed.difficulty_levels || ["medium"],
          question_style: parsed.question_style || "simples",
          mc_style: parsed.mc_style || "simples",
          essay_style: parsed.essay_style || "simples",
          mc_difficulty_levels: parsed.mc_difficulty_levels || ["medium"],
          essay_difficulty_levels: parsed.essay_difficulty_levels || ["medium"],
        };
      }
    } catch { /* ignore */ }
    return {
      title: "",
      subject: "",
      question_count: 10,
      question_type: "multiple_choice",
      difficulty: "medium",
      reference_material: "",
      mixed_mc_count: 5,
      mixed_essay_count: 5,
      difficulty_levels: ["medium"],
      question_style: "simples",
      mc_style: "simples",
      essay_style: "simples",
      mc_difficulty_levels: ["medium"],
      essay_difficulty_levels: ["medium"],
    };
  });

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [extracting, setExtracting] = useState(false);

  const [templateFile, setTemplateFile] = useState<File | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const templateInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      localStorage.setItem(EXAM_FORM_STORAGE_KEY, JSON.stringify(form));
    } catch { /* ignore */ }
  }, [form]);

  const clearDraft = useCallback(() => {
    try { localStorage.removeItem(EXAM_FORM_STORAGE_KEY); } catch { /* ignore */ }
  }, []);

  const handleMixedCountChange = (mc: number, essay: number) => {
    setForm({ ...form, mixed_mc_count: mc, mixed_essay_count: essay, question_count: mc + essay });
  };

  const DIFF_OPTIONS: { value: Difficulty; label: string; short: string }[] = [
    { value: "easy", label: "Fácil", short: "Fáceis" },
    { value: "medium", label: "Médio", short: "Médias" },
    { value: "hard", label: "Difícil", short: "Difíceis" },
  ];

  const toggleDiffLevel = (
    field: "difficulty_levels" | "mc_difficulty_levels" | "essay_difficulty_levels",
    level: Difficulty,
  ) => {
    const current = (form[field] as Difficulty[]) || [];
    const exists = current.includes(level);
    const updated = exists ? current.filter((d) => d !== level) : [...current, level];
    if (updated.length === 0) return;
    if (field === "difficulty_levels") {
      setForm({ ...form, [field]: updated, difficulty: updated[0] });
    } else {
      setForm({ ...form, [field]: updated });
    }
  };

  const diffDistLabel = (levels: Difficulty[], count: number): string => {
    const shortMap: Record<string, string> = { easy: "Fáceis", medium: "Médias", hard: "Difíceis" };
    if (levels.length === 0) return "";
    if (levels.length === 1) return `${count} ${shortMap[levels[0]]}`;
    const per = Math.floor(count / levels.length);
    const rem = count % levels.length;
    return levels.map((l, i) => `${per + (i < rem ? 1 : 0)} ${shortMap[l]}`).join(" + ");
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setExtracting(true);
    try {
      let extractedText = form.reference_material || "";
      for (const file of files) {
        const ext = file.name.split(".").pop()?.toLowerCase();
        let text = "";
        if (ext === "pdf") text = await extractTextFromPDF(file);
        else if (ext === "docx" || ext === "doc") text = await extractTextFromDOCX(file);
        else if (ext === "txt") text = await file.text();
        else { alert(`Formato .${ext} não suportado. Use PDF, DOCX ou TXT.`); continue; }
        if (text.trim()) {
          extractedText += (extractedText ? "\n\n--- " + file.name + " ---\n\n" : "") + text.trim();
          setUploadedFiles((prev) => [...prev, file]);
        }
      }
      if (extractedText.length > 8000)
        extractedText = extractedText.substring(0, 8000) + "\n\n[...conteúdo truncado]";
      setForm((prev) => ({ ...prev, reference_material: extractedText }));
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "Erro desconhecido";
      alert(`Erro ao processar o arquivo: ${errMsg}`);
    } finally {
      setExtracting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleTemplateUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (ext !== "docx") {
      alert("O modelo deve ser um arquivo .docx (Word).");
      if (templateInputRef.current) templateInputRef.current.value = "";
      return;
    }
    setTemplateFile(file);
    if (templateInputRef.current) templateInputRef.current.value = "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError(null);
    try {
      await onSubmit(form, templateFile || undefined);
      clearDraft();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Erro desconhecido");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-900">Nova Prova</h2>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {submitError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start justify-between">
              <p className="text-sm text-red-800">{submitError}</p>
              <button type="button" onClick={() => setSubmitError(null)} className="text-red-400 hover:text-red-600 ml-2">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Título */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Título da Prova</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Ex: Prova de Anatomia - 2º Semestre"
              required
            />
          </div>

          {/* Disciplina */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Disciplina / Contexto</label>
            <textarea
              value={form.subject}
              onChange={(e) => setForm({ ...form, subject: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              rows={3}
              placeholder="Descreva o conteúdo, capítulos ou tópicos que a prova deve cobrir..."
              required
            />
          </div>

          {/* Tipo de questões */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Questões</label>
            <select
              value={form.question_type}
              onChange={(e) => {
                const newType = e.target.value as QuestionType;
                if (newType === "mixed") {
                  const mc = form.mixed_mc_count || 5;
                  const essay = form.mixed_essay_count || 5;
                  setForm({ ...form, question_type: newType, mixed_mc_count: mc, mixed_essay_count: essay, question_count: mc + essay });
                } else {
                  setForm({ ...form, question_type: newType });
                }
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="multiple_choice">Múltipla Escolha</option>
              <option value="essay">Dissertativa</option>
              <option value="mixed">Mista</option>
            </select>
          </div>

          {/* Contadores e Dificuldade */}
          {form.question_type === "mixed" ? (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-4">
              <p className="text-sm font-medium text-blue-800">Defina a quantidade de cada tipo:</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-blue-700 mb-1">Múltipla Escolha</label>
                  <input type="number" min={1} max={49} value={form.mixed_mc_count || 5}
                    onChange={(e) => handleMixedCountChange(Math.max(1, parseInt(e.target.value) || 1), form.mixed_essay_count || 5)}
                    className="w-full px-3 py-2 border border-blue-300 rounded-lg bg-white" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-blue-700 mb-1">Dissertativas</label>
                  <input type="number" min={1} max={49} value={form.mixed_essay_count || 5}
                    onChange={(e) => handleMixedCountChange(form.mixed_mc_count || 5, Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full px-3 py-2 border border-blue-300 rounded-lg bg-white" />
                </div>
              </div>
              <p className="text-xs text-blue-600">Total: {(form.mixed_mc_count || 5) + (form.mixed_essay_count || 5)} questões</p>

              <div>
                <p className="text-xs font-semibold text-blue-700 mb-1">Dificuldade — Múltipla Escolha</p>
                <div className="flex gap-2">
                  {DIFF_OPTIONS.map((opt) => {
                    const checked = (form.mc_difficulty_levels || ["medium"]).includes(opt.value);
                    return (
                      <button key={opt.value} type="button" onClick={() => toggleDiffLevel("mc_difficulty_levels", opt.value)}
                        className={`flex-1 py-1.5 text-xs rounded-lg border font-medium transition-colors ${checked ? "bg-blue-600 text-white border-blue-600" : "bg-white text-blue-700 border-blue-300 hover:bg-blue-50"}`}>
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
                <p className="text-xs text-blue-500 mt-1">{diffDistLabel(form.mc_difficulty_levels || ["medium"], form.mixed_mc_count || 5)}</p>
              </div>

              <div>
                <p className="text-xs font-semibold text-blue-700 mb-1">Dificuldade — Dissertativas</p>
                <div className="flex gap-2">
                  {DIFF_OPTIONS.map((opt) => {
                    const checked = (form.essay_difficulty_levels || ["medium"]).includes(opt.value);
                    return (
                      <button key={opt.value} type="button" onClick={() => toggleDiffLevel("essay_difficulty_levels", opt.value)}
                        className={`flex-1 py-1.5 text-xs rounded-lg border font-medium transition-colors ${checked ? "bg-orange-500 text-white border-orange-500" : "bg-white text-orange-700 border-orange-300 hover:bg-orange-50"}`}>
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
                <p className="text-xs text-orange-500 mt-1">{diffDistLabel(form.essay_difficulty_levels || ["medium"], form.mixed_essay_count || 5)}</p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nº de Questões</label>
                <input type="number" min={1} max={50} value={form.question_count}
                  onChange={(e) => setForm({ ...form, question_count: parseInt(e.target.value) || 10 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Dificuldade</label>
                <div className="flex gap-2">
                  {DIFF_OPTIONS.map((opt) => {
                    const checked = (form.difficulty_levels || ["medium"]).includes(opt.value);
                    return (
                      <button key={opt.value} type="button" onClick={() => toggleDiffLevel("difficulty_levels", opt.value)}
                        className={`flex-1 py-2 text-sm rounded-lg border font-medium transition-colors ${checked ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"}`}>
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
                {(form.difficulty_levels || ["medium"]).length > 1 && (
                  <p className="text-xs text-blue-600 mt-1">
                    {form.question_count} questões: {diffDistLabel(form.difficulty_levels || ["medium"], form.question_count)}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Estilo das questões */}
          {form.question_type !== "mixed" ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Estilo das Questões</label>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { value: "simples", label: "Simples", desc: "Diretas e objetivas" },
                  { value: "contextualizada", label: "Contextualizada", desc: "Com situação-problema" },
                ].map((opt) => (
                  <button key={opt.value} type="button"
                    onClick={() => setForm({ ...form, question_style: opt.value as "simples" | "contextualizada" })}
                    className={`p-3 rounded-lg border-2 text-left transition-colors ${form.question_style === opt.value ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-gray-300"}`}>
                    <p className={`text-sm font-semibold ${form.question_style === opt.value ? "text-blue-700" : "text-gray-700"}`}>{opt.label}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{opt.desc}</p>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Estilo por Tipo</label>
              <div className="space-y-2">
                <div>
                  <p className="text-xs font-medium text-gray-600 mb-1">Múltipla Escolha</p>
                  <div className="grid grid-cols-2 gap-2">
                    {[{ value: "simples", label: "Simples" }, { value: "contextualizada", label: "Contextualizada" }].map((opt) => (
                      <button key={opt.value} type="button"
                        onClick={() => setForm({ ...form, mc_style: opt.value as "simples" | "contextualizada" })}
                        className={`py-2 text-xs rounded-lg border-2 font-medium transition-colors ${form.mc_style === opt.value ? "border-blue-500 bg-blue-50 text-blue-700" : "border-gray-200 text-gray-600 hover:border-gray-300"}`}>
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-600 mb-1">Dissertativas</p>
                  <div className="grid grid-cols-2 gap-2">
                    {[{ value: "simples", label: "Simples" }, { value: "contextualizada", label: "Contextualizada" }].map((opt) => (
                      <button key={opt.value} type="button"
                        onClick={() => setForm({ ...form, essay_style: opt.value as "simples" | "contextualizada" })}
                        className={`py-2 text-xs rounded-lg border-2 font-medium transition-colors ${form.essay_style === opt.value ? "border-orange-500 bg-orange-50 text-orange-700" : "border-gray-200 text-gray-600 hover:border-gray-300"}`}>
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Modelo de Prova */}
          <div className="border border-purple-200 bg-purple-50 rounded-lg p-4 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-purple-800">Modelo de Prova (opcional)</p>
                <p className="text-xs text-purple-600 mt-0.5">
                  Suba um Word (.docx) com seu layout. As questões serão inseridas onde estiver o marcador{" "}
                  <code className="bg-purple-100 px-1 rounded font-mono">{"{{QUESTOES}}"}</code>
                </p>
              </div>
            </div>

            <input ref={templateInputRef} type="file" accept=".docx" onChange={handleTemplateUpload} className="hidden" />

            {templateFile ? (
              <div className="flex items-center justify-between bg-white border border-purple-200 rounded-lg px-3 py-2 text-sm">
                <div className="flex items-center space-x-2 text-purple-700">
                  <FileText className="w-4 h-4" />
                  <span className="font-medium">{templateFile.name}</span>
                  <span className="text-xs text-purple-400">({(templateFile.size / 1024).toFixed(0)} KB)</span>
                </div>
                <button type="button" onClick={() => setTemplateFile(null)} className="text-purple-400 hover:text-red-500">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button type="button" onClick={() => templateInputRef.current?.click()}
                className="w-full px-3 py-2.5 border-2 border-dashed border-purple-300 rounded-lg hover:border-purple-500 hover:bg-purple-100 transition-colors flex items-center justify-center space-x-2 text-sm text-purple-600">
                <Upload className="w-4 h-4" />
                <span>Selecionar modelo .docx</span>
              </button>
            )}

            {templateFile && (
              <p className="text-xs text-purple-500">✓ A prova gerada será baixada já inserida neste modelo.</p>
            )}
          </div>

          {/* Material de Referência */}
          <div className="border border-gray-200 rounded-lg p-4 space-y-3">
            <p className="text-sm font-semibold text-gray-700">Material de Referência <span className="text-gray-400 font-normal">(opcional)</span></p>
            <p className="text-xs text-gray-500">Forneça conteúdo base para a IA gerar as questões com mais precisão.</p>

            <div>
              <input ref={fileInputRef} type="file" accept=".pdf,.docx,.doc,.txt" multiple onChange={handleFileUpload} className="hidden" />
              <button type="button" onClick={() => fileInputRef.current?.click()} disabled={extracting}
                className="w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-colors flex items-center justify-center space-x-2 text-sm text-gray-600">
                {extracting ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /><span>Extraindo texto...</span></>
                ) : (
                  <><Upload className="w-4 h-4" /><span>Anexar arquivo PDF, DOCX ou TXT</span></>
                )}
              </button>

              {uploadedFiles.length > 0 && (
                <div className="mt-2 space-y-1">
                  {uploadedFiles.map((file, i) => (
                    <div key={i} className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg px-3 py-1.5 text-sm">
                      <div className="flex items-center space-x-2 text-green-700">
                        <Paperclip className="w-3 h-3" />
                        <span>{file.name}</span>
                        <span className="text-xs text-green-500">({(file.size / 1024).toFixed(0)} KB)</span>
                      </div>
                      <button type="button" onClick={() => setUploadedFiles((p) => p.filter((_, idx) => idx !== i))} className="text-green-400 hover:text-red-500">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">OU</span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>

            <div>
              <textarea
                value={form.reference_material || ""}
                onChange={(e) => setForm({ ...form, reference_material: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                rows={4}
                placeholder="Cole ou escreva o conteúdo de referência aqui..."
              />
              {form.reference_material && (
                <p className="text-xs text-gray-400 mt-1">{form.reference_material.length.toLocaleString()} caracteres</p>
              )}
            </div>
          </div>

          <div className="flex space-x-3 pt-4">
            <button type="button" onClick={onCancel} className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">
              Cancelar
            </button>
            <button type="submit" disabled={submitting}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center space-x-2">
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              <span>{submitting ? "Criando..." : "Criar Prova"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ---- EDITOR DE QUESTÃO ----
const QuestionEditor: React.FC<{
  question: ExamQuestion;
  onSave: (updated: ExamQuestion) => void;
  onCancel: () => void;
}> = ({ question, onSave, onCancel }) => {
  const [edited, setEdited] = useState<ExamQuestion>({ ...question });

  const updateAlternative = (index: number, text: string) => {
    const newAlts = [...edited.alternatives];
    newAlts[index] = { ...newAlts[index], text };
    setEdited({ ...edited, alternatives: newAlts });
  };

  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 space-y-3">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Enunciado</label>
        <textarea value={edited.statement} onChange={(e) => setEdited({ ...edited, statement: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" rows={3} />
      </div>
      {edited.question_type === "multiple_choice" && edited.alternatives.map((alt, i) => (
        <div key={alt.letter} className="flex items-center space-x-2">
          <span className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold ${edited.correct_answer === alt.letter ? "bg-green-600 text-white" : "bg-gray-200 text-gray-700"}`}>
            {alt.letter}
          </span>
          <input value={alt.text} onChange={(e) => updateAlternative(i, e.target.value)}
            className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm" />
          <button type="button" onClick={() => setEdited({ ...edited, correct_answer: alt.letter })}
            className={`px-2 py-1 rounded text-xs ${edited.correct_answer === alt.letter ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500 hover:bg-green-50"}`}>
            Correta
          </button>
        </div>
      ))}
      <div className="flex justify-end space-x-2 pt-2">
        <button onClick={onCancel} className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Cancelar</button>
        <button onClick={() => onSave(edited)} className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-1">
          <Save className="w-3 h-3" /><span>Salvar</span>
        </button>
      </div>
    </div>
  );
};

// ---- REVISÃO DE PROVA ----
const ExamReview: React.FC<{
  exam: Exam;
  questions: ExamQuestion[];
  versions: ExamVersion[];
  answerKeys: ExamAnswerKey[];
  onBack: () => void;
  onQuestionsChange: (questions: ExamQuestion[]) => void;
  onRegenerateQuestion: (q: ExamQuestion) => Promise<ExamQuestion>;
  onUpdateQuestion: (id: string, updates: Partial<ExamQuestion>) => Promise<void>;
  onDeleteQuestion: (id: string) => Promise<void>;
  onGenerateVersions: () => void;
  onViewVersions: () => void;
  onGenerateQuestions: () => Promise<void>;
  generating: boolean;
  onExportPDF: () => Promise<void>;
  onExportDOCX: () => Promise<void>;
  onExportAnswerKey: () => Promise<void>;
  onOpenEditor: () => void;
}> = ({
  exam, questions, versions, answerKeys, onBack, onQuestionsChange, onRegenerateQuestion,
  onUpdateQuestion, onDeleteQuestion, onGenerateVersions, onViewVersions, onGenerateQuestions,
  generating, onExportPDF, onExportDOCX, onExportAnswerKey, onOpenEditor,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);
  const [exportingDirect, setExportingDirect] = useState(false);

  const handleSaveEdit = async (updated: ExamQuestion) => {
    await onUpdateQuestion(updated.id, updated);
    onQuestionsChange(questions.map((q) => (q.id === updated.id ? updated : q)));
    setEditingId(null);
  };

  const handleRegenerate = async (q: ExamQuestion) => {
    setRegeneratingId(q.id);
    try {
      const newQ = await onRegenerateQuestion(q);
      onQuestionsChange(questions.map((oq) => (oq.id === q.id ? newQ : oq)));
    } catch (err) {
      console.error("Erro ao regenerar:", err);
    } finally {
      setRegeneratingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Excluir esta questão?")) return;
    await onDeleteQuestion(id);
    onQuestionsChange(questions.filter((q) => q.id !== id).map((q, i) => ({ ...q, question_number: i + 1 })));
  };

  const handleDirectExport = async (fn: () => Promise<void>) => {
    setExportingDirect(true);
    try { await fn(); } catch (err) { console.error(err); alert("Erro ao exportar. Tente novamente."); }
    finally { setExportingDirect(false); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-lg"><ChevronLeft className="w-5 h-5" /></button>
          <div>
            <h2 className="text-xl font-bold text-gray-900">{exam.title}</h2>
            <p className="text-sm text-gray-500">{questions.length} questões - {exam.subject}</p>
          </div>
        </div>
        <button onClick={onGenerateVersions} disabled={generating || questions.length === 0}
          className="bg-gradient-to-r from-purple-600 to-purple-700 text-white px-4 py-2 rounded-lg hover:from-purple-700 hover:to-purple-800 disabled:opacity-50 flex items-center space-x-2">
          <Shuffle className="w-4 h-4" /><span>Gerar Versões</span>
        </button>
      </div>

      {questions.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Exportar / Baixar Prova</h3>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => handleDirectExport(onExportPDF)} disabled={exportingDirect}
              className="px-4 py-2 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 flex items-center space-x-2 text-sm font-medium disabled:opacity-50">
              <Download className="w-4 h-4" /><span>Baixar PDF</span>
            </button>
            <button onClick={() => handleDirectExport(onExportDOCX)} disabled={exportingDirect}
              className="px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 flex items-center space-x-2 text-sm font-medium disabled:opacity-50">
              <Download className="w-4 h-4" /><span>Baixar DOCX</span>
            </button>
            <button onClick={() => handleDirectExport(onExportAnswerKey)} disabled={exportingDirect}
              className="px-4 py-2 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 flex items-center space-x-2 text-sm font-medium disabled:opacity-50">
              <FileText className="w-4 h-4" /><span>Gabarito PDF</span>
            </button>
            {versions.length > 0 ? (
              <button onClick={onViewVersions}
                className="px-4 py-2 bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100 flex items-center space-x-2 text-sm font-medium">
                <Layers className="w-4 h-4" /><span>Versões ({versions.length})</span>
              </button>
            ) : (
              <button onClick={onGenerateVersions} disabled={generating || questions.length === 0}
                className="px-4 py-2 bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100 flex items-center space-x-2 text-sm font-medium disabled:opacity-50">
                <Shuffle className="w-4 h-4" /><span>Gerar Versões</span>
              </button>
            )}
            <button onClick={onOpenEditor}
              className="px-4 py-2 bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 flex items-center space-x-2 text-sm font-medium">
              <Edit3 className="w-4 h-4" /><span>Abrir no Editor</span>
            </button>
          </div>
        </div>
      )}

      {questions.length === 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-8 text-center">
          <Brain className="w-12 h-12 text-yellow-500 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Nenhuma questão gerada</h3>
          <p className="text-sm text-gray-600 mb-4">As questões ainda não foram geradas. Clique abaixo para gerar com IA.</p>
          <button onClick={onGenerateQuestions} disabled={generating}
            className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3 rounded-lg disabled:opacity-50 flex items-center justify-center space-x-2 mx-auto">
            {generating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Brain className="w-5 h-5" />}
            <span>{generating ? "Gerando questões..." : "Gerar Questões com IA"}</span>
          </button>
        </div>
      )}

      <div className="space-y-4">
        {questions.map((q) => (
          <div key={q.id} className="bg-white rounded-xl border border-gray-200 p-5">
            {editingId === q.id ? (
              <QuestionEditor question={q} onSave={handleSaveEdit} onCancel={() => setEditingId(null)} />
            ) : (
              <>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <span className="bg-blue-100 text-blue-800 text-xs font-bold px-2 py-1 rounded">Q{q.question_number}</span>
                      <span className={`text-xs px-2 py-1 rounded ${q.question_type === "multiple_choice" ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"}`}>
                        {q.question_type === "multiple_choice" ? "Múltipla Escolha" : "Dissertativa"}
                      </span>
                    </div>
                    <p className="text-gray-900 font-medium">{q.statement}</p>
                  </div>
                  <div className="flex space-x-1 ml-4">
                    <button onClick={() => setEditingId(q.id)} className="p-1.5 hover:bg-blue-50 rounded text-blue-600" title="Editar"><Edit3 className="w-4 h-4" /></button>
                    <button onClick={() => handleRegenerate(q)} disabled={regeneratingId === q.id} className="p-1.5 hover:bg-purple-50 rounded text-purple-600 disabled:opacity-50" title="Regenerar">
                      {regeneratingId === q.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                    </button>
                    <button onClick={() => handleDelete(q.id)} className="p-1.5 hover:bg-red-50 rounded text-red-600" title="Excluir"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
                {q.question_type === "multiple_choice" && (
                  <div className="space-y-2 ml-4">
                    {q.alternatives.map((alt: ExamAlternative) => (
                      <div key={alt.letter} className={`flex items-center space-x-2 p-2 rounded-lg text-sm ${q.correct_answer === alt.letter ? "bg-green-50 border border-green-200" : "bg-gray-50"}`}>
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${q.correct_answer === alt.letter ? "bg-green-600 text-white" : "bg-gray-300 text-gray-700"}`}>{alt.letter}</span>
                        <span>{alt.text}</span>
                        {q.correct_answer === alt.letter && <Check className="w-4 h-4 text-green-600 ml-auto" />}
                      </div>
                    ))}
                  </div>
                )}
                {q.explanation && (
                  <div className="mt-3 p-3 bg-blue-50 rounded-lg text-sm text-blue-800">
                    <strong>Explicação:</strong> {q.explanation}
                  </div>
                )}
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

// ---- MODAL DE VERSÕES ----
const VersionsModal: React.FC<{
  exam: Exam;
  questions: ExamQuestion[];
  versions: ExamVersion[];
  answerKeys: ExamAnswerKey[];
  onClose: () => void;
}> = ({ exam, questions, versions, answerKeys, onClose }) => {
  const navigate = useNavigate();
  const [selectedVersion, setSelectedVersion] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const qrRef = useRef<HTMLDivElement>(null);

  const getVersionQuestions = (version: ExamVersion): ExamQuestion[] => {
    const order = version.question_order as number[];
    return order.map((originalIndex, newIndex) => {
      const q = questions[originalIndex];
      if (q.question_type === "multiple_choice" && version.alternatives_order[String(newIndex + 1)]) {
        const altOrder = version.alternatives_order[String(newIndex + 1)] as string[];
        const reorderedAlts = altOrder
          .map((letter) => q.alternatives.find((a) => a.letter === letter))
          .filter(Boolean)
          .map((a, i) => ({ letter: ["A", "B", "C", "D", "E"][i], text: a!.text }));
        return { ...q, question_number: newIndex + 1, alternatives: reorderedAlts };
      }
      return { ...q, question_number: newIndex + 1 };
    });
  };

  const exportPDF = async (version: ExamVersion) => {
    setExporting(true);
    try {
      const vQuestions = getVersionQuestions(version);
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 20;
      const maxWidth = pageWidth - margin * 2;
      let y = 15;

      doc.setFontSize(14); doc.setFont("helvetica", "bold");
      doc.text(exam.title, pageWidth / 2, y, { align: "center" }); y += 7;
      doc.setFontSize(10); doc.setFont("helvetica", "normal");
      doc.text(`Disciplina: ${exam.subject} | Versao: ${version.version_label}`, pageWidth / 2, y, { align: "center" }); y += 8;
      doc.text("Nome: _______________________________________________", margin, y);
      doc.text("Data: ___/___/______", pageWidth - margin - 45, y); y += 6;
      doc.text("Turma: __________________  Matricula: __________________", margin, y); y += 6;
      doc.setDrawColor(150); doc.setLineWidth(0.5); doc.line(margin, y, pageWidth - margin, y); y += 8;

      for (const q of vQuestions) {
        const stmtLines = doc.splitTextToSize(q.statement, maxWidth - 10);
        const neededSpace = stmtLines.length * 5 + (q.question_type === "multiple_choice" ? q.alternatives.length * 7 + 8 : 30);
        if (y + neededSpace > pageHeight - 25) { doc.addPage(); y = 20; }
        doc.setFontSize(11); doc.setFont("helvetica", "bold"); doc.text(`${q.question_number}.`, margin, y);
        doc.setFont("helvetica", "normal"); doc.text(stmtLines, margin + 8, y); y += stmtLines.length * 5 + 4;
        if (q.question_type === "multiple_choice") {
          doc.setFontSize(10);
          for (const alt of q.alternatives) {
            if (y > pageHeight - 25) { doc.addPage(); y = 20; }
            const altLines = doc.splitTextToSize(`(${alt.letter}) ${alt.text}`, maxWidth - 15);
            doc.text(altLines, margin + 10, y); y += altLines.length * 5 + 2;
          }
        } else {
          for (let i = 0; i < 5; i++) {
            y += 6; if (y > pageHeight - 25) { doc.addPage(); y = 20; }
            doc.setDrawColor(200); doc.setLineWidth(0.3); doc.line(margin + 5, y, pageWidth - margin, y);
          }
        }
        y += 8;
      }

      const mcQ = vQuestions.filter((q) => q.question_type === "multiple_choice");
      if (mcQ.length > 0) {
        doc.addPage(); y = 20;
        doc.setFontSize(14); doc.setFont("helvetica", "bold");
        doc.text("FOLHA DE RESPOSTAS", pageWidth / 2, y, { align: "center" }); y += 7;
        doc.setFontSize(10); doc.setFont("helvetica", "normal");
        doc.text(`${exam.title} - Versao ${version.version_label}`, pageWidth / 2, y, { align: "center" }); y += 8;
        doc.text("Nome: _______________________________________________", margin, y); y += 10;
        const cols = Math.min(4, Math.ceil(mcQ.length / 10));
        const itemsPerCol = Math.ceil(mcQ.length / cols);
        doc.setFontSize(9);
        for (let col = 0; col < cols; col++) {
          const startX = margin + col * 35 + (col > 0 ? 10 : 0);
          for (let row = 0; row < itemsPerCol; row++) {
            const idx = col * itemsPerCol + row;
            if (idx >= mcQ.length) break;
            const q = mcQ[idx]; const rowY = y + row * 8;
            doc.setFont("helvetica", "bold"); doc.text(`${q.question_number}.`, startX, rowY);
            doc.setFont("helvetica", "normal");
            ["A","B","C","D","E"].forEach((l, li) => {
              const cx = startX + 10 + li * 6.5;
              doc.circle(cx, rowY - 1.5, 2.5);
              doc.setFontSize(7); doc.text(l, cx - 1.2, rowY - 0.5); doc.setFontSize(9);
            });
          }
        }
        y += itemsPerCol * 8 + 5;
        if (version.qr_code_data) {
          try {
            const qrUrl = await QRCodeLib.toDataURL(version.qr_code_data, { width: 120, margin: 1, color: { dark: "#000000", light: "#FFFFFF" } });
            const qrSize = 28; const qrX = pageWidth - margin - qrSize; const qrY = pageHeight - margin - qrSize - 5;
            doc.addImage(qrUrl, "PNG", qrX, qrY, qrSize, qrSize);
            doc.setFontSize(7); doc.text("QR Code do Gabarito", qrX, qrY + qrSize + 4);
          } catch { /* ignore */ }
        }
      }

      const total = doc.getNumberOfPages();
      for (let p = 1; p <= total; p++) {
        doc.setPage(p); doc.setFontSize(7); doc.setFont("helvetica", "normal"); doc.setTextColor(150);
        doc.text(`${exam.title} - Versao ${version.version_label} | Pagina ${p} de ${total}`, pageWidth / 2, pageHeight - 8, { align: "center" });
        doc.setTextColor(0);
      }
      doc.save(`${exam.title} - Versao ${version.version_label}.pdf`);
    } finally { setExporting(false); }
  };

  const exportAnswerKeyPDF = async (version: ExamVersion, answerKey: ExamAnswerKey) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20; let y = 20;
    doc.setFontSize(16); doc.setFont("helvetica", "bold"); doc.text("GABARITO OFICIAL", pageWidth / 2, y, { align: "center" }); y += 8;
    doc.setFontSize(12); doc.setFont("helvetica", "normal"); doc.text(`${exam.title} - Versao ${version.version_label}`, pageWidth / 2, y, { align: "center" }); y += 5;
    doc.setFontSize(9); doc.setTextColor(100); doc.text("DOCUMENTO CONFIDENCIAL - USO EXCLUSIVO DO PROFESSOR", pageWidth / 2, y, { align: "center" }); doc.setTextColor(0); y += 10;
    doc.setDrawColor(150); doc.setLineWidth(0.5); doc.line(margin, y, pageWidth - margin, y); y += 10;
    const answers = answerKey.answers as Record<string, string>;
    const entries = Object.entries(answers);
    const colCount = 3; const itemsPerCol = Math.ceil(entries.length / colCount); const colWidth = (pageWidth - 2 * margin) / colCount;
    doc.setFontSize(11);
    for (let col = 0; col < colCount; col++) {
      for (let row = 0; row < itemsPerCol; row++) {
        const idx = col * itemsPerCol + row; if (idx >= entries.length) break;
        const [num, answer] = entries[idx]; const x = margin + col * colWidth; const rowY = y + row * 8;
        doc.setFont("helvetica", "bold"); doc.text(`Q${num}:`, x, rowY);
        doc.setFont("helvetica", "normal"); doc.text(` ${answer}`, x + 12, rowY);
      }
    }
    y += itemsPerCol * 8 + 10;
    if (version.qr_code_data) {
      try {
        const qrUrl = await QRCodeLib.toDataURL(version.qr_code_data, { width: 150, margin: 1 });
        const qrSize = 35;
        doc.addImage(qrUrl, "PNG", pageWidth / 2 - qrSize / 2, y, qrSize, qrSize); y += qrSize + 5;
        doc.setFontSize(8); doc.text("QR Code contendo gabarito desta versao", pageWidth / 2, y, { align: "center" });
      } catch { /* ignore */ }
    }
    doc.save(`GABARITO - ${exam.title} - Versao ${version.version_label}.pdf`);
  };

  const exportDOCX = async (version: ExamVersion) => {
    const vQuestions = getVersionQuestions(version);
    const children: Paragraph[] = [
      new Paragraph({ text: exam.title, heading: HeadingLevel.HEADING_1, alignment: "center" as unknown as undefined }),
      new Paragraph({ children: [new TextRun({ text: `Versão ${version.version_label} | ${exam.subject}`, italics: true, size: 22 })], alignment: "center" as unknown as undefined }),
      new Paragraph({ children: [new TextRun({ text: "Nome: ________________________________  Data: ___/___/______", size: 22 })], spacing: { before: 300, after: 300 } }),
    ];
    for (const q of vQuestions) {
      children.push(new Paragraph({ children: [new TextRun({ text: `${q.question_number}. `, bold: true, size: 24 }), new TextRun({ text: q.statement, size: 24 })], spacing: { before: 200 } }));
      if (q.question_type === "multiple_choice") {
        for (const alt of q.alternatives)
          children.push(new Paragraph({ children: [new TextRun({ text: `    (${alt.letter}) ${alt.text}`, size: 22 })], spacing: { before: 60 } }));
      } else {
        for (let i = 0; i < 4; i++)
          children.push(new Paragraph({ children: [new TextRun({ text: "___________________________________________", size: 22, color: "CCCCCC" })], spacing: { before: 100 } }));
      }
    }
    const doc = new Document({ sections: [{ children }] });
    saveAs(await Packer.toBlob(doc), `${exam.title} - Versao ${version.version_label}.docx`);
  };

  const selectedVersionData = versions.find((v) => v.id === selectedVersion);
  const selectedAnswerKey = answerKeys.find((ak) => ak.version_id === selectedVersion);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-gray-200 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Versões da Prova</h2>
            <p className="text-sm text-gray-500">{versions.length} versões geradas - {exam.title}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-6 h-6" /></button>
        </div>
        <div className="flex flex-1 overflow-hidden">
          <div className="w-64 border-r border-gray-200 p-4 overflow-y-auto">
            <h3 className="text-sm font-semibold text-gray-500 mb-3">VERSÕES</h3>
            {versions.map((v) => (
              <button key={v.id} onClick={() => setSelectedVersion(v.id)}
                className={`w-full text-left p-3 rounded-lg mb-2 transition-colors ${selectedVersion === v.id ? "bg-blue-50 border border-blue-200" : "hover:bg-gray-50 border border-transparent"}`}>
                <div className="flex items-center space-x-3">
                  <span className="w-8 h-8 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center font-bold text-sm">{v.version_label}</span>
                  <div>
                    <p className="font-medium text-gray-900 text-sm">Prova {v.version_label}</p>
                    <p className="text-xs text-gray-500">{(v.question_order as number[]).length} questões</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
          <div className="flex-1 p-6 overflow-y-auto">
            {selectedVersionData ? (
              <div className="space-y-6">
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => exportPDF(selectedVersionData)} disabled={exporting}
                    className="px-4 py-2 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 flex items-center space-x-2 text-sm font-medium">
                    <Download className="w-4 h-4" /><span>Exportar PDF</span>
                  </button>
                  <button onClick={() => exportDOCX(selectedVersionData)}
                    className="px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 flex items-center space-x-2 text-sm font-medium">
                    <Download className="w-4 h-4" /><span>Exportar DOCX</span>
                  </button>
                  {selectedAnswerKey && (
                    <button onClick={() => exportAnswerKeyPDF(selectedVersionData, selectedAnswerKey)}
                      className="px-4 py-2 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 flex items-center space-x-2 text-sm font-medium">
                      <FileText className="w-4 h-4" /><span>Gabarito PDF</span>
                    </button>
                  )}
                  <button
                    onClick={() => { onClose(); navigate(`/dashboard/editor/${exam.id}?version=${selectedVersionData.version_label}`); }}
                    className="px-4 py-2 bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 flex items-center space-x-2 text-sm font-medium">
                    <Edit3 className="w-4 h-4" /><span>Abrir no Editor</span>
                  </button>
                </div>
                {selectedVersionData.qr_code_data && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center space-x-2">
                      <QrCode className="w-4 h-4" /><span>QR Code - Versão {selectedVersionData.version_label}</span>
                    </h4>
                    <div ref={qrRef} className="bg-white p-4 rounded-lg inline-block">
                      <QRCode value={selectedVersionData.qr_code_data} size={150} />
                    </div>
                  </div>
                )}
                {selectedAnswerKey && (
                  <div className="bg-green-50 rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-green-800 mb-3">Gabarito - Versão {selectedVersionData.version_label}</h4>
                    <div className="grid grid-cols-5 gap-2">
                      {Object.entries(selectedAnswerKey.answers as Record<string, string>).map(([num, answer]) => (
                        <div key={num} className="bg-white rounded-lg p-2 text-center border border-green-200">
                          <span className="text-xs text-gray-500">Q{num}</span>
                          <p className="font-bold text-green-700">{answer}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">Preview das Questões</h4>
                  <div className="space-y-3">
                    {getVersionQuestions(selectedVersionData).map((q) => (
                      <div key={q.question_number} className="bg-white rounded-lg p-3 border border-gray-200 text-sm">
                        <p className="font-medium text-gray-900 mb-2">{q.question_number}. {q.statement}</p>
                        {q.question_type === "multiple_choice" && (
                          <div className="ml-4 space-y-1">
                            {q.alternatives.map((alt: ExamAlternative) => (
                              <p key={alt.letter} className="text-gray-700">({alt.letter}) {alt.text}</p>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400">
                <div className="text-center"><Eye className="w-12 h-12 mx-auto mb-3 opacity-50" /><p>Selecione uma versão para visualizar</p></div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ---- MODAL GERAÇÃO DE VERSÕES ----
const GenerateVersionsModal: React.FC<{ onGenerate: (count: number) => Promise<void>; onCancel: () => void }> = ({ onGenerate, onCancel }) => {
  const [count, setCount] = useState(3);
  const [generating, setGenerating] = useState(false);
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-sm p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Gerar Versões Embaralhadas</h3>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Quantas versões? (máx. 10)</label>
          <input type="number" min={1} max={10} value={count}
            onChange={(e) => setCount(Math.min(10, Math.max(1, parseInt(e.target.value) || 1)))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500" />
          <p className="text-xs text-gray-500 mt-1">Versões: {["A","B","C","D","E","F","G","H","I","J"].slice(0, count).join(", ")}</p>
        </div>
        <div className="flex space-x-3">
          <button onClick={onCancel} className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">Cancelar</button>
          <button onClick={async () => { setGenerating(true); try { await onGenerate(count); } finally { setGenerating(false); } }} disabled={generating}
            className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center justify-center space-x-2">
            {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shuffle className="w-4 h-4" />}
            <span>{generating ? "Gerando..." : "Gerar"}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

// ---- SCANNER QR CODE ----
const QRScannerModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [scannedData, setScannedData] = useState<{ exam: string; version: string; answers: Record<string, string> } | null>(null);
  const [error, setError] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopCamera = () => {
    if (scanIntervalRef.current) { clearInterval(scanIntervalRef.current); scanIntervalRef.current = null; }
    if (streamRef.current) { streamRef.current.getTracks().forEach((t) => t.stop()); streamRef.current = null; }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      streamRef.current = stream;
      if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play(); }
      const { default: jsQR } = await import("jsqr");
      scanIntervalRef.current = setInterval(() => {
        if (!videoRef.current || !canvasRef.current) return;
        const video = videoRef.current; const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");
        if (!ctx || video.readyState !== video.HAVE_ENOUGH_DATA) return;
        canvas.width = video.videoWidth; canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);
        if (code) {
          try {
            const parsed = JSON.parse(code.data);
            if (parsed.exam && parsed.version && parsed.answers) { setScannedData(parsed); stopCamera(); }
          } catch { /* continuar */ }
        }
      }, 300);
    } catch { setError("Não foi possível acessar a câmera. Verifique as permissões."); }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-md">
        <div className="p-6 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-lg font-bold text-gray-900 flex items-center space-x-2"><Camera className="w-5 h-5" /><span>Scanner de Gabarito</span></h2>
          <button onClick={() => { stopCamera(); onClose(); }} className="text-gray-400 hover:text-gray-600"><X className="w-6 h-6" /></button>
        </div>
        <div className="p-6">
          {scannedData ? (
            <div className="space-y-4">
              <div className="bg-green-50 p-4 rounded-lg text-center"><Check className="w-10 h-10 text-green-600 mx-auto mb-2" /><p className="font-bold text-green-800">QR Code Lido!</p></div>
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-bold text-gray-900 mb-1">{scannedData.exam}</h3>
                <p className="text-sm text-gray-600 mb-3">Versão {scannedData.version}</p>
                <div className="grid grid-cols-5 gap-2">
                  {Object.entries(scannedData.answers).map(([num, answer]) => (
                    <div key={num} className="bg-white rounded-lg p-2 text-center border border-green-200">
                      <span className="text-xs text-gray-500">Q{num}</span>
                      <p className="font-bold text-green-700 text-lg">{answer}</p>
                    </div>
                  ))}
                </div>
              </div>
              <button onClick={() => { setScannedData(null); startCamera(); }} className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Escanear Outro</button>
            </div>
          ) : (
            <div className="space-y-4">
              {error ? <div className="bg-red-50 p-4 rounded-lg text-red-800 text-sm">{error}</div> : (
                <>
                  <div className="relative bg-black rounded-lg overflow-hidden aspect-square">
                    <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
                    <canvas ref={canvasRef} className="hidden" />
                    <div className="absolute inset-0 border-2 border-white/30 rounded-lg m-8" />
                  </div>
                  <button onClick={startCamera} className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center space-x-2">
                    <Camera className="w-4 h-4" /><span>Iniciar Câmera</span>
                  </button>
                  <p className="text-xs text-gray-500 text-center">Aponte a câmera para o QR Code no rodapé da prova</p>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// =============================================
// PÁGINA PRINCIPAL
// =============================================
const ExamGenerator: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { canAccess, openUpgradeModal, currentPlan } = useSubscriptionContext();

  const {
    exams, loading, generating, createExam, generateQuestions,
    regenerateQuestion, updateQuestion, deleteQuestion, generateVersions,
    fetchExamWithQuestions, fetchVersions, fetchAnswerKeys, deleteExam,
  } = useExams();

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [activeExam, setActiveExam] = useState<Exam | null>(null);
  const [activeQuestions, setActiveQuestions] = useState<ExamQuestion[]>([]);
  const [showVersionsModal, setShowVersionsModal] = useState(false);
  const [showGenerateVersions, setShowGenerateVersions] = useState(false);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [versions, setVersions] = useState<ExamVersion[]>([]);
  const [answerKeys, setAnswerKeys] = useState<ExamAnswerKey[]>([]);
  const [loadingExam, setLoadingExam] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeTemplateFile, setActiveTemplateFile] = useState<File | null>(null);
  const [genOptions, setGenOptions] = useState<Partial<CreateExamInput>>({});

  useEffect(() => {
    try {
      const saved = localStorage.getItem(EXAM_FORM_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.title || parsed.subject) setShowCreateForm(true);
      }
    } catch { /* ignore */ }
  }, []);

  // ── Verificar limite de provas do mês antes de abrir o form ─────────────────
  const handleNovaProva = async () => {
    if (!user) return;

    const provasDoMes = await getProvasDoMes(user.id);
    const provasLimit = currentPlan?.features?.provas_mes ?? 1;

    if (!canAccess("provas_mes", provasDoMes)) {
      openUpgradeModal(
        "provas_mes",
        "Provas com IA",
        provasLimit === -1 ? "Ilimitado" : provasLimit,
      );
      return;
    }

    setShowCreateForm(true);
  };

  const handleCreateExam = async (input: CreateExamInput, templateFile?: File) => {
    setErrorMessage(null);
    setGenOptions(input);
    const exam = await createExam(input);
    if (exam) {
      setShowCreateForm(false);
      setActiveExam(exam);
      setVersions([]);
      setAnswerKeys([]);
      try {
        const questions = await generateQuestions(exam, input);
        setActiveQuestions(questions);
        if (templateFile) setActiveTemplateFile(templateFile);
      } catch (genErr) {
        const msg = genErr instanceof Error ? genErr.message : "Erro desconhecido";
        setActiveQuestions([]);
        alert(`A prova foi criada, mas houve erro ao gerar as questões: ${msg}\n\nClique em "Gerar Questões com IA" para tentar novamente.`);
      }
    }
  };

  const handleOpenExam = async (exam: Exam) => {
    setLoadingExam(true);
    setActiveTemplateFile(null);
    setGenOptions({});
    try {
      const [fullExam, examVersions, examAnswerKeys] = await Promise.all([
        fetchExamWithQuestions(exam.id),
        fetchVersions(exam.id).catch(() => [] as ExamVersion[]),
        fetchAnswerKeys(exam.id).catch(() => [] as ExamAnswerKey[]),
      ]);
      if (fullExam) { setActiveExam(fullExam); setActiveQuestions(fullExam.questions || []); }
      setVersions(examVersions);
      setAnswerKeys(examAnswerKeys);
    } finally { setLoadingExam(false); }
  };

  const handleGenerateVersions = async (count: number) => {
    if (!activeExam) return;
    const result = await generateVersions(activeExam, activeQuestions, count);
    setVersions(result.versions);
    setAnswerKeys(result.answerKeys);
    setShowGenerateVersions(false);
    setShowVersionsModal(true);
  };

  const handleViewVersions = async (exam: Exam) => {
    setLoadingExam(true);
    try {
      const fullExam = await fetchExamWithQuestions(exam.id);
      if (fullExam) {
        setActiveExam(fullExam); setActiveQuestions(fullExam.questions || []);
        setVersions(await fetchVersions(exam.id)); setAnswerKeys(await fetchAnswerKeys(exam.id));
        setShowVersionsModal(true);
      }
    } finally { setLoadingExam(false); }
  };

  const handleDeleteExam = async (examId: string, title: string) => {
    if (!window.confirm(`Excluir a prova "${title}" permanentemente?`)) return;
    await deleteExam(examId);
  };

  const difficultyLabels: Record<string, string> = { easy: "Fácil", medium: "Médio", hard: "Difícil" };
  const typeLabels: Record<string, string> = { multiple_choice: "Múltipla Escolha", essay: "Dissertativa", mixed: "Mista" };
  const statusLabels: Record<string, string> = { draft: "Rascunho", generated: "Gerada", reviewed: "Revisada", finalized: "Finalizada" };
  const statusColors: Record<string, string> = { draft: "bg-gray-100 text-gray-700", generated: "bg-yellow-100 text-yellow-700", reviewed: "bg-blue-100 text-blue-700", finalized: "bg-green-100 text-green-700" };

  if (loading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-8 bg-gray-200 rounded w-1/3"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => <div key={i} className="bg-white rounded-xl h-48 border border-gray-200"></div>)}
        </div>
      </div>
    );
  }

  // ── Exportações (inalteradas) ────────────────────────────────────────────────
  const exportDirectPDF = async () => {
    if (!activeExam || activeQuestions.length === 0) return;
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth(); const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20; const maxWidth = pageWidth - margin * 2; let y = 15;
    doc.setFontSize(14); doc.setFont("helvetica", "bold"); doc.text(activeExam.title, pageWidth / 2, y, { align: "center" }); y += 7;
    doc.setFontSize(10); doc.setFont("helvetica", "normal"); doc.text(`Disciplina: ${activeExam.subject}`, pageWidth / 2, y, { align: "center" }); y += 8;
    doc.text("Nome: _______________________________________________", margin, y); doc.text("Data: ___/___/______", pageWidth - margin - 45, y); y += 6;
    doc.text("Turma: __________________  Matricula: __________________", margin, y); y += 6;
    doc.setDrawColor(150); doc.setLineWidth(0.5); doc.line(margin, y, pageWidth - margin, y); y += 8;
    for (const q of activeQuestions) {
      const stmtLines = doc.splitTextToSize(q.statement, maxWidth - 10);
      const neededSpace = stmtLines.length * 5 + (q.question_type === "multiple_choice" ? q.alternatives.length * 7 + 8 : 30);
      if (y + neededSpace > pageHeight - 25) { doc.addPage(); y = 20; }
      doc.setFontSize(11); doc.setFont("helvetica", "bold"); doc.text(`${q.question_number}.`, margin, y);
      doc.setFont("helvetica", "normal"); doc.text(stmtLines, margin + 8, y); y += stmtLines.length * 5 + 4;
      if (q.question_type === "multiple_choice") {
        doc.setFontSize(10);
        for (const alt of q.alternatives) {
          if (y > pageHeight - 25) { doc.addPage(); y = 20; }
          const altLines = doc.splitTextToSize(`(${alt.letter}) ${alt.text}`, maxWidth - 15);
          doc.text(altLines, margin + 10, y); y += altLines.length * 5 + 2;
        }
      } else {
        for (let i = 0; i < 5; i++) { y += 6; if (y > pageHeight - 25) { doc.addPage(); y = 20; } doc.setDrawColor(200); doc.setLineWidth(0.3); doc.line(margin + 5, y, pageWidth - margin, y); }
      }
      y += 8;
    }
    const totalPages = doc.getNumberOfPages();
    for (let p = 1; p <= totalPages; p++) { doc.setPage(p); doc.setFontSize(7); doc.setFont("helvetica", "normal"); doc.setTextColor(150); doc.text(`${activeExam.title} | Pagina ${p} de ${totalPages}`, pageWidth / 2, pageHeight - 8, { align: "center" }); doc.setTextColor(0); }
    doc.save(`${activeExam.title}.pdf`);
  };

  const exportDirectAnswerKeyPDF = async () => {
    if (!activeExam || activeQuestions.length === 0) return;
    const doc = new jsPDF(); const pageWidth = doc.internal.pageSize.getWidth(); const margin = 20; let y = 20;
    doc.setFontSize(16); doc.setFont("helvetica", "bold"); doc.text("GABARITO OFICIAL", pageWidth / 2, y, { align: "center" }); y += 8;
    doc.setFontSize(12); doc.setFont("helvetica", "normal"); doc.text(activeExam.title, pageWidth / 2, y, { align: "center" }); y += 5;
    doc.setFontSize(9); doc.setTextColor(100); doc.text("DOCUMENTO CONFIDENCIAL - USO EXCLUSIVO DO PROFESSOR", pageWidth / 2, y, { align: "center" }); doc.setTextColor(0); y += 10;
    doc.setDrawColor(150); doc.setLineWidth(0.5); doc.line(margin, y, pageWidth - margin, y); y += 10;
    const colCount = 3;
    const entries = activeQuestions.map((q) => ({ num: q.question_number, answer: q.question_type === "multiple_choice" ? q.correct_answer || "-" : "Dissertativa" }));
    const itemsPerCol = Math.ceil(entries.length / colCount); const colWidth = (pageWidth - 2 * margin) / colCount;
    doc.setFontSize(11);
    for (let col = 0; col < colCount; col++) {
      for (let row = 0; row < itemsPerCol; row++) {
        const idx = col * itemsPerCol + row; if (idx >= entries.length) break;
        const e = entries[idx]; const x = margin + col * colWidth; const rowY = y + row * 8;
        doc.setFont("helvetica", "bold"); doc.text(`Q${e.num}:`, x, rowY); doc.setFont("helvetica", "normal"); doc.text(` ${e.answer}`, x + 12, rowY);
      }
    }
    doc.save(`GABARITO - ${activeExam.title}.pdf`);
  };

  const exportDirectDOCX = async () => {
    if (!activeExam || activeQuestions.length === 0) return;
    if (activeTemplateFile) {
      try {
        const blob = await injectQuestionsIntoDocx(activeTemplateFile, activeQuestions);
        saveAs(blob, `${activeExam.title} - ${activeTemplateFile.name}`);
        return;
      } catch (tmplErr) {
        console.error("Erro ao aplicar modelo:", tmplErr);
        alert("Houve um erro ao aplicar o modelo. Baixando DOCX padrão.");
      }
    }
    const children: Paragraph[] = [
      new Paragraph({ text: activeExam.title, heading: HeadingLevel.HEADING_1, alignment: "center" as unknown as undefined }),
      new Paragraph({ children: [new TextRun({ text: `Disciplina: ${activeExam.subject}`, italics: true, size: 22 })], alignment: "center" as unknown as undefined }),
      new Paragraph({ children: [new TextRun({ text: "Nome: ________________________________  Data: ___/___/______", size: 22 })], spacing: { before: 300, after: 200 } }),
      new Paragraph({ children: [new TextRun({ text: "Turma: __________________  Matricula: __________________", size: 22 })], spacing: { after: 300 } }),
    ];
    for (const q of activeQuestions) {
      children.push(new Paragraph({ children: [new TextRun({ text: `${q.question_number}. `, bold: true, size: 24 }), new TextRun({ text: q.statement, size: 24 })], spacing: { before: 200 } }));
      if (q.question_type === "multiple_choice") {
        for (const alt of q.alternatives) children.push(new Paragraph({ children: [new TextRun({ text: `    (${alt.letter}) ${alt.text}`, size: 22 })], spacing: { before: 60 } }));
      } else {
        for (let i = 0; i < 4; i++) children.push(new Paragraph({ children: [new TextRun({ text: "___________________________________________", size: 22, color: "CCCCCC" })], spacing: { before: 100 } }));
      }
    }
    saveAs(await Packer.toBlob(new Document({ sections: [{ children }] })), `${activeExam.title}.docx`);
  };

  return (
    <>
      {activeExam && !showVersionsModal ? (
        <ExamReview
          exam={activeExam} questions={activeQuestions}
          versions={versions} answerKeys={answerKeys}
          onBack={() => { setActiveExam(null); setActiveQuestions([]); }}
          onQuestionsChange={setActiveQuestions}
          onRegenerateQuestion={(q) => regenerateQuestion(activeExam, q.id, q)}
          onUpdateQuestion={updateQuestion} onDeleteQuestion={deleteQuestion}
          onGenerateVersions={() => setShowGenerateVersions(true)}
          onViewVersions={() => setShowVersionsModal(true)}
          onGenerateQuestions={async () => {
            try { setErrorMessage(null); setActiveQuestions(await generateQuestions(activeExam, genOptions)); }
            catch (err) { alert(`Erro ao gerar questões: ${err instanceof Error ? err.message : "Erro desconhecido"}`); }
          }}
          generating={generating}
          onExportPDF={exportDirectPDF} onExportDOCX={exportDirectDOCX} onExportAnswerKey={exportDirectAnswerKeyPDF}
          onOpenEditor={() => navigate(`/dashboard/editor/${activeExam.id}`)}
        />
      ) : !showVersionsModal ? (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Gerador de Provas com IA</h1>
              <p className="text-gray-600">Crie provas, gere versões embaralhadas e exporte em PDF/DOCX</p>
            </div>
            <div className="flex space-x-2">
              <button onClick={() => setShowQRScanner(true)} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 flex items-center space-x-2">
                <Camera className="w-4 h-4" /><span>Ler QR Code</span>
              </button>
              {/* ── Botão com verificação de limite ── */}
              <button
                onClick={handleNovaProva}
                className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-2 rounded-lg hover:from-blue-700 hover:to-blue-800 flex items-center space-x-2"
              >
                <Plus className="w-4 h-4" /><span>Nova Prova</span>
              </button>
            </div>
          </div>

          {errorMessage && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-red-800">{errorMessage}</p>
                <p className="text-xs text-red-600 mt-1">Clique em "Revisar" para tentar gerar novamente.</p>
              </div>
              <button onClick={() => setErrorMessage(null)} className="text-red-400 hover:text-red-600 ml-4"><X className="w-4 h-4" /></button>
            </div>
          )}

          {exams.length === 0 ? (
            <div className="text-center py-16">
              <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhuma prova criada</h3>
              <p className="text-gray-500 mb-4">Crie sua primeira prova com IA para começar</p>
              {/* ── Botão estado vazio com verificação de limite ── */}
              <button
                onClick={handleNovaProva}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
              >
                Criar Primeira Prova
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {exams.map((exam) => (
                <div key={exam.id} className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="text-lg font-semibold text-gray-900 flex-1 pr-2">{exam.title}</h3>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${statusColors[exam.status]}`}>{statusLabels[exam.status]}</span>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">{exam.subject}</p>
                  <div className="flex flex-wrap gap-2 mb-4">
                    <span className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded">{exam.question_count} questões</span>
                    <span className="text-xs bg-purple-50 text-purple-700 px-2 py-1 rounded">
                      {exam.question_type === "mixed" && exam.mixed_mc_count && exam.mixed_essay_count
                        ? `Mista (${exam.mixed_mc_count} ME + ${exam.mixed_essay_count} Dissert.)`
                        : typeLabels[exam.question_type]}
                    </span>
                    <span className="text-xs bg-orange-50 text-orange-700 px-2 py-1 rounded">{difficultyLabels[exam.difficulty]}</span>
                  </div>
                  <div className="flex space-x-2">
                    <button onClick={() => handleOpenExam(exam)} disabled={loadingExam} className="flex-1 bg-blue-50 text-blue-700 px-3 py-2 rounded-lg hover:bg-blue-100 flex items-center justify-center text-sm font-medium">
                      <Eye className="w-4 h-4 mr-1" />Revisar
                    </button>
                    {exam.status === "finalized" && (
                      <button onClick={() => handleViewVersions(exam)} disabled={loadingExam} className="bg-purple-50 text-purple-700 px-3 py-2 rounded-lg hover:bg-purple-100 flex items-center justify-center text-sm">
                        <Copy className="w-4 h-4" />
                      </button>
                    )}
                    <button onClick={() => handleDeleteExam(exam.id, exam.title)} className="bg-red-50 text-red-700 px-3 py-2 rounded-lg hover:bg-red-100 flex items-center justify-center text-sm">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : null}

      {showCreateForm && <CreateExamForm onSubmit={handleCreateExam} onCancel={() => setShowCreateForm(false)} />}
      {showGenerateVersions && <GenerateVersionsModal onGenerate={handleGenerateVersions} onCancel={() => setShowGenerateVersions(false)} />}
      {showVersionsModal && activeExam && (
        <VersionsModal exam={activeExam} questions={activeQuestions} versions={versions} answerKeys={answerKeys}
          onClose={() => { setShowVersionsModal(false); setActiveExam(null); setActiveQuestions([]); }} />
      )}
      {showQRScanner && <QRScannerModal onClose={() => setShowQRScanner(false)} />}

      {(loadingExam || generating) && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-40">
          <div className="bg-white rounded-xl p-8 text-center shadow-xl w-80">
            <Loader2 className="w-10 h-10 text-blue-600 animate-spin mx-auto mb-3" />
            <p className="font-medium text-gray-900">{generating ? "Gerando questões com IA..." : "Carregando..."}</p>
            <p className="text-sm text-gray-500 mt-1">{generating ? "Isso pode levar alguns segundos" : "Aguarde"}</p>
            {generating && (
              <div className="mt-4">
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full animate-[progress_3s_ease-in-out_infinite]" style={{ width: "70%" }} />
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default ExamGenerator;
