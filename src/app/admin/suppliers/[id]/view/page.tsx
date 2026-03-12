"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import Image from "next/image";

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
    images: string[];
    price: number;
    stock: number;
  };
}

interface SupplierProductItem {
  id: string;
  name: string;
  name_th: string | null;
  images: string[];
  supplierPrice: number | null;
  validationStatus: string;
  productId: string | null;
}

interface SupplierDetail {
  id: string;
  name: string;
  nameTh: string | null;
  imageUrl: string | null;
  tel: string | null;
  email: string | null;
  contact: string | null;
  website: string | null;
  note: string | null;
  createdAt: string;
  products: ProductLink[];
}

export default function SupplierViewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [supplier, setSupplier] = useState<SupplierDetail | null>(null);
  const [supplierProducts, setSupplierProducts] = useState<SupplierProductItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setSupplier(null);
    setSupplierProducts([]);
    setLoading(true);
    Promise.all([
      fetch(`/api/admin/suppliers/${id}`).then((r) => r.json()),
      fetch(`/api/admin/suppliers/${id}/supplier-products`).then((r) => r.json()),
    ]).then(([supplierRes, spRes]) => {
      if (supplierRes.success) setSupplier(supplierRes.data);
      if (spRes.success) setSupplierProducts(spRes.data ?? []);
    }).finally(() => setLoading(false));
  }, [id]);

  if (loading || !supplier) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-stone-100 rounded w-48" />
          <div className="h-64 bg-stone-100 rounded-2xl" />
        </div>
      </div>
    );
  }

  const displayName = supplier.nameTh ?? supplier.name;
  const productsCount = supplier.products?.length ?? 0;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      {/* Breadcrumb & Actions */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <Link href="/admin/suppliers" className="text-stone-400 hover:text-stone-600 text-sm">
            ← รายการ Suppliers
          </Link>
          <Link
            href={`/admin/suppliers/${id}`}
            className="text-stone-400 hover:text-stone-600 text-sm"
          >
            แก้ไข
          </Link>
          <h1 className="text-xl font-bold text-stone-800 truncate max-w-md">
            {displayName}
          </h1>
        </div>
        <Link
          href={`/admin/suppliers/${id}`}
          className="text-sm px-3 py-1.5 rounded-lg border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100"
        >
          แก้ไข Supplier
        </Link>
      </div>

      {/* Hero */}
      <div className="bg-white rounded-2xl border border-stone-100 overflow-hidden shadow-sm">
        <div className="p-6 md:p-8 flex flex-col md:flex-row gap-6">
          <div className="w-full md:w-48 shrink-0">
            <div className="relative aspect-square rounded-xl overflow-hidden bg-stone-50 border border-stone-100">
              {supplier.imageUrl ? (
                <Image src={supplier.imageUrl} alt={displayName} fill className="object-cover" sizes="192px" unoptimized />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-5xl text-stone-300">🏪</div>
              )}
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold text-stone-800">{displayName}</h2>
            {supplier.nameTh && supplier.name !== supplier.nameTh && (
              <p className="text-stone-500 text-sm mt-0.5">{supplier.name}</p>
            )}
            <div className="flex flex-wrap gap-3 mt-4">
              <Link
                href={`/admin/suppliers/${id}`}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-stone-100 text-stone-700 hover:bg-stone-200 text-sm font-medium"
              >
                <span>📦 {supplierProducts.length}</span>
                <span>Supplier Products</span>
              </Link>
              <Link
                href={`/admin/suppliers/${id}`}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-green-50 text-green-700 hover:bg-green-100 text-sm font-medium"
              >
                <span>✓ {productsCount}</span>
                <span>Products (Import แล้ว)</span>
              </Link>
            </div>
            <p className="text-xs text-stone-400 mt-4">
              สร้างเมื่อ {new Date(supplier.createdAt).toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" })}
            </p>
          </div>
        </div>
      </div>

      {/* Contact */}
      {(supplier.tel || supplier.email || supplier.website) && (
        <div className="bg-white rounded-2xl border border-stone-100 overflow-hidden shadow-sm">
          <div className="p-6 border-b border-stone-100">
            <h3 className="font-semibold text-stone-800">ข้อมูลติดต่อ</h3>
          </div>
          <div className="p-6 space-y-3">
            {supplier.tel && (
              <p className="text-sm text-stone-700 flex items-center gap-2">
                <span className="text-stone-400">📞</span>
                <a href={`tel:${supplier.tel}`} className="text-teal-600 hover:underline">
                  {supplier.tel}
                </a>
              </p>
            )}
            {supplier.email && (
              <p className="text-sm text-stone-700 flex items-center gap-2">
                <span className="text-stone-400">✉️</span>
                <a href={`mailto:${supplier.email}`} className="text-teal-600 hover:underline">
                  {supplier.email}
                </a>
              </p>
            )}
            {supplier.website && (
              <p className="text-sm text-stone-700 flex items-center gap-2">
                <span className="text-stone-400">🌐</span>
                <a
                  href={supplier.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-teal-600 hover:underline break-all"
                >
                  {supplier.website}
                </a>
              </p>
            )}
          </div>
        </div>
      )}

      {/* Contact / Note */}
      {(supplier.contact || supplier.note) && (
        <div className="bg-white rounded-2xl border border-stone-100 overflow-hidden shadow-sm">
          <div className="p-6 border-b border-stone-100">
            <h3 className="font-semibold text-stone-800">หมายเหตุ</h3>
          </div>
          <div className="p-6 space-y-4">
            {supplier.contact && (
              <div>
                <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1">Contact</p>
                <p className="text-stone-700 text-sm whitespace-pre-wrap">{supplier.contact}</p>
              </div>
            )}
            {supplier.note && (
              <div>
                <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1">Note</p>
                <p className="text-stone-700 text-sm whitespace-pre-wrap">{supplier.note}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Supplier Products */}
      {supplierProducts.length > 0 && (
        <div className="bg-white rounded-2xl border border-stone-100 overflow-hidden shadow-sm">
          <div className="p-6 border-b border-stone-100 flex items-center justify-between">
            <h3 className="font-semibold text-stone-800">Supplier Products ({supplierProducts.length})</h3>
            <Link
              href={`/admin/suppliers/${id}`}
              className="text-sm text-teal-600 hover:text-teal-700 font-medium"
            >
              จัดการ →
            </Link>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {supplierProducts.slice(0, 8).map((sp) => (
                <Link
                  key={sp.id}
                  href={`/admin/supplier-products/${sp.id}/view`}
                  className="group p-3 rounded-xl border border-stone-100 hover:border-orange-200 hover:bg-orange-50/50 transition-colors"
                >
                  <div className="relative aspect-square rounded-lg overflow-hidden bg-stone-50 mb-2">
                    {sp.images?.[0] ? (
                      <Image src={sp.images[0]} alt="" fill className="object-cover group-hover:scale-105 transition-transform" sizes="120px" unoptimized />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-2xl text-stone-300">📦</div>
                    )}
                  </div>
                  <p className="text-xs font-medium text-stone-800 line-clamp-2">{sp.name_th ?? sp.name}</p>
                  <div className="flex items-center justify-between mt-1">
                    {sp.supplierPrice != null ? (
                      <span className="text-xs text-stone-500">฿{sp.supplierPrice.toLocaleString()}</span>
                    ) : (
                      <span className="text-xs text-stone-400">—</span>
                    )}
                    {sp.productId && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-100 text-green-700">✓</span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
            {supplierProducts.length > 8 && (
              <Link
                href={`/admin/suppliers/${id}`}
                className="block text-center text-sm text-stone-500 hover:text-orange-600 mt-4"
              >
                ดูทั้งหมด {supplierProducts.length} รายการ →
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Products (Imported) */}
      {productsCount > 0 && (
        <div className="bg-white rounded-2xl border border-stone-100 overflow-hidden shadow-sm">
          <div className="p-6 border-b border-stone-100 flex items-center justify-between">
            <h3 className="font-semibold text-stone-800">Products ที่ Import แล้ว ({productsCount})</h3>
            <Link
              href={`/admin/suppliers/${id}`}
              className="text-sm text-teal-600 hover:text-teal-700 font-medium"
            >
              จัดการ →
            </Link>
          </div>
          <div className="p-6">
            <div className="space-y-3">
              {supplier.products.slice(0, 5).map((link) => (
                <Link
                  key={link.id}
                  href={`/admin/products/${link.productId}`}
                  className="flex items-center gap-4 p-3 rounded-xl border border-stone-100 hover:border-orange-200 hover:bg-orange-50/50 transition-colors group"
                >
                  <div className="relative w-14 h-14 rounded-lg overflow-hidden bg-stone-100 shrink-0">
                    {link.product.images?.[0] ? (
                      <Image src={link.product.images[0]} alt="" fill className="object-cover" sizes="56px" unoptimized />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-stone-300">📦</div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-stone-800 group-hover:text-orange-600">
                      {link.product.name_th ?? link.product.name}
                    </p>
                    <p className="text-xs text-stone-500">
                      ฿{link.product.price.toLocaleString("th-TH")}
                      {link.supplierPrice != null && (
                        <span className="ml-2">ต้นทุน ฿{link.supplierPrice.toLocaleString("th-TH")}</span>
                      )}
                    </p>
                  </div>
                  <span className="text-stone-400 group-hover:text-orange-500">→</span>
                </Link>
              ))}
            </div>
            {productsCount > 5 && (
              <Link
                href={`/admin/suppliers/${id}`}
                className="block text-center text-sm text-stone-500 hover:text-orange-600 mt-4"
              >
                ดูทั้งหมด {productsCount} รายการ →
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Empty state */}
      {supplierProducts.length === 0 && productsCount === 0 && (
        <div className="bg-white rounded-2xl border border-stone-100 p-12 text-center">
          <p className="text-stone-500 text-sm">ยังไม่มีสินค้าจาก supplier นี้</p>
          <Link
            href={`/admin/suppliers/${id}`}
            className="inline-block mt-3 text-sm text-teal-600 hover:text-teal-700 font-medium"
          >
            เพิ่ม Supplier Product →
          </Link>
        </div>
      )}
    </div>
  );
}
