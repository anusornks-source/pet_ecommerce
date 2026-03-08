import { prisma } from "@/lib/prisma";
import { shopColorCSS } from "@/lib/shopColorCSS";
import ProductDetailClient from "./ProductDetailClient";

export default async function ProductDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[]>>;
}) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const shopSlug = typeof sp.shopSlug === "string" ? sp.shopSlug : undefined;

  let colorStyle: string | null = null;
  if (shopSlug) {
    const settings = await prisma.shopSettings.findFirst({
      where: { shop: { slug: shopSlug } },
      select: { primaryColor: true },
    });
    if (settings) colorStyle = shopColorCSS(settings.primaryColor);
  }

  return (
    <>
      {colorStyle && <style>{colorStyle}</style>}
      <ProductDetailClient id={id} />
    </>
  );
}
