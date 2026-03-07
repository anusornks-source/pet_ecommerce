import Link from "next/link";
import Image from "next/image";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

import { pickLang, type Lang } from "@/lib/translations";

export const dynamic = "force-dynamic";

async function getArticles(shopId?: string) {
  return prisma.article.findMany({
    where: { published: true, ...(shopId ? { shopId } : {}) },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      title_th: true,
      slug: true,
      excerpt: true,
      excerpt_th: true,
      coverImage: true,
      tags: true,
      createdAt: true,
    },
  });
}

export default async function ArticlesPage({
  searchParams,
}: {
  searchParams: Promise<{ shopSlug?: string }>;
}) {
  const { shopSlug } = await searchParams;
  let shopId: string | undefined;
  if (shopSlug) {
    const shop = await prisma.shop.findUnique({ where: { slug: shopSlug, active: true }, select: { id: true } });
    shopId = shop?.id;
  }
  const articles = await getArticles(shopId);
  const cookieStore = await cookies();
  const lang: Lang = cookieStore.get("lang")?.value === "en" ? "en" : "th";
  const p = (th: string | null | undefined, en: string | null | undefined) => pickLang(th, en, lang);

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-stone-800">{p("บทความ", "Articles")}</h1>
        <p className="text-stone-500 mt-2">{p("ความรู้ เคล็ดลับ และข่าวสารสำหรับเจ้าของสัตว์เลี้ยง", "Tips, knowledge and news for pet owners")}</p>
      </div>

      {articles.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-stone-400">
          <p className="text-5xl mb-4">📝</p>
          <p className="text-lg font-medium">{p("ยังไม่มีบทความในขณะนี้", "No articles yet")}</p>
          <p className="text-sm mt-1">{p("กรุณาติดตามข่าวสารเร็ว ๆ นี้", "Please check back soon")}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {articles.map((article) => {
            const isValidUrl = (() => {
              try { new URL(article.coverImage ?? ""); return true; } catch { return false; }
            })();
            const displayTitle = p(article.title_th, article.title);
            const displayExcerpt = p(article.excerpt_th, article.excerpt);

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
                      alt={displayTitle}
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
                    {displayTitle}
                  </h2>
                  {displayExcerpt && (
                    <p className="text-sm text-stone-500 mt-1.5 line-clamp-2">{displayExcerpt}</p>
                  )}
                  <p className="text-xs text-stone-400 mt-3">
                    {new Date(article.createdAt).toLocaleDateString(lang === "en" ? "en-US" : "th-TH", {
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
