"use client";

/**
 * Shared Avatar component — replaces 6+ duplicate Avatar definitions.
 * Usage: <Avatar user={user} size="sm" />
 * Sizes: "xs" (w-5), "sm" (w-7, default), "md" (w-8), "lg" (w-9)
 */
export default function Avatar({ user, size = "sm", selected, className = "" }) {
    const sizes = {
        xs: "w-5 h-5 text-[9px]",
        sm: "w-7 h-7 text-xs",
        md: "w-8 h-8 text-sm",
        lg: "w-9 h-9 text-sm",
    };

    const cls = sizes[size] || sizes.sm;
    const initial = (user?.full_name || user?.email || "?").charAt(0).toUpperCase();

    return (
        <div
            className={`${cls} rounded-full flex items-center justify-center text-white font-bold flex-shrink-0 shadow-sm ${selected ? "ring-2 ring-primary scale-110" : ""
                } ${className}`}
            style={{ backgroundColor: user?.color || "#64748b" }}
            title={user?.full_name || user?.email}
        >
            {initial}
        </div>
    );
}
