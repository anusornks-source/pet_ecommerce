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
  supplierPrice: number | null;
  note: string | null;
  product: {
    id: string;
    name: string;
    name_th: string | null;
    shortDescription: string | null;
    shortDescription_th: string | null;
    cjProductId: string | null;
    images: string[];
    price: number;
    stock: number;
    costPrice: number | null;
  };
}

interface Supplier {
  id: string;
  name: string;
  nameTh: string | null;
  imageUrl: string | null;
  tel: string | null;
  email: string | null;
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
  const [editingPriceId, setEditingPriceId] = useState<string | null>(null);
  const [editPriceValue, setEditPriceValue] = useState("");
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
    if (!confirm("Remove this product from supplier?")) return;
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

  const startEditPrice = (link: ProductLink) => {
    setEditingPriceId(link.id);
    setEditPriceValue(link.supplierPrice != null ? String(link.supplierPrice) : "");
  };

  const handleSaveSupplierPrice = async (productId: string) => {
    if (!editingPriceId) return;
    const num = editPriceValue.trim() ? parseFloat(editPriceValue) : null;
    if (editPriceValue.trim() && (isNaN(num!) || num! < 0)) {
      toast.error("กรุณากรอกราคาที่ถูกต้อง");
      return;
    }
    const savedValue = num;
    setEditingPriceId(null);
    setEditPriceValue("");
    try {
      const res = await fetch(`/api/admin/suppliers/${id}/products/${productId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ supplierPrice: num }),
      });
      const data = await res.json().catch(() => ({}));
      if (data.success) {
        toast.success("บันทึกราคาแล้ว");
        setSupplier((prev) =>
          prev
            ? {
                ...prev,
                products: prev.products.map((p) =>
                  p.productId === productId ? { ...p, supplierPrice: savedValue } : p
                ),
              }
            : null
        );
      } else {
        toast.error(data.error || "บันทึกไม่สำเร็จ");
      }
    } catch (err) {
      toast.error("เกิดข้อผิดพลาด");
    }
  };

  const linkedProductIds = new Set(supplier?.products.map((p) => p.productId) ?? []);

  if (loading || !supplier) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="text-center py-16 text-stone-400">
          {loading ? "Loading..." : "Supplier not found"}
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
        <div className="flex items-start gap-4">
          {supplier.imageUrl ? (
            <div className="relative w-20 h-20 rounded-xl overflow-hidden border border-stone-100 shrink-0">
              <Image src={supplier.imageUrl} alt="" fill className="object-cover" sizes="80px" />
            </div>
          ) : (
            <div className="w-20 h-20 rounded-xl bg-stone-100 flex items-center justify-center text-3xl shrink-0">
              🏭
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-bold text-stone-800">{supplier.name}</h1>
            {supplier.nameTh && (
              <p className="text-sm text-stone-500 mt-0.5">{supplier.nameTh}</p>
            )}
          </div>
        </div>
        {(supplier.tel || supplier.email) && (
          <div className="flex flex-wrap gap-4 mt-4 text-sm text-stone-600">
            {supplier.tel && (
              <span>📞 {supplier.tel}</span>
            )}
            {supplier.email && (
              <a href={`mailto:${supplier.email}`} className="text-teal-600 hover:underline">
                ✉️ {supplier.email}
              </a>
            )}
          </div>
        )}
        {supplier.contact && (
          <p className="text-sm text-stone-600 mt-4 whitespace-pre-wrap">
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
          <h2 className="font-bold text-stone-800">Products available from this supplier</h2>
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
            <p className="text-sm">No products in this supplier yet</p>
            <p className="text-xs mt-1">กด &quot;เพิ่มสินค้า&quot; เพื่อ map สินค้า</p>
          </div>
        ) : (
          <div className="space-y-3">
            {supplier.products.map((link) => {
              const sellPrice = link.product.price;
              const supplierPriceVal = link.supplierPrice;
              const profit = supplierPriceVal != null ? sellPrice - supplierPriceVal : null;
              const isEditing = editingPriceId === link.id;
              return (
                <div
                  key={link.id}
                  className="p-4 rounded-xl border border-stone-100 hover:border-stone-200 transition-colors"
                >
                  <div className="flex items-start gap-4">
                    {link.product.images?.[0] ? (
                      <Image
                        src={link.product.images[0]}
                        alt=""
                        width={64}
                        height={64}
                        className="w-16 h-16 rounded-lg object-cover shrink-0"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-lg bg-stone-100 flex items-center justify-center text-stone-400 text-xl shrink-0">
                        —
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/admin/products/${link.productId}`}
                        className="font-medium text-stone-800 hover:text-teal-600 block"
                      >
                        {link.product.name}
                      </Link>
                      {link.product.name_th && (
                        <p className="text-sm text-stone-500">{link.product.name_th}</p>
                      )}
                      {(link.product.shortDescription || link.product.shortDescription_th) && (
                        <p className="text-xs text-stone-500 mt-1 line-clamp-2">
                          {link.product.shortDescription_th ?? link.product.shortDescription ?? ""}
                        </p>
                      )}
                      <div className="flex flex-wrap gap-2 mt-2 text-xs">
                        {link.product.cjProductId && (
                          <span className="font-mono text-stone-400 bg-stone-100 px-1.5 py-0.5 rounded">
                            PID: {link.product.cjProductId}
                          </span>
                        )}
                        {link.supplierSku && (
                          <span className="text-stone-500">SKU: {link.supplierSku}</span>
                        )}
                        {link.supplierUrl && (
                          <a
                            href={link.supplierUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-teal-600 hover:underline"
                          >
                            ลิงก์ Supplier
                          </a>
                        )}
                      </div>
                    </div>
                    <div className="shrink-0 text-right space-y-1">
                      <div className="flex items-center gap-2 justify-end">
                        <span className="text-xs text-stone-400">ราคาขาย:</span>
                        <span className="text-sm font-semibold text-stone-800">
                          ฿{sellPrice.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 justify-end">
                        <span className="text-xs text-stone-400">Supplier ขาย:</span>
                        {isEditing ? (
                          <span className="flex items-center gap-1">
                            <input
                              type="number"
                              value={editPriceValue}
                              onChange={(e) => setEditPriceValue(e.target.value)}
                              className="w-20 text-sm border border-stone-200 rounded px-2 py-0.5"
                              placeholder="0"
                              step="0.01"
                              min="0"
                              autoFocus
                            />
                            <button
                              onClick={() => handleSaveSupplierPrice(link.productId)}
                              className="text-xs px-2 py-0.5 rounded bg-teal-500 text-white"
                            >
                              บันทึก
                            </button>
                            <button
                              onClick={() => { setEditingPriceId(null); setEditPriceValue(""); }}
                              className="text-xs text-stone-500 hover:text-stone-700"
                            >
                              ยกเลิก
                            </button>
                          </span>
                        ) : (
                          <span className="text-sm font-medium text-stone-600">
                            {supplierPriceVal != null ? (
                              <>
                                ฿{supplierPriceVal.toLocaleString()}
                                <button
                                  onClick={() => startEditPrice(link)}
                                  className="ml-1 text-teal-500 hover:text-teal-600 text-xs"
                                >
                                  แก้ไข
                                </button>
                              </>
                            ) : (
                              <button
                                onClick={() => startEditPrice(link)}
                                className="text-teal-500 hover:text-teal-600 text-xs"
                              >
                                + ใส่ราคา
                              </button>
                            )}
                          </span>
                        )}
                      </div>
                      {profit != null && (
                        <div className="flex items-center gap-2 justify-end">
                          <span className="text-xs text-stone-400">กำไร:</span>
                          <span className={`text-sm font-semibold ${profit >= 0 ? "text-green-600" : "text-red-600"}`}>
                            ฿{profit.toLocaleString()}
                          </span>
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => handleRemoveProduct(link.id, link.productId)}
                      disabled={removingId === link.id}
                      className="text-xs px-2 py-1 rounded text-red-500 hover:bg-red-50 font-medium disabled:opacity-50 shrink-0"
                    >
                      {removingId === link.id ? "..." : "เอาออก"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
