import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { shopColorCSS } from "@/lib/shopColorCSS";
import ProductsClient from "./ProductsClient";

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[]>>;
}) {
  const sp = await searchParams;
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
      <Suspense fallback={<div className="max-w-6xl mx-auto px-4 py-8"><div className="animate-pulse h-8 bg-stone-100 rounded w-48 mb-6" /></div>}>
        <ProductsClient />
      </Suspense>
    </>
  );
}
