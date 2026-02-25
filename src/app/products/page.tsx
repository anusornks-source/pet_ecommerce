import { Suspense } from "react";
import ProductsClient from "./ProductsClient";

export default function ProductsPage() {
  return (
    <Suspense fallback={<div className="max-w-6xl mx-auto px-4 py-8"><div className="animate-pulse h-8 bg-stone-100 rounded w-48 mb-6" /></div>}>
      <ProductsClient />
    </Suspense>
  );
}
