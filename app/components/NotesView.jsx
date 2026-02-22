"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { Pin, PinOff, Pencil, Trash2, Plus, Check, X } from "lucide-react";

const CATEGORIES = [
  { id: "all",        label: "Semua",    emoji: "" },
  { id: "umum",       label: "Umum",     emoji: "🗒️" },
  { id: "keuangan",   label: "Keuangan", emoji: "💰" },
  { id: "password",   label: "Password", emoji: "🔐" },
  { id: "lainnya",    label: "Lainnya",  emoji: "📋" },
];

const CAT_STYLE = {
  umum:     "bg-blue-50 text-blue-700 border-blue-200",
  keuangan: "bg-yellow-50 text-yellow-700 border-yellow-200",
  password: "bg-red-50 text-red-600 border-red-200",
  lainnya:  "bg-slate-50 text-slate-600 border-slate-200",
};

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

function NoteCard({ note, currentUser, users, onUpdate, onDelete }) {
  const [editing, setEditing]   = useState(false);
  const [title, setTitle]       = useState(note.title);
  const [content, setContent]   = useState(note.content || "");
  const [category, setCategory] = useState(note.category || "umum");
  const [saving, setSaving]     = useState(false);
  const textRef = useRef(null);

  const author  = users.find((u) => u.id === note.created_by);
  const editor  = users.find((u) => u.id === note.updated_by);
  const isMe    = currentUser?.id === note.created_by;
  const isAdmin = currentUser?.role === "admin";
  const canEdit = isMe || isAdmin;

  const catObj = CATEGORIES.find((c) => c.id === note.category) || CATEGORIES[1];

  const save = async () => {
    if (!title.trim()) return;
    setSaving(true);
    await onUpdate(note.id, { title, content, category, updated_by: currentUser.id });
    setSaving(false);
    setEditing(false);
  };

  const cancel = () => {
    setTitle(note.title);
    setContent(note.content || "");
    setCategory(note.category || "umum");
    setEditing(false);
  };

  const togglePin = () =>
    onUpdate(note.id, { pinned: !note.pinned, updated_by: currentUser.id });

  useEffect(() => {
    if (editing && textRef.current) textRef.current.focus();
  }, [editing]);

  return (
    <div
      className={`bg-background border rounded-2xl p-4 flex flex-col gap-3 transition-shadow hover:shadow-md ${
        note.pinned ? "border-primary/40 ring-1 ring-primary/10" : ""
      }`}
    >
      {/* Top row */}
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

        {/* Actions */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {editing ? (
            <>
              <button
                onClick={save}
                disabled={saving || !title.trim()}
                className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg disabled:opacity-40"
              >
                <Check className="w-3.5 h-3.5" />
              </button>
              <button
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

      {/* Category selector (edit mode) */}
      {editing && (
        <div className="flex gap-1.5 flex-wrap">
          {CATEGORIES.filter((c) => c.id !== "all").map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setCategory(c.id)}
              className={`text-xs px-2 py-0.5 rounded-full border font-medium transition-all ${
                category === c.id
                  ? CAT_STYLE[c.id]
                  : "bg-muted text-muted-foreground border-transparent"
              }`}
            >
              {c.emoji} {c.label}
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      {editing ? (
        <textarea
          ref={textRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="w-full text-sm bg-muted/40 border rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none leading-relaxed"
          rows={5}
          placeholder="Isi catatan..."
        />
      ) : (
        note.content && (
          <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed break-words">
            {note.content}
          </p>
        )
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-1 border-t">
        <div className="flex items-center gap-1.5">
          {author && <Avatar user={author} />}
          <span className="text-xs text-muted-foreground">
            {author?.full_name || author?.email || "—"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {!editing && (
            <span
              className={`text-xs px-2 py-0.5 rounded-full border font-medium ${
                CAT_STYLE[note.category] || CAT_STYLE.lainnya
              }`}
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
  );
}

function NewNoteForm({ currentUser, onSave, onCancel }) {
  const [title, setTitle]       = useState("");
  const [content, setContent]   = useState("");
  const [category, setCategory] = useState("umum");
  const [saving, setSaving]     = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    await onSave({ title, content, category });
    setSaving(false);
  };

  return (
    <div className="bg-background border-2 border-primary/20 rounded-2xl p-4 space-y-3">
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Judul catatan"
        className="w-full text-sm font-semibold bg-transparent border-b border-primary/40 focus:outline-none pb-1"
        autoFocus
      />

      {/* Category */}
      <div className="flex gap-1.5 flex-wrap">
        {CATEGORIES.filter((c) => c.id !== "all").map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setCategory(c.id)}
            className={`text-xs px-2 py-0.5 rounded-full border font-medium transition-all ${
              category === c.id
                ? CAT_STYLE[c.id]
                : "bg-muted text-muted-foreground border-transparent"
            }`}
          >
            {c.emoji} {c.label}
          </button>
        ))}
      </div>

      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Isi catatan... (password, nominal, link, dll)"
        className="w-full text-sm bg-muted/40 border rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none leading-relaxed"
        rows={4}
      />

      <div className="flex gap-2 pt-1">
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
  );
}

export default function NotesView({ session, userProfile }) {
  const [notes, setNotes]       = useState([]);
  const [users, setUsers]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [activeTab, setActiveTab] = useState("all");
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    fetchAll();

    // Realtime
    const channel = supabase
      .channel("notes_changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "notes" }, fetchNotes)
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

  const handleCreate = async ({ title, content, category }) => {
    const { error } = await supabase.from("notes").insert([
      {
        title,
        content,
        category,
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
    if (!confirm("Hapus catatan ini?")) return;
    await supabase.from("notes").delete().eq("id", id);
    fetchNotes();
  };

  const filtered =
    activeTab === "all"
      ? notes
      : notes.filter((n) => n.category === activeTab);

  const pinned   = filtered.filter((n) => n.pinned);
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
        {/* Category tabs */}
        <div className="flex gap-1.5 flex-wrap">
          {CATEGORIES.map((c) => {
            const count = c.id === "all" ? notes.length : notes.filter((n) => n.category === c.id).length;
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
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:opacity-90 transition-opacity shadow-sm"
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
    </div>
  );
}
