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
import { CategoryPills, MdToolbar } from "./NoteComponents";
import Avatar from "@/app/components/Avatar";
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
  const [focusTab, setFocusTab] = useState("editor"); // mobile tab: 'editor' | 'preview'
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
        className={`bg-background/95 border rounded-2xl overflow-hidden flex flex-col transition-shadow hover:shadow-sm ${note.pinned ? "border-primary/40 ring-1 ring-primary/10" : ""}`}
      >
        <div className="h-0.5 bg-blue-400 dark:bg-blue-600" />
        <div className="p-3 flex flex-col gap-2 flex-1">
          {/* Header — title only */}
          <div className="flex items-start gap-2">
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
                <h3 className="text-[13px] font-semibold text-foreground truncate">
                  {note.title}
                </h3>
              </div>
            )}
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
                  content={content || (lang === "id" ? "*Preview kosong...*" : "*Preview empty...*")}
                />
              </div>
            ) : (
              <div className="border rounded-xl overflow-hidden">
                <MdToolbar textareaRef={textRef} value={content} onChange={setContent} />
                <textarea
                  ref={textRef}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full text-sm bg-background px-3 py-2 focus:outline-none resize-none leading-relaxed font-mono"
                  rows={6}
                  placeholder={lang === "id" ? "Tulis dengan Markdown..." : "Write with Markdown..."}
                />
              </div>
            )
          ) : (
            <div className="prose prose-sm max-w-none text-[13px] line-clamp-4 overflow-hidden mb-1">
              <MarkdownRenderer content={note.content || ""} />
            </div>
          )}

          {/* Meta info — author + badges */}
          <div className="flex items-center justify-between pt-2 border-t mt-auto">
            <div className="flex items-center gap-1.5">
              {author && <Avatar user={author} />}
              <span className="text-[10px] text-muted-foreground font-medium truncate max-w-[80px]">
                {author?.full_name || author?.email || "—"}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] bg-blue-50 text-blue-600 border border-blue-200 dark:bg-blue-950/30 dark:text-blue-300 dark:border-blue-800 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                <FileText className="w-2.5 h-2.5" /> MD
              </span>
              {!editing && (
                <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold ${CAT_STYLE[note.category] || CAT_STYLE.lainnya}`}>
                  {catObj?.label}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Action footer — full-width, big tap targets */}
        {editing ? (
          <div className="flex border-t border-border/60 divide-x divide-border/60">
            <button
              type="button"
              onClick={() => setPreview((v) => !v)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold transition-colors active:scale-95 ${preview ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted/60"
                }`}
            >
              {preview ? "Edit" : "Preview"}
            </button>
            <button
              type="button"
              onClick={save}
              disabled={saving || !title.trim()}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors active:scale-95 disabled:opacity-40"
            >
              <Check className="w-3.5 h-3.5" />
              {lang === "id" ? "Simpan" : "Save"}
            </button>
            <button
              type="button"
              onClick={cancel}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold text-muted-foreground hover:bg-muted/60 transition-colors active:scale-95"
            >
              <X className="w-3.5 h-3.5" />
              {lang === "id" ? "Batal" : "Cancel"}
            </button>
          </div>
        ) : (
          canEdit && (
            <div className="flex border-t border-border/60 divide-x divide-border/60">
              <button
                onClick={() => setExpanded(true)}
                className="flex-1 flex items-center justify-center gap-1 py-2.5 text-xs font-medium text-muted-foreground hover:bg-muted/60 transition-colors active:scale-95"
                title="Buka penuh"
              >
                <Maximize2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{lang === "id" ? "Baca" : "Read"}</span>
              </button>
              <button
                onClick={togglePin}
                className={`flex-1 flex items-center justify-center gap-1 py-2.5 text-xs font-medium transition-colors active:scale-95 ${note.pinned ? "text-primary hover:bg-primary/10" : "text-muted-foreground hover:bg-muted/60"
                  }`}
                title={note.pinned ? "Unpin" : "Pin"}
              >
                {note.pinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
                <span className="hidden sm:inline">{note.pinned ? "Unpin" : "Pin"}</span>
              </button>
              <button
                onClick={() => setEditing(true)}
                className="flex-1 flex items-center justify-center gap-1 py-2.5 text-xs font-medium text-muted-foreground hover:bg-muted/60 transition-colors active:scale-95"
                title="Edit"
              >
                <Pencil className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Edit</span>
              </button>
              <button
                onClick={() => onDelete(note.id)}
                className="flex-1 flex items-center justify-center gap-1 py-2.5 text-xs font-medium text-muted-foreground hover:bg-red-50 dark:hover:bg-red-950/20 hover:text-red-500 transition-colors active:scale-95"
                title="Hapus"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{lang === "id" ? "Hapus" : "Delete"}</span>
              </button>
            </div>
          )
        )}
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
            <div className="h-1.5 bg-blue-500 dark:bg-blue-600" />

            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b bg-muted/5">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
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
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-200 dark:shadow-none"
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

            {/* Modal Body */}
            <div className="flex-1 overflow-hidden flex flex-col">
              {editing ? (
                <>
                  {/* Mobile: Tab bar (Editor / Preview) */}
                  <div className="flex md:hidden border-b">
                    <button
                      onClick={() => setFocusTab("editor")}
                      className={`flex-1 py-2.5 text-xs font-bold transition-colors ${focusTab === "editor"
                        ? "border-b-2 border-primary text-primary"
                        : "text-muted-foreground"
                        }`}
                    >
                      EDITOR
                    </button>
                    <button
                      onClick={() => setFocusTab("preview")}
                      className={`flex-1 py-2.5 text-xs font-bold transition-colors ${focusTab === "preview"
                        ? "border-b-2 border-primary text-primary"
                        : "text-muted-foreground"
                        }`}
                    >
                      PREVIEW
                    </button>
                  </div>

                  {/* Mobile: Single pane based on active tab */}
                  <div className="flex md:hidden flex-1 overflow-hidden flex-col">
                    {focusTab === "editor" ? (
                      <>
                        <div className="bg-muted/20 border-b">
                          <MdToolbar
                            textareaRef={focusRef}
                            value={content}
                            onChange={setContent}
                          />
                        </div>
                        <textarea
                          ref={focusRef}
                          value={content}
                          onChange={(e) => setContent(e.target.value)}
                          className="flex-1 w-full p-4 text-base bg-transparent focus:outline-none resize-none leading-relaxed font-mono"
                          placeholder={lang === "id" ? "Tulis isi catatan di sini..." : "Write content here..."}
                        />
                      </>
                    ) : (
                      <div className="flex-1 overflow-y-auto p-5 prose prose-sm max-w-none">
                        <MarkdownRenderer content={content || "*Preview kosong...*"} />
                      </div>
                    )}
                  </div>

                  {/* Desktop: Side-by-side */}
                  <div className="hidden md:flex flex-1 overflow-hidden divide-x">
                    <div className="flex-1 flex flex-col">
                      <div className="p-2 bg-muted/20 border-b flex items-center justify-between">
                        <MdToolbar textareaRef={focusRef} value={content} onChange={setContent} />
                        <span className="text-[10px] font-bold text-muted-foreground px-3">EDITOR</span>
                      </div>
                      <textarea
                        ref={focusRef}
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        className="flex-1 w-full p-6 text-base bg-transparent focus:outline-none resize-none leading-relaxed font-mono"
                        placeholder={lang === "id" ? "Tulis isi catatan di sini..." : "Write content here..."}
                      />
                    </div>
                    <div className="flex-1 flex flex-col bg-muted/5 overflow-y-auto">
                      <div className="p-2 border-b flex justify-end">
                        <span className="text-[10px] font-bold text-muted-foreground px-3">PREVIEW</span>
                      </div>
                      <div className="p-8 prose prose-lg max-w-none">
                        <MarkdownRenderer content={content || "*Catatan kosong...*"} />
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex-1 overflow-y-auto w-full">
                  <div className="max-w-3xl mx-auto p-6 sm:p-10 prose prose-sm sm:prose-lg">
                    <MarkdownRenderer content={note.content || "*Catatan kosong.*"} />
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
