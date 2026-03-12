"use client";

import ProductForm from "../ProductForm";
import { useLocale } from "@/context/LocaleContext";

export default function NewProductPage() {
  const { t } = useLocale();
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-stone-800">{t("addProduct", "adminPages")}</h1>
      </div>
      <div className="bg-white rounded-2xl border border-stone-100 p-6 max-w-6xl">
        <ProductForm />
      </div>
    </div>
  );
}
