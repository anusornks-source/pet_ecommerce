import { use, Suspense } from "react";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import ArticleForm from "../ArticleForm";
import AdminPageTitle from "@/components/admin/AdminPageTitle";

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
      <AdminPageTitle keyName="editArticle" className="text-2xl font-bold text-stone-800 mb-6" />
      <div className="bg-white rounded-2xl border border-stone-100 p-6">
        <Suspense>
        <ArticleForm
          articleId={article.id}
          initialData={{
            title: article.title,
            title_th: (article as { title_th?: string | null }).title_th ?? "",
            slug: article.slug,
            excerpt: article.excerpt ?? "",
            excerpt_th: (article as { excerpt_th?: string | null }).excerpt_th ?? "",
            content: article.content,
            content_th: (article as { content_th?: string | null }).content_th ?? "",
            coverImage: article.coverImage ?? "",
            published: article.published,
            tags: article.tags,
          }}
        />
        </Suspense>
      </div>
    </div>
  );
}
