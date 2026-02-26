"use client";

import { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import toast from "react-hot-toast";

interface Product {
  id: string;
  name: string;
  price: number;
  stock: number;
  images: string[];
  featured: boolean;
  petType: string | null;
  category: { name: string };
}

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    const res = await fetch(
      `/api/admin/products?search=${encodeURIComponent(search)}`
    );
    const data = await res.json();
    if (data.success) setProducts(data.data);
    setLoading(false);
  }, [search]);

  useEffect(() => {
    const timer = setTimeout(fetchProducts, 300);
    return () => clearTimeout(timer);
  }, [fetchProducts]);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`ลบสินค้า "${name}" ใช่หรือไม่?`)) return;
    setDeleting(id);
    const res = await fetch(`/api/admin/products/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (data.success) {
      toast.success("ลบสินค้าแล้ว");
      setProducts((prev) => prev.filter((p) => p.id !== id));
    } else {
      toast.error(data.error || "เกิดข้อผิดพลาด");
    }
    setDeleting(null);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-stone-800">สินค้า</h1>
          <p className="text-stone-500 text-sm mt-1">
            {products.length} รายการ
          </p>
        </div>
        <Link
          href="/admin/products/new"
          className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors"
        >
          + เพิ่มสินค้า
        </Link>
      </div>

      {/* Search */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="ค้นหาสินค้า..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-sm border border-stone-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-stone-100 overflow-hidden">
        {loading ? (
          <div className="text-center py-16 text-stone-400 text-sm">
            กำลังโหลด...
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-16 text-stone-400 text-sm">
            ไม่พบสินค้า
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone-100 bg-stone-50">
                <th className="text-left px-4 py-3 text-stone-500 font-medium">
                  สินค้า
                </th>
                <th className="text-left px-4 py-3 text-stone-500 font-medium hidden md:table-cell">
                  หมวดหมู่
                </th>
                <th className="text-right px-4 py-3 text-stone-500 font-medium">
                  ราคา
                </th>
                <th className="text-right px-4 py-3 text-stone-500 font-medium hidden sm:table-cell">
                  สต็อก
                </th>
                <th className="text-center px-4 py-3 text-stone-500 font-medium hidden lg:table-cell">
                  แนะนำ
                </th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-50">
              {products.map((product) => (
                <tr key={product.id} className="hover:bg-stone-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="relative w-10 h-10 rounded-lg overflow-hidden bg-stone-100 shrink-0">
                        {product.images[0] ? (
                          <Image
                            src={product.images[0]}
                            alt={product.name}
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <div className="flex items-center justify-center h-full text-stone-300 text-lg">
                            📦
                          </div>
                        )}
                      </div>
                      <span className="font-medium text-stone-800 line-clamp-1">
                        {product.name}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-stone-500 hidden md:table-cell">
                    {product.category.name}
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-stone-800">
                    ฿{product.price.toLocaleString("th-TH")}
                  </td>
                  <td className="px-4 py-3 text-right text-stone-500 hidden sm:table-cell">
                    {product.stock}
                  </td>
                  <td className="px-4 py-3 text-center hidden lg:table-cell">
                    {product.featured ? (
                      <span className="text-orange-500">⭐</span>
                    ) : (
                      <span className="text-stone-200">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/admin/products/${product.id}`}
                        className="text-xs px-3 py-1.5 rounded-lg border border-stone-200 text-stone-600 hover:bg-stone-50 transition-colors"
                      >
                        แก้ไข
                      </Link>
                      <button
                        onClick={() => handleDelete(product.id, product.name)}
                        disabled={deleting === product.id}
                        className="text-xs px-3 py-1.5 rounded-lg border border-red-100 text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
                      >
                        ลบ
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
