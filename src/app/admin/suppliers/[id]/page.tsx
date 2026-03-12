"use client";

import { use, useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import toast from "react-hot-toast";

interface ProductLink {
  id: string;
  productId: string;
  supplierSku: string | null;
  supplierUrl: string | null;
  note: string | null;
  product: {
    id: string;
    name: string;
    name_th: string | null;
    images: string[];
    price: number;
    stock: number;
  };
}

interface Supplier {
  id: string;
  name: string;
  nameTh: string | null;
  contact: string | null;
  website: string | null;
  note: string | null;
  products: ProductLink[];
}

interface ProductOption {
  id: string;
  name: string;
  name_th: string | null;
  images: string[];
}

export default function SupplierDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [loading, setLoading] = useState(true);
  const [productSearch, setProductSearch] = useState("");
  const [productOptions, setProductOptions] = useState<ProductOption[]>([]);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [addingProductId, setAddingProductId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadSupplier = useCallback(() => {
    fetch(`/api/admin/suppliers/${id}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setSupplier(d.data);
      })
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    loadSupplier();
  }, [loadSupplier]);

  const searchProducts = (q: string) => {
    setProductSearch(q);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (!q.trim()) {
      setProductOptions([]);
      return;
    }
    searchTimer.current = setTimeout(async () => {
      const res = await fetch(
        `/api/admin/products?search=${encodeURIComponent(q)}&nameOnly=true&limit=20`
      );
      const data = await res.json();
      const list = data.data ?? data.products ?? [];
      setProductOptions(list);
    }, 300);
  };

  const handleAddProduct = async (productId: string) => {
    setAddingProductId(productId);
    try {
      const res = await fetch(`/api/admin/suppliers/${id}/products`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("เพิ่มสินค้าแล้ว");
        setProductSearch("");
        setProductOptions([]);
        setShowAddProduct(false);
        loadSupplier();
      } else {
        toast.error(data.error || "เพิ่มไม่สำเร็จ");
      }
    } finally {
      setAddingProductId(null);
    }
  };

  const handleRemoveProduct = async (linkId: string, productId: string) => {
    if (!confirm("เอาสินค้าออกจากซัพพลายเออร์นี้?")) return;
    setRemovingId(linkId);
    try {
      const res = await fetch(
        `/api/admin/suppliers/${id}/products/${productId}`,
        { method: "DELETE" }
      );
      const data = await res.json();
      if (data.success) {
        toast.success("เอาออกแล้ว");
        loadSupplier();
      } else {
        toast.error(data.error || "เอาออกไม่สำเร็จ");
      }
    } finally {
      setRemovingId(null);
    }
  };

  const linkedProductIds = new Set(supplier?.products.map((p) => p.productId) ?? []);

  if (loading || !supplier) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="text-center py-16 text-stone-400">
          {loading ? "กำลังโหลด..." : "ไม่พบซัพพลายเออร์"}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/admin/suppliers"
          className="text-sm text-stone-500 hover:text-stone-700"
        >
          ← กลับ
        </Link>
      </div>

      <div className="bg-white border border-stone-200 rounded-2xl p-6">
        <h1 className="text-xl font-bold text-stone-800">{supplier.name}</h1>
        {supplier.nameTh && (
          <p className="text-sm text-stone-500 mt-0.5">{supplier.nameTh}</p>
        )}
        {supplier.contact && (
          <p className="text-sm text-stone-600 mt-2 whitespace-pre-wrap">
            {supplier.contact}
          </p>
        )}
        {supplier.website && (
          <a
            href={supplier.website}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-teal-600 hover:underline mt-2 block"
          >
            {supplier.website}
          </a>
        )}
        {supplier.note && (
          <p className="text-sm text-stone-500 mt-2">{supplier.note}</p>
        )}
      </div>

      <div className="bg-white border border-stone-200 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-stone-800">สินค้าที่ซื้อได้จากซัพพลายเออร์นี้</h2>
          <button
            onClick={() => setShowAddProduct(!showAddProduct)}
            className="text-sm px-3 py-1.5 rounded-lg bg-teal-500 hover:bg-teal-600 text-white font-medium"
          >
            {showAddProduct ? "ยกเลิก" : "+ เพิ่มสินค้า"}
          </button>
        </div>

        {showAddProduct && (
          <div className="mb-6 p-4 bg-stone-50 rounded-xl space-y-2">
            <label className="block text-xs font-semibold text-stone-600">
              ค้นหาสินค้า
            </label>
            <input
              value={productSearch}
              onChange={(e) => searchProducts(e.target.value)}
              placeholder="พิมพ์ชื่อสินค้า..."
              className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-300"
            />
            {productOptions.length > 0 && (
              <div className="max-h-48 overflow-y-auto border border-stone-200 rounded-lg bg-white">
                {productOptions.map((p) => {
                  const isLinked = linkedProductIds.has(p.id);
                  return (
                    <div
                      key={p.id}
                      className="flex items-center gap-3 px-3 py-2 hover:bg-stone-50 border-b border-stone-100 last:border-0"
                    >
                      {p.images?.[0] && (
                        <Image
                          src={p.images[0]}
                          alt=""
                          width={36}
                          height={36}
                          className="w-9 h-9 rounded-lg object-cover shrink-0"
                        />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-stone-800 truncate">
                          {p.name}
                        </p>
                        {p.name_th && (
                          <p className="text-xs text-stone-400 truncate">
                            {p.name_th}
                          </p>
                        )}
                      </div>
                      {isLinked ? (
                        <span className="text-xs text-stone-400">มีอยู่แล้ว</span>
                      ) : (
                        <button
                          onClick={() => handleAddProduct(p.id)}
                          disabled={addingProductId === p.id}
                          className="text-xs px-2 py-1 rounded bg-teal-500 hover:bg-teal-600 text-white font-medium disabled:opacity-50"
                        >
                          {addingProductId === p.id ? "..." : "เพิ่ม"}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {supplier.products.length === 0 ? (
          <div className="text-center py-12 text-stone-400">
            <p className="text-sm">ยังไม่มีสินค้าในซัพพลายเออร์นี้</p>
            <p className="text-xs mt-1">กด &quot;เพิ่มสินค้า&quot; เพื่อ map สินค้า</p>
          </div>
        ) : (
          <div className="space-y-2">
            {supplier.products.map((link) => (
              <div
                key={link.id}
                className="flex items-center gap-4 p-3 rounded-xl border border-stone-100 hover:border-stone-200 transition-colors"
              >
                {link.product.images?.[0] ? (
                  <Image
                    src={link.product.images[0]}
                    alt=""
                    width={48}
                    height={48}
                    className="w-12 h-12 rounded-lg object-cover shrink-0"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-stone-100 flex items-center justify-center text-stone-400 text-lg shrink-0">
                    —
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/admin/products/${link.productId}`}
                    className="font-medium text-stone-800 hover:text-teal-600 truncate block"
                  >
                    {link.product.name}
                  </Link>
                  {link.product.name_th && (
                    <p className="text-xs text-stone-400 truncate">
                      {link.product.name_th}
                    </p>
                  )}
                  <div className="flex gap-3 mt-1 text-xs text-stone-500">
                    <span>฿{link.product.price?.toLocaleString()}</span>
                    {link.supplierSku && (
                      <span>SKU: {link.supplierSku}</span>
                    )}
                    {link.supplierUrl && (
                      <a
                        href={link.supplierUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-teal-600 hover:underline"
                      >
                        ลิงก์
                      </a>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => handleRemoveProduct(link.id, link.productId)}
                  disabled={removingId === link.id}
                  className="text-xs px-2 py-1 rounded text-red-500 hover:bg-red-50 font-medium disabled:opacity-50"
                >
                  {removingId === link.id ? "..." : "เอาออก"}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
