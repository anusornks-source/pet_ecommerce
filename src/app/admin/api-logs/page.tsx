"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useLocale } from "@/context/LocaleContext";

interface ApiLog {
  id: string;
  type: string;
  source: string | null;
  method: string | null;
  path: string;
  statusCode: number | null;
  userId: string | null;
  eventType: string | null;
  eventId: string | null;
  request: object | null;
  response: object | null;
  duration: number | null;
  success: boolean;
  error: string | null;
  ip: string | null;
  createdAt: string;
}

const SOURCE_COLORS: Record<string, string> = {
  STRIPE: "bg-purple-100 text-purple-700",
  ADMIN: "bg-blue-100 text-blue-700",
  INTERNAL: "bg-stone-100 text-stone-600",
  CJ: "bg-orange-100 text-orange-700",
};

const TYPE_COLORS: Record<string, string> = {
  WEBHOOK: "bg-yellow-100 text-yellow-700",
  API: "bg-sky-100 text-sky-700",
};

export default function ApiLogsPage() {
  const [logs, setLogs] = useState<ApiLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [filterType, setFilterType] = useState("");
  const [filterSource, setFilterSource] = useState("");
  const [filterSuccess, setFilterSuccess] = useState("");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");

  const pageSize = 50;
  const totalPages = Math.ceil(total / pageSize);

  const fetchLogs = useCallback(async (p: number, type: string, source: string, success: string, q: string) => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(p) });
    if (type) params.set("type", type);
    if (source) params.set("source", source);
    if (success) params.set("success", success);
    if (q) params.set("search", q);
    const res = await fetch(`/api/admin/api-logs?${params}`);
    const data = await res.json();
    if (data.success) {
      setLogs(data.data);
      setTotal(data.total);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchLogs(page, filterType, filterSource, filterSuccess, search);
  }, [page, filterType, filterSource, filterSuccess, search, fetchLogs]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  };

  const resetFilters = () => {
    setFilterType("");
    setFilterSource("");
    setFilterSuccess("");
    setSearch("");
    setSearchInput("");
    setPage(1);
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-stone-800">🗂️ {t("apiLogs", "adminPages")}</h1>
          <p className="text-sm text-stone-400 mt-1">
            ประวัติการเรียก API และ Webhook ทั้งหมด ({total.toLocaleString()} รายการ)
          </p>
        </div>
        <button
          onClick={() => fetchLogs(page, filterType, filterSource, filterSuccess, search)}
          className="px-3 py-1.5 rounded-lg text-sm border border-stone-200 text-stone-600 hover:bg-stone-50 transition-colors"
        >
          ↻ รีเฟรช
        </button>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <input
          type="text"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="ค้นหา path, event type, user ID, error..."
          className="flex-1 px-3 py-2 text-sm border border-stone-200 rounded-xl focus:outline-none focus:border-orange-400"
        />
        <button type="submit" className="px-4 py-2 bg-orange-500 text-white text-sm rounded-xl hover:bg-orange-600 transition-colors">
          ค้นหา
        </button>
        {(filterType || filterSource || filterSuccess || search) && (
          <button type="button" onClick={resetFilters} className="px-3 py-2 text-sm border border-stone-200 rounded-xl text-stone-500 hover:bg-stone-50">
            ล้าง
          </button>
        )}
      </form>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {/* Type */}
        {["", "API", "WEBHOOK"].map((t) => (
          <button
            key={t || "all-type"}
            onClick={() => { setFilterType(t); setPage(1); }}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${filterType === t && !filterSource && !filterSuccess && !t ? "bg-stone-800 text-white border-stone-800" : filterType === t ? "bg-stone-800 text-white border-stone-800" : "bg-white text-stone-600 border-stone-200 hover:border-stone-400"}`}
          >
            {t || "ทุกประเภท"}
          </button>
        ))}
        <div className="w-px bg-stone-200 mx-1" />
        {/* Source */}
        {["STRIPE", "ADMIN", "INTERNAL"].map((s) => (
          <button
            key={s}
            onClick={() => { setFilterSource(filterSource === s ? "" : s); setPage(1); }}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${filterSource === s ? "bg-stone-800 text-white border-stone-800" : "bg-white text-stone-600 border-stone-200 hover:border-stone-400"}`}
          >
            {s}
          </button>
        ))}
        <div className="w-px bg-stone-200 mx-1" />
        {/* Success */}
        <button
          onClick={() => { setFilterSuccess(filterSuccess === "true" ? "" : "true"); setPage(1); }}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${filterSuccess === "true" ? "bg-green-600 text-white border-green-600" : "bg-white text-stone-600 border-stone-200 hover:border-stone-400"}`}
        >
          ✓ สำเร็จ
        </button>
        <button
          onClick={() => { setFilterSuccess(filterSuccess === "false" ? "" : "false"); setPage(1); }}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${filterSuccess === "false" ? "bg-red-600 text-white border-red-600" : "bg-white text-stone-600 border-stone-200 hover:border-stone-400"}`}
        >
          ✗ ผิดพลาด
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
                  className="flex items-center gap-2.5 px-4 py-3 cursor-pointer hover:bg-stone-50 transition-colors"
                  onClick={() => setExpanded(expanded === log.id ? null : log.id)}
                >
                  {/* Success badge */}
                  <span className={`shrink-0 text-xs font-bold px-2 py-0.5 rounded-full ${log.success ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
                    {log.success ? "✓" : "✗"}
                  </span>

                  {/* Type badge */}
                  <span className={`shrink-0 text-xs font-semibold px-2 py-0.5 rounded ${TYPE_COLORS[log.type] ?? "bg-stone-100 text-stone-600"}`}>
                    {log.type}
                  </span>

                  {/* Source badge */}
                  {log.source && (
                    <span className={`shrink-0 text-xs px-2 py-0.5 rounded ${SOURCE_COLORS[log.source] ?? "bg-stone-100 text-stone-600"}`}>
                      {log.source}
                    </span>
                  )}

                  {/* Method + Path */}
                  <span className="font-mono text-xs text-stone-400 shrink-0">{log.method}</span>
                  <span className="font-mono text-xs text-stone-700 truncate flex-1">{log.path}</span>

                  {/* Event type (webhook) */}
                  {log.eventType && (
                    <span className="text-xs text-stone-400 font-mono shrink-0 truncate max-w-[160px]">{log.eventType}</span>
                  )}

                  {/* Status code */}
                  {log.statusCode && (
                    <span className={`shrink-0 text-xs font-mono px-1.5 py-0.5 rounded ${log.statusCode >= 400 ? "bg-red-50 text-red-600" : "bg-green-50 text-green-700"}`}>
                      {log.statusCode}
                    </span>
                  )}

                  {/* Duration */}
                  {log.duration != null && (
                    <span className="shrink-0 text-xs text-stone-300 font-mono">{log.duration}ms</span>
                  )}

                  {/* userId (audit) */}
                  {log.userId && (
                    <span className="shrink-0 text-xs text-stone-300 font-mono hidden xl:block" title={`User: ${log.userId}`}>
                      👤 {log.userId.slice(-6)}
                    </span>
                  )}

                  {/* Error */}
                  {log.error && (
                    <span className="text-xs text-red-500 truncate max-w-[140px] font-mono">{log.error}</span>
                  )}

                  {/* Timestamp */}
                  <span className="shrink-0 text-xs text-stone-400">
                    {new Date(log.createdAt).toLocaleString("th-TH", {
                      day: "2-digit", month: "short", year: "2-digit",
                      hour: "2-digit", minute: "2-digit", second: "2-digit",
                    })}
                  </span>
                  <span className="text-stone-300 text-xs shrink-0">{expanded === log.id ? "▲" : "▼"}</span>
                </div>

                {expanded === log.id && (
                  <div className="border-t border-stone-100 bg-stone-50/50 divide-y divide-stone-50">
                    {/* Meta */}
                    <div className="px-5 py-3 flex flex-wrap gap-x-6 gap-y-1 text-xs text-stone-500">
                      {log.userId && <span>User ID: <span className="font-mono text-stone-700">{log.userId}</span></span>}
                      {log.ip && <span>IP: <span className="font-mono text-stone-700">{log.ip}</span></span>}
                      {log.eventId && <span>Event ID: <span className="font-mono text-stone-700">{log.eventId}</span></span>}
                      {log.duration != null && <span>Duration: <span className="font-mono text-stone-700">{log.duration}ms</span></span>}
                    </div>
                    {log.error && (
                      <div className="px-5 py-3">
                        <p className="text-xs font-semibold text-red-400 mb-1">Error</p>
                        <p className="text-xs text-red-600 font-mono bg-red-50 rounded-lg p-2">{log.error}</p>
                      </div>
                    )}
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

      {/* Link to CJ logs */}
      <div className="text-center">
        <Link href="/admin/cj-logs" className="text-xs text-stone-400 hover:text-orange-500 transition-colors">
          ดู CJ API Logs →
        </Link>
      </div>
    </div>
  );
}
