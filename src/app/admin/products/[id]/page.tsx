"use client";

import { useEffect, useState } from "react";
import { use } from "react";
import ProductForm from "../ProductForm";

interface ProductVariant {
  id: string;
  size: string | null;
  color: string | null;
  price: number;
  stock: number;
  sku: string | null;
}

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  images: string[];
  categoryId: string;
  petType: string | null;
  featured: boolean;
  variants: ProductVariant[];
}

export default function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/admin/products/${id}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setProduct(d.data);
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-stone-400 text-sm">กำลังโหลด...</div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="text-center py-16 text-stone-400">ไม่พบสินค้า</div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-stone-800">แก้ไขสินค้า</h1>
        <p className="text-stone-500 text-sm mt-1">{product.name}</p>
      </div>
      <div className="bg-white rounded-2xl border border-stone-100 p-6 max-w-2xl">
        <ProductForm
          productId={id}
          initialData={{
            name: product.name,
            description: product.description,
            price: product.price.toString(),
            stock: product.stock.toString(),
            images: product.images.join(", "),
            categoryId: product.categoryId,
            petType: product.petType || "",
            featured: product.featured,
            variants: product.variants.map((v) => ({
              id: v.id,
              size: v.size ?? "",
              color: v.color ?? "",
              price: v.price.toString(),
              stock: v.stock.toString(),
              sku: v.sku ?? "",
            })),
          }}
        />
      </div>
    </div>
  );
}
