export default function TypeBadge({ task, lang }) {
    if (task.is_comday || task.task_type === "libur_pengganti") {
        return (
            <span className="text-[11px] bg-red-50/70 text-red-600/90 dark:bg-red-900/30 dark:text-red-400 tracking-wide px-2 py-0.5 rounded-sm font-medium whitespace-nowrap border border-red-100/50 dark:border-red-900/40">
                {lang === "id" ? "Cuti/Libur" : "Leave"}
            </span>
        );
    }

    if (task.is_weekend_task) {
        return (
            <span className="text-[11px] bg-amber-50/70 text-amber-600/90 dark:bg-amber-900/30 dark:text-amber-400 tracking-wide px-2 py-0.5 rounded-sm font-medium whitespace-nowrap border border-amber-100/50 dark:border-amber-900/40">
                {lang === "id" ? "Akhir Pekan" : "Wknd"}
            </span>
        );
    }

    // Adding support for "Selesai" (Done) badge here so we don't have to duplicate logic later
    if (task.status === "done") {
        return (
            <span className="text-[11px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 tracking-wide px-2 py-0.5 rounded-sm font-medium whitespace-nowrap border border-emerald-500/20">
                {lang === "id" ? "Selesai" : "Done"}
            </span>
        );
    }

    return null;
}
