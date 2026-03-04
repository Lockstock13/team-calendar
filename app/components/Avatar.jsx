/**
 * Shared Avatar component — used across DashboardView, ListView,
 * TaskForm, ChatView, NotesView, ReportView.
 *
 * Props:
 *   user   {object}  — must have: full_name?, email?, color?
 *   size   "xs"|"sm"|"md"|"lg"  — controls diameter & font-size
 *   title  string?  — tooltip override (defaults to user name/email)
 */
export default function Avatar({ user, size = "sm", title }) {
  const sizeMap = {
    xs: "w-5 h-5 text-[10px]",
    sm: "w-7 h-7 text-xs",
    md: "w-8 h-8 text-sm",
    lg: "w-9 h-9 text-sm",
  };

  const cls = sizeMap[size] ?? sizeMap.sm;
  const label = user?.full_name || user?.email || "?";
  const initial = label.charAt(0).toUpperCase();
  const bg = user?.color || "#64748b";
  const tooltip = title ?? label;

  return (
    <div
      className={`${cls} rounded-full flex items-center justify-center text-white font-bold flex-shrink-0`}
      style={{ backgroundColor: bg }}
      title={tooltip}
    >
      {initial}
    </div>
  );
}
