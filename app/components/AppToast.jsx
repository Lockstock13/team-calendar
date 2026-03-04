"use client";

export default function AppToast({ toast }) {
  if (!toast) return null;

  return (
    <div className="fixed top-16 inset-x-0 z-[300] flex justify-center pointer-events-none px-4">
      <div
        className={`px-6 py-3 rounded-xl shadow-lg text-sm font-semibold text-white text-center max-w-sm w-full animate-toast-in ${
          toast.type === "error" ? "bg-red-500" : "bg-emerald-500"
        }`}
      >
        {toast.msg}
      </div>
    </div>
  );
}

