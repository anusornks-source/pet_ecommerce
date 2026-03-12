"use client";

import { Suspense } from "react";
import ArticleForm from "../ArticleForm";
import { useLocale } from "@/context/LocaleContext";

export default function NewArticlePage() {
  const { t } = useLocale();
  return (
    <div>
      <h1 className="text-2xl font-bold text-stone-800 mb-6">{t("addArticle", "adminPages")}</h1>
      <div className="bg-white rounded-2xl border border-stone-100 p-6">
        <Suspense>
          <ArticleForm />
        </Suspense>
      </div>
    </div>
  );
}
