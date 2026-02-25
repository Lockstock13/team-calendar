import { useState, useEffect, useRef, memo } from "react";
import dynamic from "next/dynamic";
import {
  Pin,
  PinOff,
  Pencil,
  Trash2,
  X,
  FileText,
  Maximize2,
  Check,
} from "lucide-react";
import { CAT_STYLE } from "./NoteConstants";
import { Avatar, CategoryPills, MdToolbar } from "./NoteComponents";
import { useConfirm } from "../ConfirmProvider";

const MarkdownRenderer = dynamic(() => import("./MarkdownRenderer"), {
  loading: () => <div className="animate-pulse bg-muted/20 h-20 rounded-xl" />,
  ssr: false,
});

function MarkdownNoteCard({
  note,
  currentUser,
  users,
  onUpdate,
  onDelete,
  lang,
  categories,
}) {
  const { confirm } = useConfirm();
  const [editing, setEditing] = useState(false);
  const [preview, setPreview] = useState(false);
  const [title, setTitle] = useState(note.title);
  const [content, setContent] = useState(note.content || "");
  const [category, setCategory] = useState(note.category || "umum");
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const textRef = useRef(null);

  const author = users.find((u) => u.id === note.created_by);
  const isMe = currentUser?.id === note.created_by;
  const isAdmin = currentUser?.role === "admin";
  const canEdit = isMe || isAdmin;
  const catObj =
    categories.find((c) => c.id === note.category) || categories[1];

  const save = async () => {
    if (!title.trim()) return;
    setSaving(true);
    await onUpdate(note.id, {
      title,
      content,
      category,
      updated_by: currentUser.id,
    });
    setSaving(false);
    setEditing(false);
    setPreview(false);
  };

  const cancel = () => {
    setTitle(note.title);
    setContent(note.content || "");
    setCategory(note.category || "umum");
    setEditing(false);
    setPreview(false);
  };

  const togglePin = () =>
    onUpdate(note.id, { pinned: !note.pinned, updated_by: currentUser.id });

  useEffect(() => {
    if (editing && !preview && textRef.current) textRef.current.focus();
  }, [editing, preview]);

  // Handle auto-focus for focus mode
  const focusRef = useRef(null);
  useEffect(() => {
    if (expanded && focusRef.current) focusRef.current.focus();
  }, [expanded]);

  return (
    <>
      <div
        className={`bg-white/95 border rounded-2xl overflow-hidden flex flex-col transition-shadow hover:shadow-sm ${note.pinned ? "border-primary/40 ring-1 ring-primary/10" : ""}`}
      >
        <div className="h-0.5 bg-blue-400" />
        <div className="p-4 flex flex-col gap-3 flex-1">
          {/* Header */}
          <div className="flex items-start justify-between gap-2">
            {editing ? (
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="flex-1 text-sm font-semibold bg-transparent border-b border-primary/40 focus:outline-none pb-0.5"
                placeholder="Judul catatan"
              />
            ) : (
              <div className="flex items-center gap-2 flex-1 min-w-0">
                {note.pinned && (
                  <Pin className="w-3 h-3 text-primary flex-shrink-0" />
                )}
                <h3 className="text-[13px] font-semibold text-zinc-900 truncate">
                  {note.title}
                </h3>
              </div>
            )}
            <div className="flex items-center gap-1 flex-shrink-0">
              {editing ? (
                <>
                  <button
                    type="button"
                    onClick={() => setPreview((v) => !v)}
                    className={`px-2 py-1 text-xs rounded-lg font-medium transition-colors ${preview ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}
                  >
                    {preview ? "Edit" : "Preview"}
                  </button>
                  <button
                    type="button"
                    onClick={save}
                    disabled={saving || !title.trim()}
                    className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg disabled:opacity-40"
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={cancel}
                    className="p-1.5 text-muted-foreground hover:bg-muted rounded-lg"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </>
              ) : (
                canEdit && (
                  <>
                    <button
                      onClick={() => setExpanded(true)}
                      className="p-1.5 text-muted-foreground hover:bg-muted rounded-lg"
                      title="Buka penuh"
                    >
                      <Maximize2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={togglePin}
                      className="p-1.5 text-muted-foreground hover:bg-muted rounded-lg"
                      title={note.pinned ? "Unpin" : "Pin"}
                    >
                      {note.pinned ? (
                        <PinOff className="w-3.5 h-3.5" />
                      ) : (
                        <Pin className="w-3.5 h-3.5" />
                      )}
                    </button>
                    <button
                      onClick={() => setEditing(true)}
                      className="p-1.5 text-muted-foreground hover:bg-muted rounded-lg"
                      title="Edit"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onDelete(note.id)}
                      className="p-1.5 text-muted-foreground hover:bg-red-50 hover:text-red-500 rounded-lg"
                      title="Hapus"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </>
                )
              )}
            </div>
          </div>

          {editing && (
            <CategoryPills
              value={category}
              onChange={setCategory}
              categories={categories}
            />
          )}

          {/* Content Preview */}
          {editing ? (
            preview ? (
              <div className="prose prose-sm max-w-none min-h-[100px] px-3 py-2 bg-muted/20 border rounded-xl overflow-auto">
                <MarkdownRenderer
                  content={
                    content ||
                    (lang === "id"
                      ? "*Preview kosong...*"
                      : "*Preview empty...*")
                  }
                />
              </div>
            ) : (
              <div className="border rounded-xl overflow-hidden">
                <MdToolbar
                  textareaRef={textRef}
                  value={content}
                  onChange={setContent}
                />
                <textarea
                  ref={textRef}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full text-sm bg-background px-3 py-2 focus:outline-none resize-none leading-relaxed font-mono"
                  rows={6}
                  placeholder={
                    lang === "id"
                      ? "Tulis dengan Markdown..."
                      : "Write with Markdown..."
                  }
                />
              </div>
            )
          ) : (
            <div className="prose prose-sm max-w-none text-[13px] line-clamp-[8] overflow-hidden">
              <MarkdownRenderer content={note.content || ""} />
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between pt-2 border-t mt-auto">
            <div className="flex items-center gap-1.5">
              {author && <Avatar user={author} />}
              <span className="text-[10px] text-muted-foreground font-medium truncate max-w-[80px]">
                {author?.full_name || author?.email || "—"}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] bg-blue-50 text-blue-600 border border-blue-200 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                <FileText className="w-2.5 h-2.5" /> MD
              </span>
              {!editing && (
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full border font-bold ${CAT_STYLE[note.category] || CAT_STYLE.lainnya}`}
                >
                  {catObj?.label}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Focus Mode Modal (Enhanced RTF Experience) */}
      {expanded && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center p-4 md:p-8"
          onClick={async () => {
            if (!editing) {
              setExpanded(false);
              return;
            }
            const ok = await confirm({
              title: lang === "id" ? "Batalkan?" : "Discard?",
              message:
                lang === "id"
                  ? "Perubahan belum disimpan. Batalkan?"
                  : "Changes are not saved. Discard anyway?",
              confirmText: lang === "id" ? "Ya, Batal" : "Yes, Discard",
              cancelText: lang === "id" ? "Lanjut Edit" : "Keep Editing",
            });
            if (ok) {
              setExpanded(false);
              setEditing(false);
            }
          }}
        >
          <div
            className="bg-background rounded-3xl border shadow-2xl w-full max-w-5xl h-full max-h-[90vh] flex flex-col overflow-hidden animate-fade-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="h-1.5 bg-blue-500" />

            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b bg-muted/5">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="p-2 bg-blue-100 rounded-xl">
                  <FileText className="w-5 h-5 text-blue-600" />
                </div>
                {editing ? (
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="text-xl font-bold bg-transparent focus:outline-none w-full border-b-2 border-primary/20"
                    placeholder="Judul Catatan..."
                  />
                ) : (
                  <h2 className="text-xl font-bold truncate">{note.title}</h2>
                )}
              </div>
              <div className="flex items-center gap-2">
                {editing ? (
                  <button
                    onClick={save}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-200"
                  >
                    <Check className="w-4 h-4" />{" "}
                    {lang === "id" ? "Simpan" : "Save"}
                  </button>
                ) : (
                  canEdit && (
                    <button
                      onClick={() => setEditing(true)}
                      className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-bold hover:opacity-90 transition-opacity"
                    >
                      <Pencil className="w-4 h-4" />{" "}
                      {lang === "id" ? "Edit Catatan" : "Edit Note"}
                    </button>
                  )
                )}
                <button
                  onClick={() => setExpanded(false)}
                  className="p-2 hover:bg-muted rounded-xl transition-colors"
                >
                  <X className="w-6 h-6 text-muted-foreground" />
                </button>
              </div>
            </div>

            {/* Modal Body (Focus Mode with Side-by-Side Preview if editing) */}
            <div className="flex-1 overflow-hidden flex flex-col md:flex-row divide-x">
              {editing ? (
                <>
                  {/* Editor Side */}
                  <div className="flex-1 flex flex-col">
                    <div className="p-2 bg-muted/20 border-b flex items-center justify-between">
                      <MdToolbar
                        textareaRef={focusRef}
                        value={content}
                        onChange={setContent}
                      />
                      <span className="text-[10px] font-bold text-muted-foreground px-3">
                        EDITOR
                      </span>
                    </div>
                    <textarea
                      ref={focusRef}
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      className="flex-1 w-full p-6 text-base bg-transparent focus:outline-none resize-none leading-relaxed font-mono"
                      placeholder={
                        lang === "id"
                          ? "Tulis isi catatan di sini..."
                          : "Write content here..."
                      }
                    />
                  </div>
                  {/* Preview Side (Hidden on mobile if needed, but here visible) */}
                  <div className="flex-1 flex flex-col bg-muted/5 overflow-y-auto">
                    <div className="p-2 border-b flex justify-end">
                      <span className="text-[10px] font-bold text-muted-foreground px-3">
                        PREVIEW
                      </span>
                    </div>
                    <div className="p-8 prose prose-lg max-w-none">
                      <MarkdownRenderer
                        content={content || "*Catatan kosong...*"}
                      />
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex-x overflow-y-auto w-full">
                  <div className="max-w-3xl mx-auto p-10 prose prose-lg">
                    <MarkdownRenderer
                      content={note.content || "*Catatan kosong.*"}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t bg-muted/5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {author && <Avatar user={author} />}
                <div>
                  <p className="text-xs font-bold">
                    {author?.full_name || author?.email}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {lang === "id" ? "Dibuat pada: " : "Created at: "}
                    {new Date(note.created_at).toLocaleString("id-ID")}
                  </p>
                </div>
              </div>
              <CategoryPills
                value={category}
                onChange={setCategory}
                categories={categories}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default memo(MarkdownNoteCard);
