"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useLocale } from "@/context/LocaleContext";

interface CjLog {
  id: string;
  orderId: string | null;
  action: string;
  request: object | null;
  response: object | null;
  success: boolean;
  error: string | null;
  createdAt: string;
  order: { id: string } | null;
}

const ACTION_COLORS: Record<string, string> = {
  createOrder: "bg-blue-100 text-blue-700",
  syncTracking: "bg-purple-100 text-purple-700",
  cancelOrder: "bg-red-100 text-red-700",
};

export default function CjLogsPage() {
  const [logs, setLogs] = useState<CjLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [expandedLog, setExpandedLog] = useState<string | null>(null);
  const [filterAction, setFilterAction] = useState("");
  const [filterSuccess, setFilterSuccess] = useState("");

  const pageSize = 30;
  const totalPages = Math.ceil(total / pageSize);

  const fetchLogs = useCallback(async (p: number, action: string, success: string) => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(p) });
    if (action) params.set("action", action);
    if (success) params.set("success", success);
    const res = await fetch(`/api/admin/cj-logs?${params}`);
    const data = await res.json();
    if (data.success) {
      setLogs(data.data);
      setTotal(data.total);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchLogs(page, filterAction, filterSuccess);
  }, [page, filterAction, filterSuccess, fetchLogs]);

  const handleFilter = (action: string, success: string) => {
    setFilterAction(action);
    setFilterSuccess(success);
    setPage(1);
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-stone-800">📋 {t("cjLogs", "adminPages")}</h1>
        <p className="text-sm text-stone-400 mt-1">ประวัติการเรียก CJ Dropshipping API ทั้งหมด ({total.toLocaleString()} รายการ)</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => handleFilter("", "")}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${!filterAction && !filterSuccess ? "bg-stone-800 text-white border-stone-800" : "bg-white text-stone-600 border-stone-200 hover:border-stone-400"}`}
        >
          ทั้งหมด
        </button>
        {["createOrder", "syncTracking", "cancelOrder"].map((a) => (
          <button
            key={a}
            onClick={() => handleFilter(a, filterSuccess)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${filterAction === a ? "bg-stone-800 text-white border-stone-800" : "bg-white text-stone-600 border-stone-200 hover:border-stone-400"}`}
          >
            {a}
          </button>
        ))}
        <div className="w-px bg-stone-200 mx-1" />
        <button
          onClick={() => handleFilter(filterAction, "true")}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${filterSuccess === "true" ? "bg-green-600 text-white border-green-600" : "bg-white text-stone-600 border-stone-200 hover:border-stone-400"}`}
        >
          ✓ สำเร็จ
        </button>
        <button
          onClick={() => handleFilter(filterAction, "false")}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${filterSuccess === "false" ? "bg-red-600 text-white border-red-600" : "bg-white text-stone-600 border-stone-200 hover:border-stone-400"}`}
        >
          ✗ ล้มเหลว
        </button>
      </div>

      {/* Log list */}
      <div className="bg-white rounded-2xl border border-stone-100 overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-stone-400 text-sm">กำลังโหลด...</div>
        ) : logs.length === 0 ? (
          <div className="p-10 text-center text-stone-400 text-sm">ไม่พบ log</div>
        ) : (
          <div className="divide-y divide-stone-100">
            {logs.map((log) => (
              <div key={log.id}>
                <div
                  className="flex items-center gap-3 px-5 py-3 cursor-pointer hover:bg-stone-50 transition-colors"
                  onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
                >
                  {/* Success badge */}
                  <span className={`shrink-0 text-xs font-bold px-2 py-0.5 rounded-full ${log.success ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
                    {log.success ? "✓" : "✗"}
                  </span>

                  {/* Action badge */}
                  <span className={`shrink-0 font-mono text-xs px-2 py-0.5 rounded ${ACTION_COLORS[log.action] ?? "bg-stone-100 text-stone-600"}`}>
                    {log.action}
                  </span>

                  {/* Order link */}
                  {log.orderId ? (
                    <Link
                      href={`/admin/orders/${log.orderId}`}
                      className="text-xs text-blue-500 hover:underline font-mono shrink-0"
                      onClick={(e) => e.stopPropagation()}
                    >
                      #{log.orderId.slice(-8).toUpperCase()}
                    </Link>
                  ) : (
                    <span className="text-xs text-stone-300 shrink-0">—</span>
                  )}

                  {/* Error message (if any) */}
                  {log.error && (
                    <span className="text-xs text-red-500 truncate flex-1 font-mono">{log.error}</span>
                  )}
                  {!log.error && <span className="flex-1" />}

                  {/* Timestamp */}
                  <span className="shrink-0 text-xs text-stone-400">
                    {new Date(log.createdAt).toLocaleString("th-TH", {
                      day: "2-digit", month: "short", year: "2-digit",
                      hour: "2-digit", minute: "2-digit", second: "2-digit",
                    })}
                  </span>
                  <span className="text-stone-300 text-xs">{expandedLog === log.id ? "▲" : "▼"}</span>
                </div>

                {expandedLog === log.id && (
                  <div className="border-t border-stone-100 divide-y divide-stone-50 bg-stone-50/50">
                    {log.request !== null && (
                      <div className="px-5 py-3">
                        <p className="text-xs font-semibold text-stone-400 mb-1.5">Request →</p>
                        <pre className="text-[10px] text-stone-600 bg-white rounded-lg p-3 overflow-x-auto whitespace-pre-wrap break-all border border-stone-100">
                          {JSON.stringify(log.request, null, 2)}
                        </pre>
                      </div>
                    )}
                    {log.response !== null && (
                      <div className="px-5 py-3">
                        <p className="text-xs font-semibold text-stone-400 mb-1.5">Response ←</p>
                        <pre className="text-[10px] text-stone-600 bg-white rounded-lg p-3 overflow-x-auto whitespace-pre-wrap break-all border border-stone-100">
                          {JSON.stringify(log.response, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-1">
          <button
            disabled={page === 1}
            onClick={() => setPage(page - 1)}
            className="px-3 py-1.5 rounded-lg text-sm border border-stone-200 text-stone-600 hover:bg-stone-50 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            ←
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 2)
            .reduce<(number | "...")[]>((acc, p, i, arr) => {
              if (i > 0 && p - (arr[i - 1] as number) > 1) acc.push("...");
              acc.push(p);
              return acc;
            }, [])
            .map((p, i) =>
              p === "..." ? (
                <span key={`ellipsis-${i}`} className="px-2 text-stone-300">…</span>
              ) : (
                <button
                  key={p}
                  onClick={() => setPage(p as number)}
                  className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${page === p ? "bg-stone-800 text-white border-stone-800" : "border-stone-200 text-stone-600 hover:bg-stone-50"}`}
                >
                  {p}
                </button>
              )
            )}
          <button
            disabled={page === totalPages}
            onClick={() => setPage(page + 1)}
            className="px-3 py-1.5 rounded-lg text-sm border border-stone-200 text-stone-600 hover:bg-stone-50 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            →
          </button>
        </div>
      )}
    </div>
  );
}
