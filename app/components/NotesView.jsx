"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import ConfirmDialog from "@/app/components/ConfirmDialog";
import AppToast from "@/app/components/AppToast";
import {
  Pin,
  PinOff,
  Pencil,
  Trash2,
  Plus,
  Check,
  X,
  Table,
  FileText,
  Maximize2,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

// ─── Constants ─────────────────────────────────────────────────────────────────

const CATEGORIES = [
  { id: "all", label: "Semua", emoji: "" },
  { id: "umum", label: "Umum", emoji: "🗒️" },
  { id: "keuangan", label: "Keuangan", emoji: "💰" },
  { id: "password", label: "Password", emoji: "🔐" },
  { id: "lainnya", label: "Lainnya", emoji: "📋" },
];

const CAT_STYLE = {
  umum: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/15 dark:text-blue-400 dark:border-blue-800",
  keuangan:
    "bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-500/15 dark:text-yellow-400 dark:border-yellow-800",
  password:
    "bg-red-50 text-red-600 border-red-200 dark:bg-red-500/15 dark:text-red-400 dark:border-red-800",
  lainnya:
    "bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-500/15 dark:text-slate-400 dark:border-slate-700",
};

// ─── Helpers ───────────────────────────────────────────────────────────────────

function Avatar({ user }) {
  return (
    <div
      className="w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
      style={{ backgroundColor: user?.color || "#64748b" }}
      title={user?.full_name || user?.email}
    >
      {(user?.full_name || user?.email || "?").charAt(0).toUpperCase()}
    </div>
  );
}

function parseTableContent(raw) {
  try {
    const parsed = JSON.parse(raw || "{}");
    if (parsed.headers && parsed.rows) return parsed;
  } catch {}
  return {
    headers: ["Kolom 1", "Kolom 2", "Kolom 3"],
    rows: [
      ["", "", ""],
      ["", "", ""],
    ],
  };
}

function CategoryPills({ value, onChange }) {
  return (
    <div className="flex gap-1.5 flex-wrap">
      {CATEGORIES.filter((c) => c.id !== "all").map((c) => (
        <button
          key={c.id}
          type="button"
          onClick={() => onChange(c.id)}
          className={`text-xs px-2 py-0.5 rounded-full border font-medium transition-all ${
            value === c.id
              ? CAT_STYLE[c.id]
              : "bg-muted text-muted-foreground border-transparent"
          }`}
        >
          {c.emoji} {c.label}
        </button>
      ))}
    </div>
  );
}

// ─── Markdown Toolbar ──────────────────────────────────────────────────────────

const MD_ACTIONS = [
  { label: "B", wrap: ["**", "**"], title: "Bold" },
  { label: "I", wrap: ["*", "*"], title: "Italic" },
  { label: "~~S~~", wrap: ["~~", "~~"], title: "Strikethrough" },
  { label: "`C`", wrap: ["`", "`"], title: "Inline code" },
  { label: "H1", prefix: "# ", title: "Heading 1" },
  { label: "H2", prefix: "## ", title: "Heading 2" },
  { label: "- ", prefix: "- ", title: "List item" },
  { label: "[ ]", prefix: "- [ ] ", title: "Checkbox" },
  { label: "> ", prefix: "> ", title: "Blockquote" },
];

function MdToolbar({ textareaRef, value, onChange }) {
  const apply = (action) => {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selected = value.slice(start, end);
    let newVal, cursor;
    if (action.wrap) {
      const [before, after] = action.wrap;
      newVal =
        value.slice(0, start) + before + selected + after + value.slice(end);
      cursor = start + before.length + selected.length + after.length;
    } else {
      newVal =
        value.slice(0, start) + action.prefix + selected + value.slice(end);
      cursor = start + action.prefix.length + selected.length;
    }
    onChange(newVal);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(cursor, cursor);
    });
  };

  return (
    <div className="flex gap-0.5 flex-wrap px-1 py-1 border-b bg-muted/30">
      {MD_ACTIONS.map((a) => (
        <button
          key={a.title}
          type="button"
          title={a.title}
          onClick={() => apply(a)}
          className="px-2 py-0.5 text-xs font-mono font-semibold text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors"
        >
          {a.label}
        </button>
      ))}
    </div>
  );
}

