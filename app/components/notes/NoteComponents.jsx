import { CAT_STYLE, MD_ACTIONS } from "./NoteConstants";
import Avatar from "@/app/components/Avatar";

export function CategoryPills({ value, onChange, categories }) {
    return (
        <div className="flex gap-1.5 flex-wrap">
            {categories.filter((c) => c.id !== "all").map((c) => (
                <button
                    key={c.id}
                    type="button"
                    onClick={() => onChange(c.id)}
                    className={`text-xs px-2 py-0.5 rounded-full border font-medium transition-all ${value === c.id
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

export function MdToolbar({ textareaRef, value, onChange }) {
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
