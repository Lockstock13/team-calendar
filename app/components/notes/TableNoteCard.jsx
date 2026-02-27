import { useState, memo } from "react";
import { Pin, PinOff, Pencil, Trash2, X, Table as TableIcon, Maximize2, Check, Plus } from "lucide-react";
import { CAT_STYLE, parseTableContent } from "./NoteConstants";
import { CategoryPills } from "./NoteComponents";
import Avatar from "@/app/components/Avatar";
import { useConfirm } from "../ConfirmProvider";

function TableNoteCard({ note, currentUser, users, onUpdate, onDelete, lang, categories }) {
    const { confirm } = useConfirm();
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
    const catObj = categories.find((c) => c.id === note.category) || categories[1];

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
            headers: [...tableData.headers, `${lang === "id" ? 'Kolom' : 'Column'} ${tableData.headers.length + 1}`],
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
                <div className="h-0.5 bg-emerald-400 dark:bg-emerald-600" />
                <div className="p-4 flex flex-col gap-3 flex-1">
                    {/* Header — title only */}
                    <div className="flex items-start gap-2">
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
                    </div>

                    {editing && <CategoryPills value={category} onChange={setCategory} categories={categories} />}

                    {/* Table Content */}
                    <div className="overflow-x-auto">
                        <table className="w-full text-[10px] border-collapse">
                            <thead>
                                <tr>
                                    {editing ? tableData.headers.map((h, c) => (
                                        <th key={c} className="border border-border p-0 min-w-[60px]">
                                            <div className="flex items-center">
                                                <input
                                                    value={h}
                                                    onChange={(e) => updateHeader(c, e.target.value)}
                                                    className="flex-1 px-1.5 py-1 font-bold bg-muted/50 focus:outline-none w-full"
                                                />
                                            </div>
                                        </th>
                                    )) : viewData.headers.map((h, i) => (
                                        <th key={i} className="border border-border px-1.5 py-1 bg-muted/40 font-bold text-left whitespace-nowrap">
                                            {h}
                                        </th>
                                    ))}
                                    {editing && <th className="w-6 border border-border bg-muted/20"><button onClick={addCol} className="w-full">+</button></th>}
                                </tr>
                            </thead>
                            <tbody>
                                {(editing ? tableData.rows : viewData.rows).slice(0, 5).map((row, r) => (
                                    <tr key={r}>
                                        {row.map((cell, c) => (
                                            <td key={c} className="border border-border p-0">
                                                {editing ? (
                                                    <input
                                                        value={cell}
                                                        onChange={(e) => updateCell(r, c, e.target.value)}
                                                        className="w-full px-1.5 py-1 bg-transparent focus:outline-none"
                                                    />
                                                ) : (
                                                    <div className="px-1.5 py-1 truncate max-w-[100px]">{cell}</div>
                                                )}
                                            </td>
                                        ))}
                                        {editing && (
                                            <td className="w-6 border border-border text-center">
                                                <button onClick={() => removeRow(r)} className="text-red-400 hover:text-red-600"><X className="w-3 h-3 mx-auto" /></button>
                                            </td>
                                        )}
                                    </tr>
                                ))}
                                {!editing && viewData.rows.length > 5 && (
                                    <tr>
                                        <td colSpan={viewData.headers.length} className="text-center py-1 text-[8px] text-muted-foreground">
                                            {viewData.rows.length - 5} {lang === "id" ? "baris lagi..." : "more rows..."}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                        {editing && (
                            <button onClick={addRow} className="mt-1 text-[10px] text-muted-foreground flex items-center gap-1"><Plus className="w-2.5 h-2.5" /> {lang === "id" ? "Tambah" : "Add"}</button>
                        )}
                    </div>

                    {/* Meta footer */}
                    <div className="flex items-center justify-between pt-2 border-t mt-auto">
                        <div className="flex items-center gap-1.5">
                            {author && <Avatar user={author} />}
                            <span className="text-[10px] text-muted-foreground font-medium truncate max-w-[80px]">
                                {author?.full_name || author?.email || "—"}
                            </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-800 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                                <TableIcon className="w-2.5 h-2.5" /> TABEL
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
                            >
                                <Maximize2 className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">{lang === "id" ? "Buka" : "Open"}</span>
                            </button>
                            <button
                                onClick={togglePin}
                                className={`flex-1 flex items-center justify-center gap-1 py-2.5 text-xs font-medium transition-colors active:scale-95 ${note.pinned ? "text-primary hover:bg-primary/10" : "text-muted-foreground hover:bg-muted/60"}`}
                            >
                                {note.pinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
                                <span className="hidden sm:inline">{note.pinned ? "Unpin" : "Pin"}</span>
                            </button>
                            <button
                                onClick={() => setEditing(true)}
                                className="flex-1 flex items-center justify-center gap-1 py-2.5 text-xs font-medium text-muted-foreground hover:bg-muted/60 transition-colors active:scale-95"
                            >
                                <Pencil className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">Edit</span>
                            </button>
                            <button
                                onClick={() => onDelete(note.id)}
                                className="flex-1 flex items-center justify-center gap-1 py-2.5 text-xs font-medium text-muted-foreground hover:bg-red-50 dark:hover:bg-red-950/20 hover:text-red-500 transition-colors active:scale-95"
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">{lang === "id" ? "Hapus" : "Delete"}</span>
                            </button>
                        </div>
                    )
                )}
            </div>

            {/* Focus Mode Table */}
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
                            message: lang === "id" ? "Perubahan belum disimpan. Batalkan?" : "Changes are not saved. Discard anyway?",
                            confirmText: lang === "id" ? "Ya, Batal" : "Yes, Discard",
                            cancelText: lang === "id" ? "Lanjut Edit" : "Keep Editing"
                        });
                        if (ok) {
                            setExpanded(false);
                            setEditing(false);
                        }
                    }}
                >
                    <div
                        className="bg-background rounded-3xl border shadow-2xl w-full max-w-6xl h-full max-h-[90vh] flex flex-col overflow-hidden animate-fade-in"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="h-1.5 bg-emerald-500 dark:bg-emerald-600" />

                        {/* Modal Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b bg-muted/5">
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                                <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl">
                                    <TableIcon className="w-5 h-5 text-emerald-600" />
                                </div>
                                {editing ? (
                                    <input
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                        className="text-xl font-bold bg-transparent focus:outline-none w-full border-b-2 border-primary/20"
                                        placeholder="Judul Tabel..."
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
                                        <Check className="w-4 h-4" /> {lang === "id" ? "Simpan" : "Save"}
                                    </button>
                                ) : canEdit && (
                                    <button
                                        onClick={() => setEditing(true)}
                                        className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-bold hover:opacity-90 transition-opacity"
                                    >
                                        <Pencil className="w-4 h-4" /> {lang === "id" ? "Edit Tabel" : "Edit Table"}
                                    </button>
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
                        <div className="flex-1 overflow-auto p-6 md:p-10 bg-background">
                            <table className="w-full border-collapse border rounded-xl overflow-hidden shadow-sm">
                                <thead>
                                    <tr className="bg-muted/50">
                                        {editing ? tableData.headers.map((h, c) => (
                                            <th key={c} className="border p-0">
                                                <div className="flex items-center px-4 py-3 gap-2">
                                                    <input
                                                        value={h}
                                                        onChange={(e) => updateHeader(c, e.target.value)}
                                                        className="flex-1 font-bold bg-transparent focus:outline-none"
                                                    />
                                                    {tableData.headers.length > 1 && (
                                                        <button onClick={() => removeCol(c)} className="text-muted-foreground hover:text-red-500"><X className="w-4 h-4" /></button>
                                                    )}
                                                </div>
                                            </th>
                                        )) : (
                                            viewData.headers.map((h, i) => (
                                                <th key={i} className="border px-4 py-3 font-bold text-left bg-muted/30">{h}</th>
                                            ))
                                        )}
                                        {editing && <th className="w-12 border bg-muted/10"><button onClick={addCol} className="w-full h-full text-xl font-bold">+</button></th>}
                                    </tr>
                                </thead>
                                <tbody>
                                    {(editing ? tableData.rows : viewData.rows).map((row, r) => (
                                        <tr key={r} className="hover:bg-muted/5 transition-colors">
                                            {row.map((cell, c) => (
                                                <td key={c} className="border p-0">
                                                    {editing ? (
                                                        <textarea
                                                            value={cell}
                                                            onChange={(e) => updateCell(r, c, e.target.value)}
                                                            className="w-full min-h-[50px] p-4 bg-transparent focus:outline-none resize-y"
                                                        />
                                                    ) : (
                                                        <div className="p-4 whitespace-pre-wrap">{cell}</div>
                                                    )}
                                                </td>
                                            ))}
                                            {editing && (
                                                <td className="w-12 border bg-muted/5 text-center">
                                                    <button onClick={() => removeRow(r)} className="text-red-400 hover:text-red-600 p-2"><X className="w-5 h-5 mx-auto" /></button>
                                                </td>
                                            )}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {editing && (
                                <button onClick={addRow} className="mt-6 flex items-center gap-2 px-4 py-2 bg-muted hover:bg-muted/80 rounded-xl text-sm font-bold transition-colors">
                                    <Plus className="w-4 h-4" /> {lang === "id" ? "Tambah Baris Baru" : "Add New Row"}
                                </button>
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div className="px-6 py-4 border-t bg-muted/5 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                {author && <Avatar user={author} />}
                                <div>
                                    <p className="text-xs font-bold">{author?.full_name || author?.email}</p>
                                    <p className="text-[10px] text-muted-foreground">
                                        {lang === "id" ? "Dibuat pada: " : "Created at: "}
                                        {new Date(note.created_at).toLocaleString("id-ID")}
                                    </p>
                                </div>
                            </div>
                            <CategoryPills value={category} onChange={setCategory} categories={categories} />
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

export default memo(TableNoteCard);
