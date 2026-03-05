import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import ShareButtons from "@/components/ShareButtons";
import { pickLang, type Lang } from "@/lib/translations";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

async function getArticle(slug: string) {
  return prisma.article.findUnique({
    where: { slug, published: true },
  });
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const article = await getArticle(slug);
  if (!article) return {};
  return {
    title: article.title,
    description: article.excerpt ?? undefined,
    openGraph: {
      title: article.title,
      description: article.excerpt ?? undefined,
      images: article.coverImage ? [{ url: article.coverImage }] : [],
      type: "article",
    },
  };
}

export default async function ArticleDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const article = await getArticle(slug);

  if (!article) notFound();

  const cookieStore = await cookies();
  const lang: Lang = cookieStore.get("lang")?.value === "en" ? "en" : "th";
  const p = (th: string | null | undefined, en: string | null | undefined) => pickLang(th, en, lang);

  const displayTitle = p((article as { title_th?: string | null }).title_th, article.title);
  const displayExcerpt = p((article as { excerpt_th?: string | null }).excerpt_th, article.excerpt);
  const displayContent = p((article as { content_th?: string | null }).content_th, article.content) ?? article.content;

  const isValidUrl = (() => {
    try { new URL(article.coverImage ?? ""); return true; } catch { return false; }
  })();

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      {/* Back */}
      <Link
        href="/articles"
        className="inline-flex items-center gap-1.5 text-sm text-stone-500 hover:text-orange-500 transition-colors mb-6"
      >
        ← {p("กลับหน้าบทความ", "Back to Articles")}
      </Link>

      {/* Tags */}
      {article.tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {article.tags.map((tag) => (
            <span key={tag} className="text-xs bg-orange-50 text-orange-500 px-3 py-1 rounded-full">
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Title */}
      <h1 className="text-3xl md:text-4xl font-bold text-stone-800 leading-tight mb-3">
        {displayTitle}
      </h1>

      {/* Date */}
      <p className="text-sm text-stone-400 mb-6">
        {new Date(article.createdAt).toLocaleDateString(lang === "en" ? "en-US" : "th-TH", {
          weekday: "long", day: "numeric", month: "long", year: "numeric",
        })}
      </p>

      {/* Cover image */}
      {isValidUrl && (
        <div className="relative w-full h-64 md:h-80 rounded-2xl overflow-hidden mb-8 bg-stone-100">
          <Image
            src={article.coverImage!}
            alt={displayTitle}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 768px"
            priority
          />
        </div>
      )}

      {/* Excerpt */}
      {displayExcerpt && (
        <p className="text-lg text-stone-600 leading-relaxed mb-6 border-l-4 border-orange-300 pl-4 italic">
          {displayExcerpt}
        </p>
      )}

      {/* Share */}
      <div className="mb-8">
        <ShareButtons
          url={`/articles/${article.slug}`}
          title={displayTitle}
          image={article.coverImage ?? undefined}
        />
      </div>

      {/* Content */}
      <article className="prose prose-stone prose-headings:font-bold prose-a:text-orange-500 prose-a:no-underline hover:prose-a:underline prose-img:rounded-xl max-w-none">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {displayContent}
        </ReactMarkdown>
      </article>

      {/* Footer */}
      <div className="mt-12 pt-6 border-t border-stone-100 flex items-center justify-between">
        <Link
          href="/articles"
          className="text-sm text-orange-500 hover:text-orange-600 font-medium"
        >
          ← {p("ดูบทความทั้งหมด", "View All Articles")}
        </Link>
        <Link
          href="/products"
          className="text-sm bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-xl transition-colors"
        >
          {p("ช้อปสินค้า 🛒", "Shop Now 🛒")}
        </Link>
      </div>
    </div>
  );
}
