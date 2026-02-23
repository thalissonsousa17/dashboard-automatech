import React, { useState } from "react";
import {
  HelpCircle,
  BookOpen,
  Video,
  Plus,
  Pencil,
  Trash2,
  Eye,
  EyeOff,
  ExternalLink,
  RefreshCw,
  X,
  Save,
  Youtube,
  Link,
} from "lucide-react";
import { useHelpItems, HelpItem, extractVideoId } from "../hooks/useHelpItems";

// ── Tipos dos formulários ──────────────────────────────────────────────────────
type FormMode = "doc" | "video";

interface FormState {
  title: string;
  url: string;      // para doc
  videoUrl: string; // para video (URL ou ID direto)
}

const EMPTY_FORM: FormState = { title: "", url: "", videoUrl: "" };

// ── Modal de formulário ───────────────────────────────────────────────────────
interface ItemFormModalProps {
  mode: FormMode;
  initial?: FormState;
  editingId?: string;
  onClose: () => void;
  onSave: (values: FormState, id?: string) => Promise<void>;
}

const ItemFormModal: React.FC<ItemFormModalProps> = ({
  mode,
  initial = EMPTY_FORM,
  editingId,
  onClose,
  onSave,
}) => {
  const [form, setForm] = useState<FormState>(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const set = (field: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSave = async () => {
    setError("");
    if (!form.title.trim()) { setError("Informe o título."); return; }
    if (mode === "doc" && !form.url.trim()) { setError("Informe a URL da documentação."); return; }
    if (mode === "video" && !form.videoUrl.trim()) { setError("Informe a URL ou ID do vídeo."); return; }

    setSaving(true);
    await onSave(form, editingId);
    setSaving(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            {mode === "doc" ? (
              <BookOpen className="w-4 h-4 text-blue-600" />
            ) : (
              <Youtube className="w-4 h-4 text-red-600" />
            )}
            <h3 className="font-semibold text-gray-900">
              {editingId ? "Editar" : "Adicionar"}{" "}
              {mode === "doc" ? "Documentação" : "Vídeo"}
            </h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-4">
          {/* Título */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">
              Título
            </label>
            <input
              type="text"
              value={form.title}
              onChange={set("title")}
              placeholder={mode === "doc" ? "Ex: Como usar o Gerador de Provas" : "Ex: Gerando sua primeira prova com IA"}
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50 focus:bg-white transition-all"
            />
          </div>

          {/* URL / VideoId */}
          {mode === "doc" ? (
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                URL da Documentação
              </label>
              <div className="relative">
                <Link className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                <input
                  type="url"
                  value={form.url}
                  onChange={set("url")}
                  placeholder="https://docs.seusite.com/artigo"
                  className="w-full pl-9 pr-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50 focus:bg-white transition-all"
                />
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                URL ou ID do YouTube
              </label>
              <div className="relative">
                <Youtube className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-red-400" />
                <input
                  type="text"
                  value={form.videoUrl}
                  onChange={set("videoUrl")}
                  placeholder="https://youtube.com/watch?v=... ou dQw4w9WgXcQ"
                  className="w-full pl-9 pr-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50 focus:bg-white transition-all"
                />
              </div>
              {form.videoUrl.trim() && (
                <p className="text-xs text-gray-400 mt-1">
                  ID extraído:{" "}
                  <span className="font-mono text-gray-600">
                    {extractVideoId(form.videoUrl)}
                  </span>
                </p>
              )}
            </div>
          )}

          {error && (
            <p className="text-xs text-red-600 font-medium">{error}</p>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-5 py-4 border-t border-gray-100">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            {saving ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Linha de item ─────────────────────────────────────────────────────────────
interface ItemRowProps {
  item: HelpItem;
  onEdit: (item: HelpItem) => void;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
}

const ItemRow: React.FC<ItemRowProps> = ({ item, onEdit, onToggle, onDelete }) => {
  const isDoc = item.type === "doc";

  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all ${
        item.active
          ? "bg-white border-gray-200"
          : "bg-gray-50 border-gray-100 opacity-60"
      }`}
    >
      {/* Ícone */}
      <div
        className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
          isDoc ? "bg-blue-50" : "bg-red-50"
        }`}
      >
        {isDoc ? (
          <BookOpen className="w-4 h-4 text-blue-600" />
        ) : (
          <Youtube className="w-4 h-4 text-red-600" />
        )}
      </div>

      {/* Título + meta */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">{item.title}</p>
        <p className="text-xs text-gray-400 truncate font-mono">
          {isDoc ? item.url : `youtube.com/watch?v=${item.video_id}`}
        </p>
      </div>

      {/* Badge ativo/inativo */}
      <span
        className={`hidden sm:inline-flex text-[10px] font-semibold px-2 py-0.5 rounded-full ${
          item.active
            ? "bg-green-100 text-green-700"
            : "bg-gray-100 text-gray-500"
        }`}
      >
        {item.active ? "Ativo" : "Inativo"}
      </span>

      {/* Ações */}
      <div className="flex items-center gap-1 flex-shrink-0">
        {/* Preview / Link externo */}
        {isDoc && item.url && item.url !== "#" ? (
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
            title="Abrir link"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        ) : !isDoc && item.video_id ? (
          <a
            href={`https://www.youtube.com/watch?v=${item.video_id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
            title="Ver no YouTube"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        ) : null}

        {/* Toggle ativo */}
        <button
          onClick={() => onToggle(item.id)}
          className={`p-1.5 rounded-lg transition-colors ${
            item.active
              ? "text-green-500 hover:bg-green-50"
              : "text-gray-400 hover:bg-gray-100"
          }`}
          title={item.active ? "Desativar" : "Ativar"}
        >
          {item.active ? (
            <Eye className="w-3.5 h-3.5" />
          ) : (
            <EyeOff className="w-3.5 h-3.5" />
          )}
        </button>

        {/* Editar */}
        <button
          onClick={() => onEdit(item)}
          className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
          title="Editar"
        >
          <Pencil className="w-3.5 h-3.5" />
        </button>

        {/* Deletar */}
        <button
          onClick={() => onDelete(item.id)}
          className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
          title="Excluir"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};

// ── Página principal ──────────────────────────────────────────────────────────
const AdminAjuda: React.FC = () => {
  const {
    docs,
    videos,
    loading,
    fetchItems,
    createItem,
    updateItem,
    toggleActive,
    deleteItem,
  } = useHelpItems();

  const [modal, setModal] = useState<{
    open: boolean;
    mode: FormMode;
    item?: HelpItem;
  }>({ open: false, mode: "doc" });

  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const openAdd = (mode: FormMode) => setModal({ open: true, mode });
  const openEdit = (item: HelpItem) =>
    setModal({ open: true, mode: item.type, item });
  const closeModal = () => setModal({ open: false, mode: "doc" });

  const handleSave = async (values: FormState, id?: string) => {
    if (id) {
      // Editar
      const patch: Record<string, string> = { title: values.title };
      if (modal.mode === "doc") patch.url = values.url;
      if (modal.mode === "video") patch.video_id = extractVideoId(values.videoUrl);
      await updateItem(id, patch as any);
    } else {
      // Criar
      if (modal.mode === "doc") {
        await createItem({ type: "doc", title: values.title, url: values.url });
      } else {
        await createItem({
          type: "video",
          title: values.title,
          video_id: extractVideoId(values.videoUrl),
        });
      }
    }
  };

  const handleDelete = async (id: string) => {
    await deleteItem(id);
    setConfirmDelete(null);
  };

  // Constrói o FormState inicial para edição
  const getInitialForm = (item: HelpItem): FormState => ({
    title: item.title,
    url: item.url || "",
    videoUrl: item.video_id || "",
  });

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <HelpCircle className="w-6 h-6 text-amber-500" />
            Gerenciar Ajuda
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Gerencie a documentação e os tutoriais em vídeo exibidos no botão de ajuda (?) dos professores.
          </p>
        </div>
        <button
          onClick={fetchItems}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Atualizar
        </button>
      </div>

      {/* ── Seção Documentação ── */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-blue-600" />
            <h2 className="font-semibold text-gray-800">Documentação</h2>
            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
              {docs.length}
            </span>
          </div>
          <button
            onClick={() => openAdd("doc")}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Adicionar link
          </button>
        </div>

        {loading ? (
          <div className="py-10 text-center">
            <div className="animate-spin w-6 h-6 border-b-2 border-blue-600 rounded-full mx-auto" />
          </div>
        ) : docs.length === 0 ? (
          <div className="py-10 text-center border-2 border-dashed border-gray-200 rounded-xl text-gray-400 text-sm">
            Nenhum link de documentação cadastrado ainda.
          </div>
        ) : (
          <div className="space-y-2">
            {docs.map((item) => (
              <ItemRow
                key={item.id}
                item={item}
                onEdit={openEdit}
                onToggle={toggleActive}
                onDelete={(id) => setConfirmDelete(id)}
              />
            ))}
          </div>
        )}
      </section>

      {/* Divisor */}
      <div className="border-t border-gray-100" />

      {/* ── Seção Vídeos ── */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Video className="w-4 h-4 text-red-600" />
            <h2 className="font-semibold text-gray-800">Tutoriais em Vídeo</h2>
            <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">
              {videos.length}
            </span>
          </div>
          <button
            onClick={() => openAdd("video")}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Adicionar vídeo
          </button>
        </div>

        {loading ? (
          <div className="py-10 text-center">
            <div className="animate-spin w-6 h-6 border-b-2 border-red-600 rounded-full mx-auto" />
          </div>
        ) : videos.length === 0 ? (
          <div className="py-10 text-center border-2 border-dashed border-gray-200 rounded-xl text-gray-400 text-sm">
            Nenhum vídeo cadastrado ainda.
          </div>
        ) : (
          <div className="space-y-2">
            {videos.map((item) => (
              <ItemRow
                key={item.id}
                item={item}
                onEdit={openEdit}
                onToggle={toggleActive}
                onDelete={(id) => setConfirmDelete(id)}
              />
            ))}
          </div>
        )}
      </section>

      {/* Preview info */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-start gap-3">
        <HelpCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-amber-800">Como funciona?</p>
          <p className="text-xs text-amber-700 mt-0.5 leading-relaxed">
            Os itens ativos aparecem automaticamente no botão de Ajuda <strong>(?)</strong> do Header para todos os professores.
            Itens inativos ficam ocultos mas não são deletados. Apenas links e vídeos com status "Ativo" são exibidos.
          </p>
        </div>
      </div>

      {/* Modal de formulário */}
      {modal.open && (
        <ItemFormModal
          mode={modal.mode}
          initial={modal.item ? getInitialForm(modal.item) : EMPTY_FORM}
          editingId={modal.item?.id}
          onClose={closeModal}
          onSave={handleSave}
        />
      )}

      {/* Confirmar exclusão */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <h3 className="font-semibold text-gray-900 mb-2">Excluir item?</h3>
            <p className="text-sm text-gray-500 mb-5">
              Esta ação não pode ser desfeita. O item será removido permanentemente.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setConfirmDelete(null)}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDelete(confirmDelete)}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminAjuda;
