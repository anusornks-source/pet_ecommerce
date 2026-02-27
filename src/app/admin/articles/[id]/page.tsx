import { use } from "react";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import ArticleForm from "../ArticleForm";

export default async function EditArticlePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const article = await prisma.article.findUnique({ where: { id } });

  if (!article) notFound();

  return (
    <div>
      <h1 className="text-2xl font-bold text-stone-800 mb-6">แก้ไขบทความ</h1>
      <div className="bg-white rounded-2xl border border-stone-100 p-6">
        <ArticleForm
          articleId={article.id}
          initialData={{
            title: article.title,
            slug: article.slug,
            excerpt: article.excerpt ?? "",
            content: article.content,
            coverImage: article.coverImage ?? "",
            published: article.published,
            tags: article.tags,
          }}
        />
      </div>
    </div>
  );
}