// ─── Markdown Note Card ────────────────────────────────────────────────────────

function MarkdownNoteCard({ note, currentUser, users, onUpdate, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [preview, setPreview] = useState(false);
  const [title, setTitle] = useState(note.title);
  const [content, setContent] = useState(note.content || "");
  const [category, setCategory] = useState(note.category || "umum");
  const [saving, setSaving] = useState(false);
  const textRef = useRef(null);

  const author = users.find((u) => u.id === note.created_by);
  const isMe = currentUser?.id === note.created_by;
  const isAdmin = currentUser?.role === "admin";
  const canEdit = isMe || isAdmin;
  const catObj =
    CATEGORIES.find((c) => c.id === note.category) || CATEGORIES[1];

  const [expanded, setExpanded] = useState(false);

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

  return (
    <>
      <div
        className={`bg-background border rounded-2xl overflow-hidden flex flex-col transition-shadow hover:shadow-md ${note.pinned ? "border-primary/40 ring-1 ring-primary/10" : ""}`}
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
                <h3 className="text-sm font-semibold truncate">{note.title}</h3>
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
                    className="p-1.5 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/15 rounded-lg disabled:opacity-40"
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
                      className="p-1.5 text-muted-foreground hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/15 dark:hover:text-red-400 rounded-lg"
                      title="Hapus"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </>
                )
              )}
            </div>
          </div>

          {/* Category (edit only) */}
          {editing && <CategoryPills value={category} onChange={setCategory} />}

          {/* Content */}
          {editing ? (
            preview ? (
              <div className="prose prose-sm max-w-none min-h-[100px] px-3 py-2 bg-muted/20 border rounded-xl overflow-auto">
                {content ? (
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {content}
                  </ReactMarkdown>
                ) : (
                  <p className="text-muted-foreground text-sm italic">
                    Preview kosong...
                  </p>
                )}
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
                    "Tulis dengan Markdown...\n**bold**, *italic*, # Heading, - list, `code`"
                  }
                />
              </div>
            )
          ) : note.content ? (
            <div className="prose prose-sm max-w-none overflow-auto">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {note.content}
              </ReactMarkdown>
            </div>
          ) : null}

          {/* Footer */}
          <div className="flex items-center justify-between pt-1 border-t mt-auto">
            <div className="flex items-center gap-1.5">
              {author && <Avatar user={author} />}
              <span className="text-xs text-muted-foreground">
                {author?.full_name || author?.email || "—"}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs bg-blue-50 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                <FileText className="w-3 h-3" /> MD
              </span>
              {!editing && (
                <span
                  className={`text-xs px-2 py-0.5 rounded-full border font-medium ${CAT_STYLE[note.category] || CAT_STYLE.lainnya}`}
                >
                  {catObj.emoji} {catObj.label}
                </span>
              )}
              <span className="text-xs text-muted-foreground">
                {note.updated_at
                  ? new Date(note.updated_at).toLocaleDateString("id-ID", {
                      day: "numeric",
                      month: "short",
                    })
                  : ""}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Expand Modal */}
      {expanded && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setExpanded(false)}
        >
          <div
            className="bg-background rounded-2xl border shadow-xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="h-0.5 bg-blue-400" />
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <div className="flex items-center gap-2">
                {note.pinned && <Pin className="w-3.5 h-3.5 text-primary" />}
                <h2 className="font-semibold text-base">{note.title}</h2>
              </div>
              <button
                onClick={() => setExpanded(false)}
                className="p-1.5 hover:bg-muted rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-4">
              {note.content ? (
                <div className="prose prose-sm max-w-none">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {note.content}
                  </ReactMarkdown>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic">
                  Catatan kosong.
                </p>
              )}
            </div>
            <div className="px-5 py-3 border-t flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                {author && <Avatar user={author} />}
                <span className="text-xs text-muted-foreground">
                  {author?.full_name || author?.email}
                </span>
              </div>
              <span
                className={`text-xs px-2 py-0.5 rounded-full border font-medium ${CAT_STYLE[note.category] || CAT_STYLE.lainnya}`}
              >
                {catObj.emoji} {catObj.label}
              </span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ─── Table Note Card ───────────────────────────────────────────────────────────

