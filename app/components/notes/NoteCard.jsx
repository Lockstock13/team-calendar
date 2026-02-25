import MarkdownNoteCard from "./MarkdownNoteCard";
import TableNoteCard from "./TableNoteCard";

export default function NoteCard({ note, currentUser, users, onUpdate, onDelete, lang, categories }) {
    if (note.note_type === "table") {
        return (
            <TableNoteCard
                note={note}
                currentUser={currentUser}
                users={users}
                onUpdate={onUpdate}
                onDelete={onDelete}
                lang={lang}
                categories={categories}
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
            lang={lang}
            categories={categories}
        />
    );
}
