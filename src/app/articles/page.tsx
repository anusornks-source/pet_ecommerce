import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

async function getArticles() {
  return prisma.article.findMany({
    where: { published: true },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      slug: true,
      excerpt: true,
      coverImage: true,
      tags: true,
      createdAt: true,
    },
  });
}

export default async function ArticlesPage() {
  const articles = await getArticles();

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-stone-800">บทความ</h1>
        <p className="text-stone-500 mt-2">ความรู้ เคล็ดลับ และข่าวสารสำหรับเจ้าของสัตว์เลี้ยง</p>
      </div>

      {articles.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-stone-400">
          <p className="text-5xl mb-4">📝</p>
          <p className="text-lg font-medium">ยังไม่มีบทความในขณะนี้</p>
          <p className="text-sm mt-1">กรุณาติดตามข่าวสารเร็ว ๆ นี้</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {articles.map((article) => {
            const isValidUrl = (() => {
              try { new URL(article.coverImage ?? ""); return true; } catch { return false; }
            })();

            return (
              <Link
                key={article.id}
                href={`/articles/${article.slug}`}
                className="group bg-white rounded-2xl border border-stone-100 overflow-hidden hover:shadow-md hover:border-orange-200 transition-all"
              >
                {/* Cover */}
                <div className="relative w-full h-44 bg-gradient-to-br from-orange-50 to-amber-50">
                  {isValidUrl ? (
                    <Image
                      src={article.coverImage!}
                      alt={article.title}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                      sizes="(max-width: 768px) 100vw, 33vw"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-4xl">📄</div>
                  )}
                </div>

                {/* Content */}
                <div className="p-4">
                  {article.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {article.tags.slice(0, 3).map((tag) => (
                        <span key={tag} className="text-xs bg-orange-50 text-orange-500 px-2 py-0.5 rounded-full">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                  <h2 className="font-semibold text-stone-800 group-hover:text-orange-500 transition-colors line-clamp-2 leading-snug">
                    {article.title}
                  </h2>
                  {article.excerpt && (
                    <p className="text-sm text-stone-500 mt-1.5 line-clamp-2">{article.excerpt}</p>
                  )}
                  <p className="text-xs text-stone-400 mt-3">
                    {new Date(article.createdAt).toLocaleDateString("th-TH", {
                      day: "numeric", month: "long", year: "numeric",
                    })}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