function TableNoteCard({ note, currentUser, users, onUpdate, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(note.title);
  const [category, setCategory] = useState(note.category || "umum");
  const [tableData, setTableData] = useState(() =>
    parseTableContent(note.content),
  );
  const [saving, setSaving] = useState(false);

  const author = users.find((u) => u.id === note.created_by);
  const isMe = currentUser?.id === note.created_by;
  const isAdmin = currentUser?.role === "admin";
  const canEdit = isMe || isAdmin;
  const catObj =
    CATEGORIES.find((c) => c.id === note.category) || CATEGORIES[1];

  const save = async () => {
    if (!title.trim()) return;
    setSaving(true);
    await onUpdate(note.id, {
      title,
      content: JSON.stringify(tableData),
      category,
      updated_by: currentUser.id,
    });
    setSaving(false);
    setEditing(false);
  };

  const cancel = () => {
    setTitle(note.title);
    setCategory(note.category || "umum");
    setTableData(parseTableContent(note.content));
    setEditing(false);
  };

  const togglePin = () =>
    onUpdate(note.id, { pinned: !note.pinned, updated_by: currentUser.id });

  const updateHeader = (i, val) => {
    const h = [...tableData.headers];
    h[i] = val;
    setTableData({ ...tableData, headers: h });
  };

  const updateCell = (r, c, val) => {
    const rows = tableData.rows.map((row) => [...row]);
    rows[r][c] = val;
    setTableData({ ...tableData, rows });
  };

  const addRow = () =>
    setTableData({
      ...tableData,
      rows: [...tableData.rows, tableData.headers.map(() => "")],
    });

  const removeRow = (r) => {
    const rows = tableData.rows.filter((_, i) => i !== r);
    setTableData({
      ...tableData,
      rows: rows.length ? rows : [tableData.headers.map(() => "")],
    });
  };

  const addCol = () =>
    setTableData({
      headers: [...tableData.headers, `Kolom ${tableData.headers.length + 1}`],
      rows: tableData.rows.map((row) => [...row, ""]),
    });

  const removeCol = (c) => {
    if (tableData.headers.length <= 1) return;
    setTableData({
      headers: tableData.headers.filter((_, i) => i !== c),
      rows: tableData.rows.map((row) => row.filter((_, i) => i !== c)),
    });
  };

  const viewData = parseTableContent(note.content);

  return (
    <>
      <div
        className={`bg-background border rounded-2xl overflow-hidden flex flex-col transition-shadow hover:shadow-md ${note.pinned ? "border-primary/40 ring-1 ring-primary/10" : ""}`}
      >
        <div className="h-0.5 bg-emerald-400" />
        <div className="p-4 flex flex-col gap-3 flex-1">
          {/* Header */}
          <div className="flex items-start justify-between gap-2">
            {editing ? (
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="flex-1 text-sm font-semibold bg-transparent border-b border-primary/40 focus:outline-none pb-0.5"
                placeholder="Judul tabel"
              />
            ) : (
              <div className="flex items-center gap-2 flex-1 min-w-0">
                {note.pinned && (
                  <Pin className="w-3 h-3 text-primary flex-shrink-0" />
                )}
                <h3 className="text-sm font-semibold truncate">{note.title}</h3>
              </div>
            )}
            <div className="flex items-center gap-1 flex-shrink-0">
              {editing ? (
                <>
                  <button
                    type="button"
                    onClick={save}
                    disabled={saving || !title.trim()}
                    className="p-1.5 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/15 rounded-lg disabled:opacity-40"
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
                      className="p-1.5 text-muted-foreground hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/15 dark:hover:text-red-400 rounded-lg"
                      title="Hapus"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </>
                )
              )}
            </div>
          </div>

          {/* Category (edit only) */}
          {editing && <CategoryPills value={category} onChange={setCategory} />}

          {/* Table */}
          {editing ? (
            <div className="overflow-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr>
                    {tableData.headers.map((h, c) => (
                      <th
                        key={c}
                        className="border border-border p-0 min-w-[80px]"
                      >
                        <div className="flex items-center">
                          <input
                            value={h}
                            onChange={(e) => updateHeader(c, e.target.value)}
                            className="flex-1 px-2 py-1.5 font-semibold bg-muted/50 focus:outline-none focus:bg-primary/5 w-full min-w-0"
                          />
                          {tableData.headers.length > 1 && (
                            <button
                              onClick={() => removeCol(c)}
                              className="px-1 text-muted-foreground hover:text-red-500 flex-shrink-0"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </th>
                    ))}
                    <th className="border border-border p-0 w-7">
                      <button
                        onClick={addCol}
                        className="w-full h-full px-1 py-1.5 text-muted-foreground hover:text-primary hover:bg-muted/50 font-bold text-sm"
                      >
                        +
                      </button>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {tableData.rows.map((row, r) => (
                    <tr key={r}>
                      {row.map((cell, c) => (
                        <td key={c} className="border border-border p-0">
                          <input
                            value={cell}
                            onChange={(e) => updateCell(r, c, e.target.value)}
                            className="w-full px-2 py-1.5 bg-transparent focus:outline-none focus:bg-primary/5"
                          />
                        </td>
                      ))}
                      <td className="border border-border p-0 w-7">
                        <button
                          onClick={() => removeRow(r)}
                          className="w-full h-full flex items-center justify-center px-1 py-1.5 text-muted-foreground hover:text-red-500"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <button
                onClick={addRow}
                className="mt-1.5 text-xs text-muted-foreground hover:text-primary flex items-center gap-1 transition-colors"
              >
                <Plus className="w-3 h-3" /> Tambah baris
              </button>
            </div>
          ) : (
            <div className="overflow-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr>
                    {viewData.headers.map((h, i) => (
                      <th
                        key={i}
                        className="border border-border px-2 py-1.5 bg-muted/40 font-semibold text-left whitespace-nowrap"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {viewData.rows.map((row, r) => (
                    <tr key={r} className="hover:bg-muted/20 transition-colors">
                      {row.map((cell, c) => (
                        <td
                          key={c}
                          className="border border-border px-2 py-1.5 whitespace-pre-wrap break-words"
                        >
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between pt-1 border-t mt-auto">
            <div className="flex items-center gap-1.5">
              {author && <Avatar user={author} />}
              <span className="text-xs text-muted-foreground">
                {author?.full_name || author?.email || "—"}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                <Table className="w-3 h-3" /> Tabel
              </span>
              {!editing && (
                <span
                  className={`text-xs px-2 py-0.5 rounded-full border font-medium ${CAT_STYLE[note.category] || CAT_STYLE.lainnya}`}
                >
                  {catObj.emoji} {catObj.label}
                </span>
              )}
              <span className="text-xs text-muted-foreground">
                {note.updated_at
                  ? new Date(note.updated_at).toLocaleDateString("id-ID", {
                      day: "numeric",
                      month: "short",
                    })
                  : ""}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Expand Modal */}
      {expanded && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setExpanded(false)}
        >
          <div
            className="bg-background rounded-2xl border shadow-xl w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="h-0.5 bg-emerald-400" />
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <div className="flex items-center gap-2">
                {note.pinned && <Pin className="w-3.5 h-3.5 text-primary" />}
                <h2 className="font-semibold text-base">{note.title}</h2>
              </div>
              <button
                onClick={() => setExpanded(false)}
                className="p-1.5 hover:bg-muted rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-auto px-5 py-4">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr>
                    {viewData.headers.map((h, i) => (
                      <th
                        key={i}
                        className="border border-border px-3 py-2 bg-muted/40 font-semibold text-left whitespace-nowrap"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {viewData.rows.map((row, r) => (
                    <tr key={r} className="hover:bg-muted/20">
                      {row.map((cell, c) => (
                        <td
                          key={c}
                          className="border border-border px-3 py-2 whitespace-pre-wrap break-words"
                        >
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-5 py-3 border-t flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                {author && <Avatar user={author} />}
                <span className="text-xs text-muted-foreground">
                  {author?.full_name || author?.email}
                </span>
              </div>
              <span
                className={`text-xs px-2 py-0.5 rounded-full border font-medium ${CAT_STYLE[note.category] || CAT_STYLE.lainnya}`}
              >
                {catObj.emoji} {catObj.label}
              </span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ─── New Note Form ─────────────────────────────────────────────────────────────

function NewNoteForm({ currentUser, onSave, onCancel }) {
  const [noteType, setNoteType] = useState("regular");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("umum");
  const [preview, setPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [tableData, setTableData] = useState({
    headers: ["Kolom 1", "Kolom 2", "Kolom 3"],
    rows: [
      ["", "", ""],
      ["", "", ""],
    ],
  });
  const textRef = useRef(null);

  const submit = async () => {
    if (!title.trim()) return;
    setSaving(true);
    const rawContent =
      noteType === "table" ? JSON.stringify(tableData) : content;
    await onSave({ title, content: rawContent, category, note_type: noteType });
    setSaving(false);
  };

  const updateHeader = (i, val) => {
    const h = [...tableData.headers];
    h[i] = val;
    setTableData({ ...tableData, headers: h });
  };

  const updateCell = (r, c, val) => {
    const rows = tableData.rows.map((row) => [...row]);
    rows[r][c] = val;
    setTableData({ ...tableData, rows });
  };

  const addRow = () =>
    setTableData({
      ...tableData,
      rows: [...tableData.rows, tableData.headers.map(() => "")],
    });

  const removeRow = (r) => {
    const rows = tableData.rows.filter((_, i) => i !== r);
    setTableData({
      ...tableData,
      rows: rows.length ? rows : [tableData.headers.map(() => "")],
    });
  };

  const addCol = () =>
    setTableData({
      headers: [...tableData.headers, `Kolom ${tableData.headers.length + 1}`],
      rows: tableData.rows.map((row) => [...row, ""]),
    });

  const removeCol = (c) => {
    if (tableData.headers.length <= 1) return;
    setTableData({
      headers: tableData.headers.filter((_, i) => i !== c),
      rows: tableData.rows.map((row) => row.filter((_, i) => i !== c)),
    });
  };

  return (
    <div className="bg-background border-2 border-primary/20 rounded-2xl overflow-hidden">
      {/* Type Selector */}
      <div className="flex border-b">
        <button
          type="button"
          onClick={() => setNoteType("regular")}
          className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors ${
            noteType === "regular"
              ? "bg-blue-50 dark:bg-blue-500/15 text-blue-700 dark:text-blue-400 border-b-2 border-blue-500"
              : "text-muted-foreground hover:bg-muted/50"
          }`}
        >
          <FileText className="w-4 h-4" /> Regular (Markdown)
        </button>
        <button
          type="button"
          onClick={() => setNoteType("table")}
          className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors ${
            noteType === "table"
              ? "bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-b-2 border-emerald-500"
              : "text-muted-foreground hover:bg-muted/50"
          }`}
        >
          <Table className="w-4 h-4" /> Table Note
        </button>
      </div>

      <div className="p-4 space-y-3">
        {/* Title */}
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={noteType === "table" ? "Judul tabel" : "Judul catatan"}
          className="w-full text-sm font-semibold bg-transparent border-b border-primary/40 focus:outline-none pb-1"
          autoFocus
        />

        {/* Category */}
        <CategoryPills value={category} onChange={setCategory} />

        {/* Content: Markdown */}
        {noteType === "regular" && (
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs text-muted-foreground font-medium">
                Markdown support aktif
              </span>
              <button
                type="button"
                onClick={() => setPreview((v) => !v)}
                className={`px-2 py-0.5 text-xs rounded-lg font-medium transition-colors ${
                  preview
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                }`}
              >
                {preview ? "Edit" : "Preview"}
              </button>
            </div>
            {preview ? (
              <div className="prose prose-sm max-w-none min-h-[100px] px-3 py-2 bg-muted/20 border rounded-xl overflow-auto">
                {content ? (
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {content}
                  </ReactMarkdown>
                ) : (
                  <p className="text-muted-foreground text-sm italic">
                    Preview kosong...
                  </p>
                )}
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
                  rows={5}
                  placeholder={
                    "Tulis dengan Markdown...\n**bold**, *italic*, # Heading, - list, `code`"
                  }
                />
              </div>
            )}
          </div>
        )}

        {/* Content: Table */}
        {noteType === "table" && (
          <div className="overflow-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr>
                  {tableData.headers.map((h, c) => (
                    <th
                      key={c}
                      className="border border-border p-0 min-w-[80px]"
                    >
                      <div className="flex items-center">
                        <input
                          value={h}
                          onChange={(e) => updateHeader(c, e.target.value)}
                          className="flex-1 px-2 py-1.5 font-semibold bg-muted/50 focus:outline-none focus:bg-primary/5 w-full min-w-0"
                        />
                        {tableData.headers.length > 1 && (
                          <button
                            onClick={() => removeCol(c)}
                            className="px-1 text-muted-foreground hover:text-red-500 flex-shrink-0"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </th>
                  ))}
                  <th className="border border-border p-0 w-7">
                    <button
                      onClick={addCol}
                      className="w-full h-full px-1 py-1.5 text-muted-foreground hover:text-primary hover:bg-muted/50 font-bold text-sm"
                    >
                      +
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody>
                {tableData.rows.map((row, r) => (
                  <tr key={r}>
                    {row.map((cell, c) => (
                      <td key={c} className="border border-border p-0">
                        <input
                          value={cell}
                          onChange={(e) => updateCell(r, c, e.target.value)}
                          className="w-full px-2 py-1.5 bg-transparent focus:outline-none focus:bg-primary/5"
                        />
                      </td>
                    ))}
                    <td className="border border-border p-0 w-7">
                      <button
                        onClick={() => removeRow(r)}
                        className="w-full h-full flex items-center justify-center px-1 py-1.5 text-muted-foreground hover:text-red-500"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button
              onClick={addRow}
              className="mt-1.5 text-xs text-muted-foreground hover:text-primary flex items-center gap-1 transition-colors"
            >
              <Plus className="w-3 h-3" /> Tambah baris
            </button>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-1 border-t">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-2 border rounded-xl text-sm font-medium hover:bg-muted transition-colors"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={saving || !title.trim()}
            className="flex-1 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {saving ? "Menyimpan..." : "Simpan Catatan"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── NoteCard dispatcher ───────────────────────────────────────────────────────

function NoteCard({ note, currentUser, users, onUpdate, onDelete }) {
  if (note.note_type === "table") {
    return (
      <TableNoteCard
        note={note}
        currentUser={currentUser}
        users={users}
        onUpdate={onUpdate}
        onDelete={onDelete}
      />
    );
  }
  return (
    <MarkdownNoteCard
      note={note}
      currentUser={currentUser}
      users={users}
      onUpdate={onUpdate}
      onDelete={onDelete}
    />
  );
}

// ─── Main NotesView ────────────────────────────────────────────────────────────

export default function NotesView({
  session,
  userProfile,
  autoShowForm = false,
  onAutoShowFormHandled,
}) {
  const [notes, setNotes] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [dialog, setDialog] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2500);
  };

  // Auto-open form when triggered from FAB center button
  useEffect(() => {
    if (autoShowForm && !loading) {
      setShowForm(true);
      onAutoShowFormHandled?.();
    }
  }, [autoShowForm, loading]);

  useEffect(() => {
    fetchAll();
    const channel = supabase
      .channel("notes_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notes" },
        fetchNotes,
      )
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, []);

  const fetchAll = async () => {
    await Promise.all([fetchNotes(), fetchUsers()]);
    setLoading(false);
  };

  const fetchNotes = async () => {
    const { data } = await supabase
      .from("notes")
      .select("*")
      .order("pinned", { ascending: false })
      .order("updated_at", { ascending: false });
    if (data) setNotes(data);
  };

  const fetchUsers = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("id, email, full_name, color")
      .neq("is_active", false);
    if (data) setUsers(data);
  };

  const handleCreate = async ({ title, content, category, note_type }) => {
    const { error } = await supabase.from("notes").insert([
      {
        title,
        content,
        category,
        note_type: note_type || "regular",
        pinned: false,
        created_by: session.user.id,
        updated_by: session.user.id,
      },
    ]);
    if (!error) {
      setShowForm(false);
      fetchNotes();
    }
  };

  const handleUpdate = async (id, updates) => {
    await supabase
      .from("notes")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", id);
    fetchNotes();
  };

  const handleDelete = async (id) => {
    setDialog({
      type: "confirm",
      title: "Hapus catatan?",
      message: "Catatan yang dihapus tidak dapat dikembalikan.",
      confirmLabel: "Ya, Hapus",
      cancelLabel: "Batal",
      danger: true,
      onConfirm: async () => {
        const { error } = await supabase.from("notes").delete().eq("id", id);
        if (error) {
          showToast("Gagal menghapus catatan.", "error");
          return;
        }
        showToast("Catatan berhasil dihapus.", "success");
        fetchNotes();
      },
    });
  };

  const filtered =
    activeTab === "all" ? notes : notes.filter((n) => n.category === activeTab);

  const pinned = filtered.filter((n) => n.pinned);
  const unpinned = filtered.filter((n) => !n.pinned);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-1.5 flex-wrap">
          {CATEGORIES.map((c) => {
            const count =
              c.id === "all"
                ? notes.length
                : notes.filter((n) => n.category === c.id).length;
            return (
              <button
                key={c.id}
                onClick={() => setActiveTab(c.id)}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  activeTab === c.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                }`}
              >
                {c.emoji} {c.label}
                <span className="text-xs opacity-70 ml-0.5">({count})</span>
              </button>
            );
          })}
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="hidden sm:flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:opacity-90 transition-opacity shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Catatan Baru
        </button>
      </div>

      {/* New note form */}
      {showForm && (
        <NewNoteForm
          currentUser={userProfile}
          onSave={handleCreate}
          onCancel={() => setShowForm(false)}
        />
      )}

      {/* Empty state */}
      {filtered.length === 0 && !showForm && (
        <div className="text-center py-16 text-muted-foreground bg-background border rounded-2xl">
          <span className="text-4xl block mb-3">📝</span>
          <p className="text-sm">Belum ada catatan</p>
          <button
            onClick={() => setShowForm(true)}
            className="mt-3 text-sm text-primary hover:underline"
          >
            Tambah catatan pertama
          </button>
        </div>
      )}

      {/* Pinned */}
      {pinned.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
            <Pin className="w-3 h-3" /> Disematkan
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {pinned.map((note) => (
              <NoteCard
                key={note.id}
                note={note}
                currentUser={userProfile}
                users={users}
                onUpdate={handleUpdate}
                onDelete={handleDelete}
              />
            ))}
          </div>
        </div>
      )}

      {/* Others */}
      {unpinned.length > 0 && (
        <div className="space-y-3">
          {pinned.length > 0 && (
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Lainnya
            </p>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {unpinned.map((note) => (
              <NoteCard
                key={note.id}
                note={note}
                currentUser={userProfile}
                users={users}
                onUpdate={handleUpdate}
                onDelete={handleDelete}
              />
            ))}
          </div>
        </div>
      )}

      {dialog && <ConfirmDialog {...dialog} onClose={() => setDialog(null)} />}
      <AppToast toast={toast} />
    </div>
  );
}
