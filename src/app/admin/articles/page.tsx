"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { useShopAdmin } from "@/context/ShopAdminContext";
import Link from "next/link";
import Image from "next/image";
import toast from "react-hot-toast";

interface Article {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  coverImage: string | null;
  published: boolean;
  tags: string[];
  createdAt: string;
}

export default function AdminArticlesPage() {
  const { activeShop, shops, isAdmin } = useShopAdmin();
  const searchParams = useSearchParams();
  const [shopFilter, setShopFilter] = useState<string>(searchParams.get("shopId") ?? "");
  const [articles, setArticles] = useState<Article[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const pageSize = 20;
  const totalPages = Math.ceil(total / pageSize);

  // Init shopFilter from activeShop when not set via URL param
  useEffect(() => {
    if (activeShop?.id && !shopFilter && !searchParams.get("shopId")) setShopFilter(activeShop.id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeShop?.id]);

  const fetchArticles = useCallback(async (p: number) => {
    setLoading(true);
    const sid = shopFilter || activeShop?.id;
    const params = new URLSearchParams({ page: String(p) });
    if (sid) params.set("shopId", sid);
    const res = await fetch(`/api/admin/articles?${params}`);
    const d = await res.json();
    if (d.success) { setArticles(d.data); setTotal(d.total); }
    setLoading(false);
  }, [shopFilter, activeShop?.id]);

  useEffect(() => { fetchArticles(1); }, [fetchArticles]);

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`ลบบทความ "${title}" ใช่ไหม?`)) return;
    const sid = shopFilter || activeShop?.id;
    const qs = sid ? `?shopId=${sid}` : "";
    const res = await fetch(`/api/admin/articles/${id}${qs}`, { method: "DELETE" });
    const data = await res.json();
    if (data.success) {
      toast.success("ลบบทความแล้ว");
      fetchArticles(page);
    } else {
      toast.error("ลบไม่สำเร็จ");
    }
  };

  const handleTogglePublish = async (id: string, published: boolean) => {
    const sid = shopFilter || activeShop?.id;
    const qs = sid ? `?shopId=${sid}` : "";
    const res = await fetch(`/api/admin/articles/${id}${qs}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ published: !published }),
    });
    const data = await res.json();
    if (data.success) {
      toast.success(!published ? "เผยแพร่แล้ว" : "ซ่อนบทความแล้ว");
      fetchArticles(page);
    }
  };

  const isValidUrl = (url: string | null) => {
    if (!url) return false;
    try { new URL(url); return true; } catch { return false; }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-stone-800">บทความ</h1>
          <div className="flex items-center gap-2 mt-0.5">
            <p className="text-sm text-stone-500">{total.toLocaleString()} บทความ</p>
            {(isAdmin || shops.length > 1) ? (
              <select
                value={shopFilter}
                onChange={(e) => { setShopFilter(e.target.value); setPage(1); }}
                className="text-xs border border-stone-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-orange-200 bg-white text-stone-600"
              >
                <option value="">ร้าน: {activeShop?.name ?? "..."}</option>
                {isAdmin && <option value="all">ทั้งหมด (ทุกร้าน)</option>}
                {shops.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            ) : activeShop ? (
              <span className="text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-600 font-medium">ร้าน: {activeShop.name}</span>
            ) : null}
          </div>
        </div>
        <Link
          href={`/admin/articles/new${(shopFilter && shopFilter !== "all") ? `?shopId=${shopFilter}` : activeShop ? `?shopId=${activeShop.id}` : ""}`}
          className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors"
        >
          + เพิ่มบทความ
        </Link>
      </div>

      <div className="bg-white rounded-2xl border border-stone-100 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-stone-400">กำลังโหลด...</div>
        ) : articles.length === 0 ? (
          <div className="p-12 text-center text-stone-400">
            <p className="text-4xl mb-3">📝</p>
            <p>ยังไม่มีบทความ</p>
            <Link href={`/admin/articles/new${(shopFilter && shopFilter !== "all") ? `?shopId=${shopFilter}` : activeShop ? `?shopId=${activeShop.id}` : ""}`} className="text-orange-500 hover:underline text-sm mt-2 inline-block">
              เพิ่มบทความแรก →
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-stone-50">
            {articles.map((article) => (
              <div key={article.id} className="flex items-center gap-4 px-5 py-4 hover:bg-stone-50/50">
                {/* Cover */}
                <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-stone-100 border border-stone-100 shrink-0">
                  {isValidUrl(article.coverImage) ? (
                    <Image src={article.coverImage!} alt="" fill className="object-cover" sizes="56px" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xl">📄</div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-stone-800 text-sm truncate">{article.title}</p>
                  {article.excerpt && (
                    <p className="text-xs text-stone-400 line-clamp-1 mt-0.5">{article.excerpt}</p>
                  )}
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-stone-400">
                      {new Date(article.createdAt).toLocaleDateString("th-TH", {
                        day: "numeric", month: "short", year: "numeric",
                      })}
                    </span>
                    {article.tags.slice(0, 3).map((tag) => (
                      <span key={tag} className="text-xs bg-orange-50 text-orange-500 px-2 py-0.5 rounded-full">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Status + Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleTogglePublish(article.id, article.published)}
                    className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                      article.published
                        ? "bg-green-50 border-green-200 text-green-600 hover:bg-green-100"
                        : "bg-stone-50 border-stone-200 text-stone-500 hover:bg-stone-100"
                    }`}
                  >
                    {article.published ? "🌐 เผยแพร่" : "🔒 ซ่อน"}
                  </button>
                  <Link
                    href={`/admin/articles/${article.id}`}
                    className="text-xs px-3 py-1.5 rounded-lg border border-stone-200 hover:bg-stone-50 transition-colors text-stone-600"
                  >
                    แก้ไข
                  </Link>
                  <button
                    onClick={() => handleDelete(article.id, article.title)}
                    className="text-xs px-3 py-1.5 rounded-lg border border-red-100 hover:bg-red-50 transition-colors text-red-500"
                  >
                    ลบ
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-1 mt-4">
          <button disabled={page === 1} onClick={() => { setPage(page - 1); fetchArticles(page - 1); }} className="px-3 py-1.5 rounded-lg text-sm border border-stone-200 text-stone-600 hover:bg-stone-50 disabled:opacity-30 disabled:cursor-not-allowed">←</button>
          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 2)
            .reduce<(number | "...")[]>((acc, p, i, arr) => {
              if (i > 0 && p - (arr[i - 1] as number) > 1) acc.push("...");
              acc.push(p);
              return acc;
            }, [])
            .map((p, i) => p === "..." ? (
              <span key={`e-${i}`} className="px-2 text-stone-300">…</span>
            ) : (
              <button key={p} onClick={() => { setPage(p as number); fetchArticles(p as number); }} className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${page === p ? "bg-stone-800 text-white border-stone-800" : "border-stone-200 text-stone-600 hover:bg-stone-50"}`}>{p}</button>
            ))}
          <button disabled={page === totalPages} onClick={() => { setPage(page + 1); fetchArticles(page + 1); }} className="px-3 py-1.5 rounded-lg text-sm border border-stone-200 text-stone-600 hover:bg-stone-50 disabled:opacity-30 disabled:cursor-not-allowed">→</button>
        </div>
      )}
    </div>
  );
}
