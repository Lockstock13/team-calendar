import { useState, useRef } from "react";
import dynamic from "next/dynamic";
import { FileText, Table, X, Plus, Check } from "lucide-react";
import { CategoryPills, MdToolbar } from "./NoteComponents";

const MarkdownRenderer = dynamic(() => import("./MarkdownRenderer"), {
    loading: () => <div className="animate-pulse bg-muted/20 h-20 rounded-xl" />,
    ssr: false
});

export default function NewNoteForm({ currentUser, onSave, onCancel, lang, categories }) {
    const [noteType, setNoteType] = useState("regular");
    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");
    const [category, setCategory] = useState("umum");
    const [preview, setPreview] = useState(false);
    const [saving, setSaving] = useState(false);
    const [tableData, setTableData] = useState({
        headers: [lang === "id" ? "Kolom 1" : "Column 1", lang === "id" ? "Kolom 2" : "Column 2", lang === "id" ? "Kolom 3" : "Column 3"],
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
            headers: [...tableData.headers, `${lang === "id" ? "Kolom" : "Column"} ${tableData.headers.length + 1}`],
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
        <div className="bg-background border-2 border-primary/20 rounded-2xl overflow-hidden shadow-xl animate-fade-in mb-6">
            {/* Type Selector */}
            <div className="flex border-b bg-muted/5">
                <button
                    type="button"
                    onClick={() => setNoteType("regular")}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 sm:py-4 text-sm font-bold transition-all ${noteType === "regular"
                        ? "bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 border-b-2 border-blue-500"
                        : "text-muted-foreground hover:bg-muted/50"
                        }`}
                >
                    <FileText className="w-4 h-4" />
                    <span className="hidden sm:inline">Regular (Markdown)</span>
                    <span className="sm:hidden">Markdown</span>
                </button>
                <button
                    type="button"
                    onClick={() => setNoteType("table")}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 sm:py-4 text-sm font-bold transition-all ${noteType === "table"
                        ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border-b-2 border-emerald-500"
                        : "text-muted-foreground hover:bg-muted/50"
                        }`}
                >
                    <Table className="w-4 h-4" /> Table
                </button>
            </div>

            <div className="p-4 sm:p-6 space-y-4">
                {/* Title */}
                <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder={noteType === "table" ? (lang === "id" ? "Judul tabel..." : "Table title...") : (lang === "id" ? "Judul catatan..." : "Note title...")}
                    className="w-full text-lg font-bold bg-transparent border-b-2 border-primary/10 focus:border-primary/40 focus:outline-none pb-2 transition-colors"
                    autoFocus
                />

                {/* Category */}
                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                    <span className="text-xs font-bold text-muted-foreground uppercase">{lang === "id" ? "Kategori:" : "Category:"}</span>
                    <CategoryPills value={category} onChange={setCategory} categories={categories} />
                </div>

                {/* Content: Markdown */}
                {noteType === "regular" && (
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground font-bold flex items-center gap-1.5 uppercase">
                                <FileText className="w-3 h-3 text-blue-500" /> Markdown
                            </span>
                            <button
                                type="button"
                                onClick={() => setPreview((v) => !v)}
                                className={`px-3 py-1 text-xs rounded-xl font-bold transition-all ${preview
                                    ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20"
                                    : "bg-muted text-muted-foreground hover:text-foreground"
                                    }`}
                            >
                                {preview ? "Edit" : "Preview"}
                            </button>
                        </div>
                        {preview ? (
                            <div className="prose prose-sm max-w-none min-h-[150px] p-4 bg-muted/20 border rounded-2xl overflow-auto shadow-inner">
                                {content ? (
                                    <MarkdownRenderer content={content} />
                                ) : (
                                    <p className="text-muted-foreground text-sm italic">
                                        Preview kosong...
                                    </p>
                                )}
                            </div>
                        ) : (
                            <div className="border rounded-2xl overflow-hidden shadow-sm">
                                <MdToolbar
                                    textareaRef={textRef}
                                    value={content}
                                    onChange={setContent}
                                />
                                <textarea
                                    ref={textRef}
                                    value={content}
                                    onChange={(e) => setContent(e.target.value)}
                                    className="w-full text-base bg-background p-3 sm:p-4 focus:outline-none resize-none leading-relaxed font-mono min-h-[120px] sm:min-h-[150px]"
                                    placeholder={lang === "id" ?
                                        "Tulis dengan Markdown...\n**bold**, *italic*, # Heading, - list, `code`" :
                                        "Write with Markdown...\n**bold**, *italic*, # Heading, - list, `code`"
                                    }
                                />
                            </div>
                        )}
                    </div>
                )}

                {/* Content: Table */}
                {noteType === "table" && (
                    <div className="overflow-auto border rounded-2xl shadow-sm">
                        <table className="w-full text-xs border-collapse">
                            <thead>
                                <tr className="bg-muted/50">
                                    {tableData.headers.map((h, c) => (
                                        <th
                                            key={c}
                                            className="border border-border p-0 min-w-[80px] sm:min-w-[100px]"
                                        >
                                            <div className="flex items-center p-2 gap-1">
                                                <input
                                                    value={h}
                                                    onChange={(e) => updateHeader(c, e.target.value)}
                                                    className="flex-1 font-bold bg-transparent focus:outline-none w-full"
                                                />
                                                {tableData.headers.length > 1 && (
                                                    <button
                                                        onClick={() => removeCol(c)}
                                                        className="p-1 text-muted-foreground hover:text-red-500 transition-colors"
                                                    >
                                                        <X className="w-3 h-3" />
                                                    </button>
                                                )}
                                            </div>
                                        </th>
                                    ))}
                                    <th className="border border-border p-0 w-10 bg-muted/20">
                                        <button
                                            onClick={addCol}
                                            className="w-full h-full p-2 text-muted-foreground hover:text-primary font-bold text-lg"
                                        >
                                            +
                                        </button>
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {tableData.rows.map((row, r) => (
                                    <tr key={r} className="hover:bg-muted/10 transition-colors">
                                        {row.map((cell, c) => (
                                            <td key={c} className="border border-border p-0">
                                                <textarea
                                                    value={cell}
                                                    onChange={(e) => updateCell(r, c, e.target.value)}
                                                    className="w-full p-3 bg-transparent focus:outline-none resize-y min-h-[40px]"
                                                />
                                            </td>
                                        ))}
                                        <td className="border border-border p-0 w-10 text-center">
                                            <button
                                                onClick={() => removeRow(r)}
                                                className="p-2 text-muted-foreground hover:text-red-500"
                                            >
                                                <X className="w-4 h-4 mx-auto" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        <button
                            onClick={addRow}
                            className="w-full py-3 text-xs font-bold text-muted-foreground hover:text-primary hover:bg-muted/20 flex items-center justify-center gap-2 transition-all"
                        >
                            <Plus className="w-4 h-4" /> {lang === "id" ? "Tambah Baris Baru" : "Add New Row"}
                        </button>
                    </div>
                )}

                {/* Actions */}
                <div className="flex gap-3 pt-4 border-t">
                    <button
                        type="button"
                        onClick={onCancel}
                        className="flex-1 py-3 border-2 rounded-2xl text-sm font-bold hover:bg-muted transition-all"
                    >
                        {lang === "id" ? "Batal" : "Cancel"}
                    </button>
                    <button
                        type="button"
                        onClick={submit}
                        disabled={saving || !title.trim()}
                        className="flex-1 py-3 bg-primary text-primary-foreground rounded-2xl text-sm font-bold hover:opacity-90 disabled:opacity-50 transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
                    >
                        {saving ? (
                            <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> {lang === "id" ? "Menyimpan..." : "Saving..."}</>
                        ) : (
                            <><Check className="w-4 h-4" /> {lang === "id" ? "Simpan Catatan" : "Save Note"}</>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
