export const getCategories = (lang) => [
    { id: "all", label: lang === "id" ? "Semua" : "All", emoji: "" },
    { id: "umum", label: lang === "id" ? "Umum" : "General", emoji: "🗒️" },
    { id: "keuangan", label: lang === "id" ? "Keuangan" : "Finance", emoji: "💰" },
    { id: "password", label: "Password", emoji: "🔐" },
    { id: "lainnya", label: lang === "id" ? "Lainnya" : "Others", emoji: "📋" },
];

export const CAT_STYLE = {
    umum: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800",
    keuangan: "bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-800",
    password: "bg-red-50 text-red-600 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800",
    lainnya: "bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800/50 dark:text-slate-300 dark:border-slate-700",
};

export const parseTableContent = (raw) => {
    try {
        const parsed = JSON.parse(raw || "{}");
        if (parsed.headers && parsed.rows) return parsed;
    } catch { }
    return {
        headers: ["Kolom 1", "Kolom 2", "Kolom 3"],
        rows: [
            ["", "", ""],
            ["", "", ""],
        ],
    };
};

export const MD_ACTIONS = [
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
