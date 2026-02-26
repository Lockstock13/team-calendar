"use client";

/**
 * Reusable Skeleton components for loading states.
 * Replaces plain spinners with content-aware loading screens.
 */

function Bone({ className = "" }) {
    return (
        <div
            className={`animate-pulse bg-muted rounded-lg ${className}`}
        />
    );
}

// ── Dashboard Skeleton ──────────────────────────────────────────────────────

export function DashboardSkeleton() {
    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            {/* Greeting */}
            <div className="space-y-2">
                <Bone className="h-8 w-64" />
                <Bone className="h-4 w-40" />
            </div>

            {/* Stat cards */}
            <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-4">
                {[1, 2].map((i) => (
                    <div key={i} className="w-full sm:w-56 bg-background border rounded-xl p-4 space-y-3">
                        <Bone className="h-3 w-24" />
                        <Bone className="h-8 w-16" />
                    </div>
                ))}
            </div>

            {/* Two column layout */}
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
                <div className="space-y-4">
                    <Bone className="h-5 w-32" />
                    <div className="bg-background border rounded-xl overflow-hidden">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="flex items-center gap-3 px-4 py-3 border-b last:border-0">
                                <Bone className="w-1 h-10 rounded-full" />
                                <div className="flex-1 space-y-2">
                                    <Bone className="h-4 w-3/4" />
                                    <Bone className="h-3 w-1/2" />
                                </div>
                                <Bone className="w-5 h-5 rounded-full" />
                            </div>
                        ))}
                    </div>
                </div>
                <div className="space-y-3">
                    <Bone className="h-5 w-28" />
                    <div className="bg-background border rounded-xl p-4 space-y-4">
                        {[1, 2, 3, 4].map((i) => (
                            <div key={i} className="flex items-center gap-3">
                                <Bone className="w-8 h-8 rounded-full flex-shrink-0" />
                                <div className="flex-1 space-y-1.5">
                                    <Bone className="h-3 w-full" />
                                    <Bone className="h-2.5 w-2/3" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

// ── Calendar Skeleton ───────────────────────────────────────────────────────

export function CalendarSkeleton() {
    return (
        <div className="space-y-4 animate-in fade-in duration-300">
            <div className="bg-background border rounded-xl p-4 space-y-4">
                {/* Toolbar */}
                <div className="flex items-center justify-between">
                    <Bone className="h-8 w-40" />
                    <div className="flex gap-2">
                        <Bone className="h-8 w-20 rounded-full" />
                        <Bone className="h-8 w-20 rounded-full" />
                    </div>
                </div>
                {/* Day headers */}
                <div className="grid grid-cols-7 gap-1">
                    {Array.from({ length: 7 }).map((_, i) => (
                        <Bone key={i} className="h-4 w-full" />
                    ))}
                </div>
                {/* Calendar grid */}
                <div className="grid grid-cols-7 gap-1">
                    {Array.from({ length: 35 }).map((_, i) => (
                        <div key={i} className="border rounded-lg p-2 h-20 space-y-1">
                            <Bone className="h-3 w-6" />
                            {i % 3 === 0 && <Bone className="h-3 w-full rounded" />}
                            {i % 5 === 0 && <Bone className="h-3 w-4/5 rounded" />}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

// ── List Skeleton ───────────────────────────────────────────────────────────

export function ListSkeleton() {
    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            {[1, 2].map((group) => (
                <div key={group}>
                    <div className="flex items-center gap-3 mb-2 px-1">
                        <Bone className="h-4 w-48" />
                        <div className="flex-1 h-px bg-border" />
                        <Bone className="h-3 w-16" />
                    </div>
                    <div className="space-y-2">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="bg-background border rounded-xl p-4 flex items-start gap-3">
                                <Bone className="w-1 h-12 rounded-full" />
                                <div className="flex-1 space-y-2">
                                    <Bone className="h-4 w-3/4" />
                                    <Bone className="h-3 w-1/2" />
                                    <div className="flex gap-1">
                                        <Bone className="w-6 h-6 rounded-full" />
                                        <Bone className="w-6 h-6 rounded-full" />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}

// ── Notes Skeleton ──────────────────────────────────────────────────────────

export function NotesSkeleton() {
    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            {/* Toolbar */}
            <div className="flex items-center justify-between gap-3 bg-background border p-3 rounded-2xl">
                <div className="flex gap-2">
                    {[1, 2, 3, 4].map((i) => (
                        <Bone key={i} className="h-7 w-16 rounded-full" />
                    ))}
                </div>
                <Bone className="h-9 w-9 rounded-xl" />
            </div>
            {/* Cards grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div key={i} className="bg-background border rounded-2xl overflow-hidden">
                        <Bone className="h-1 w-full" />
                        <div className="p-4 space-y-3">
                            <Bone className="h-4 w-3/4" />
                            <Bone className="h-3 w-full" />
                            <Bone className="h-3 w-2/3" />
                            <div className="flex items-center justify-between pt-2">
                                <Bone className="h-3 w-20" />
                                <Bone className="w-5 h-5 rounded-full" />
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ── Report Skeleton ─────────────────────────────────────────────────────────

export function ReportSkeleton() {
    return (
        <div className="space-y-5 animate-in fade-in duration-300">
            {/* Controls */}
            <div className="flex items-center justify-between">
                <div className="flex gap-2">
                    <Bone className="h-9 w-32 rounded-xl" />
                    <Bone className="h-9 w-20 rounded-xl" />
                </div>
                <Bone className="h-9 w-24 rounded-xl" />
            </div>
            {/* Stat cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="bg-background border rounded-2xl p-4 space-y-2">
                        <Bone className="h-8 w-12" />
                        <Bone className="h-3 w-24" />
                    </div>
                ))}
            </div>
            {/* Table */}
            <div className="bg-background border rounded-xl overflow-hidden">
                <div className="border-b p-3">
                    <div className="grid grid-cols-6 gap-3">
                        {[1, 2, 3, 4, 5, 6].map((i) => (
                            <Bone key={i} className="h-3 w-full" />
                        ))}
                    </div>
                </div>
                {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="grid grid-cols-6 gap-3 p-3 border-b last:border-0">
                        {[1, 2, 3, 4, 5, 6].map((j) => (
                            <Bone key={j} className="h-4 w-full" />
                        ))}
                    </div>
                ))}
            </div>
        </div>
    );
}

// ── Chat Skeleton ───────────────────────────────────────────────────────────

export function ChatSkeleton() {
    return (
        <div className="flex flex-col bg-background border rounded-[1.5rem] sm:rounded-[2rem] overflow-hidden shadow-sm h-[calc(100vh-140px)] sm:h-[calc(100vh-120px)] min-h-[420px] animate-in fade-in duration-300">
            {/* Header */}
            <div className="px-6 py-4 border-b flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Bone className="w-10 h-10 rounded-2xl" />
                    <div className="space-y-1.5">
                        <Bone className="h-4 w-28" />
                        <Bone className="h-2.5 w-20" />
                    </div>
                </div>
                <div className="flex -space-x-2">
                    {[1, 2, 3].map((i) => (
                        <Bone key={i} className="w-7 h-7 rounded-full" />
                    ))}
                </div>
            </div>
            {/* Messages */}
            <div className="flex-1 px-4 sm:px-6 py-6 space-y-4 overflow-hidden">
                {/* Received messages */}
                <div className="flex items-end gap-2">
                    <Bone className="w-8 h-8 rounded-full flex-shrink-0" />
                    <Bone className="h-10 w-48 rounded-2xl rounded-bl-sm" />
                </div>
                <div className="flex items-end gap-2">
                    <div className="w-8" />
                    <Bone className="h-10 w-64 rounded-2xl rounded-bl-sm" />
                </div>
                {/* Sent message */}
                <div className="flex justify-end">
                    <Bone className="h-10 w-40 rounded-2xl rounded-br-sm" />
                </div>
                {/* More received */}
                <div className="flex items-end gap-2">
                    <Bone className="w-8 h-8 rounded-full flex-shrink-0" />
                    <Bone className="h-14 w-56 rounded-2xl rounded-bl-sm" />
                </div>
                <div className="flex justify-end">
                    <Bone className="h-10 w-52 rounded-2xl rounded-br-sm" />
                </div>
            </div>
            {/* Input */}
            <div className="px-4 py-4 sm:p-5 border-t">
                <div className="flex items-end gap-3">
                    <Bone className="w-8 h-8 rounded-full hidden sm:block" />
                    <Bone className="flex-1 h-11 rounded-3xl" />
                </div>
            </div>
        </div>
    );
}

// ── Generic page loading fallback ──────────────────────────────────────────

export function PageSkeleton() {
    return (
        <div className="space-y-6 animate-in fade-in duration-300 p-4">
            <Bone className="h-8 w-48" />
            <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                    <Bone key={i} className="h-16 w-full rounded-xl" />
                ))}
            </div>
        </div>
    );
}
