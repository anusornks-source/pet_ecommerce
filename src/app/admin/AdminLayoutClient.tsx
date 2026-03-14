"use client";

import { useState, useEffect } from "react";
import AdminSidebar from "./AdminSidebar";

const STORAGE_KEY = "admin-sidebar-hidden";

export default function AdminLayoutClient({
  children,
}: {
  children: React.ReactNode;
}) {
  const [hidden, setHidden] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored !== null) setHidden(stored === "1");
    } catch {
      /* ignore */
    }
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    try {
      localStorage.setItem(STORAGE_KEY, hidden ? "1" : "0");
    } catch {
      /* ignore */
    }
  }, [hidden, mounted]);

  const toggle = () => setHidden((h) => !h);

  return (
    <div className="flex h-screen bg-stone-50 overflow-hidden">
      {!hidden && (
        <div className="shrink-0 relative">
          <AdminSidebar />
        </div>
      )}
      <main className="flex-1 min-w-0 flex flex-col overflow-hidden relative">
        <button
          type="button"
          onClick={toggle}
          className={`absolute top-4 z-10 flex items-center justify-center w-9 h-9 rounded-lg border border-stone-200 bg-white shadow-sm text-stone-600 hover:bg-stone-50 hover:text-stone-800 transition-colors ${
            hidden ? "left-4" : "left-2"
          }`}
          title={hidden ? "แสดงเมนู" : "ซ่อนเมนู"}
        >
          {hidden ? (
            <span className="text-lg">☰</span>
          ) : (
            <span className="text-sm">◀</span>
          )}
        </button>
        <div className={`flex-1 overflow-y-auto px-6 pt-4 pb-6 ${hidden ? "pl-14" : "pl-10"}`}>
          {children}
        </div>
      </main>
    </div>
  );
}
