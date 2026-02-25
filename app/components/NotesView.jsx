"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { Pin, Plus } from "lucide-react";
import { useGlobalContext } from "@/app/providers";
import { useToast } from "./ToastProvider";
import { useConfirm } from "./ConfirmProvider";

// Modular Components
import { getCategories } from "./notes/NoteConstants";
import NoteCard from "./notes/NoteCard";
import NewNoteForm from "./notes/NewNoteForm";

export default function NotesView({ session, userProfile }) {
  const { language } = useGlobalContext();
  const { addToast } = useToast();
  const { confirm } = useConfirm();
  const lang = language || "en";
  const categories = getCategories(lang);

  const [notes, setNotes] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [visibleCount, setVisibleCount] = useState(12);

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
      .order("updated_at", { ascending: false })
      .limit(visibleCount + 1); // Fetch one extra to check if there's more
    if (data) setNotes(data);
  };
  useEffect(() => {
    fetchNotes();
  }, [visibleCount]);

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
      addToast(
        lang === "id"
          ? "Catatan berhasil dibuat!"
          : "Note created successfully!",
        "success",
      );
      fetchNotes();
    } else {
      addToast(
        lang === "id" ? "Gagal membuat catatan" : "Failed to create note",
        "error",
      );
    }
  };

  const handleUpdate = useCallback(
    async (id, updates) => {
      const { error } = await supabase
        .from("notes")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (!error) {
        addToast(
          lang === "id" ? "Catatan diperbarui" : "Note updated",
          "success",
        );
        fetchNotes();
      }
    },
    [visibleCount, lang, addToast],
  );

  const handleDelete = useCallback(
    async (id) => {
      const ok = await confirm({
        title: lang === "id" ? "Hapus Catatan" : "Delete Note",
        message:
          lang === "id"
            ? "Apakah kamu yakin ingin menghapus catatan ini selamanya?"
            : "Are you sure you want to delete this note forever?",
        confirmText: lang === "id" ? "Hapus" : "Delete",
        cancelText: lang === "id" ? "Batal" : "Cancel",
      });
      if (!ok) return;
      const { error } = await supabase.from("notes").delete().eq("id", id);
      if (!error) {
        addToast(lang === "id" ? "Catatan dihapus" : "Note deleted", "info");
        fetchNotes();
      }
    },
    [lang, visibleCount, addToast, confirm],
  );

  const filtered =
    activeTab === "all" ? notes : notes.filter((n) => n.category === activeTab);

  const pinned = filtered.filter((n) => n.pinned);
  const unpinned = filtered
    .filter((n) => !n.pinned)
    .slice(0, visibleCount - pinned.length);

  const hasMore = notes.length > visibleCount;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 font-bold text-muted-foreground animate-pulse">
        {lang === "id" ? "Memuat Catatan..." : "Loading Notes..."}
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 bg-background/90 backdrop-blur-md p-3 sm:p-4 rounded-2xl border sticky top-14 sm:top-[72px] z-10 shadow-sm">
        {/* Categories scrollable on mobile */}
        <div className="flex gap-2 overflow-x-auto pb-1 sm:pb-0 sm:flex-wrap no-scrollbar -mx-1 px-1 sm:mx-0 sm:px-0">
          {categories.map((c) => {
            const count =
              c.id === "all"
                ? notes.length
                : notes.filter((n) => n.category === c.id).length;
            return (
              <button
                key={c.id}
                onClick={() => setActiveTab(c.id)}
                className={`flex-shrink-0 flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-[13px] sm:text-sm font-semibold transition-all ${activeTab === c.id
                    ? "bg-zinc-800 text-white shadow-sm"
                    : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                  }`}
              >
                <span>{c.emoji || "📁"}</span> {c.label}
                <span className="text-[10px] bg-black/10 px-1.5 py-0.5 rounded-full ml-0.5">
                  {count}
                </span>
              </button>
            );
          })}
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground rounded-2xl text-sm font-bold hover:opacity-90 transition-all shadow-xl shadow-primary/20 active:scale-95"
        >
          <Plus className="w-5 h-5 font-bold" />
          {lang === "id" ? "Buat Catatan" : "Create Note"}
        </button>
      </div>

      {/* New note form */}
      {showForm && (
        <NewNoteForm
          currentUser={userProfile}
          onSave={handleCreate}
          onCancel={() => setShowForm(false)}
          lang={lang}
          categories={categories}
        />
      )}

      {/* Empty state */}
      {filtered.length === 0 && !showForm && (
        <div className="text-center py-24 text-muted-foreground bg-background border border-dashed rounded-3xl animate-fade-in shadow-inner">
          <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto mb-4 text-4xl">
            🗒️
          </div>
          <p className="text-base font-bold text-foreground mb-1">
            {lang === "id"
              ? "Belum ada catatan di kategori ini"
              : "No notes in this category"}
          </p>
          <p className="text-sm opacity-70 mb-6">
            {lang === "id"
              ? "Mulai dengan membuat catatan pertama kamu!"
              : "Start by creating your first note!"}
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="text-sm bg-primary/10 text-primary px-6 py-2 rounded-xl font-bold hover:bg-primary/20 transition-colors"
          >
            {lang === "id" ? "Tambah Catatan Baru" : "Add New Note"}
          </button>
        </div>
      )}

      {/* Pinned Section */}
      {pinned.length > 0 && (
        <div className="space-y-4">
          <p className="text-[11px] font-black text-muted-foreground uppercase tracking-[0.2em] flex items-center gap-2 pl-2">
            <Pin className="w-3.5 h-3.5 text-blue-500" />{" "}
            {lang === "id" ? "Catatan Disematkan" : "Pinned Notes"}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {pinned.map((note) => (
              <NoteCard
                key={note.id}
                note={note}
                currentUser={userProfile}
                users={users}
                onUpdate={handleUpdate}
                onDelete={handleDelete}
                lang={lang}
                categories={categories}
              />
            ))}
          </div>
        </div>
      )}

      {/* Grid Others */}
      {unpinned.length > 0 && (
        <div className="space-y-4">
          {pinned.length > 0 && (
            <p className="text-[11px] font-black text-muted-foreground uppercase tracking-[0.2em] pl-2 sticky top-[140px] bg-muted/5 backdrop-blur-sm py-1 z-[5]">
              {lang === "id" ? "Catatan Lainnya" : "Other Notes"}
            </p>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {unpinned.map((note) => (
              <NoteCard
                key={note.id}
                note={note}
                currentUser={userProfile}
                users={users}
                onUpdate={handleUpdate}
                onDelete={handleDelete}
                lang={lang}
                categories={categories}
              />
            ))}
          </div>

          {hasMore && (
            <div className="flex justify-center pt-8 pb-12">
              <button
                onClick={() => setVisibleCount((prev) => prev + 12)}
                className="px-8 py-3 bg-background border-2 border-primary/20 text-primary rounded-2xl text-sm font-bold hover:bg-primary hover:text-white hover:border-primary transition-all shadow-md active:scale-95"
              >
                {lang === "id" ? "Muat Lebih Banyak" : "Load More"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
