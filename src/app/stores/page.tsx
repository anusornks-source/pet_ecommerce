import { prisma } from "@/lib/prisma";
import { shopColorCSS } from "@/lib/shopColorCSS";
import StoresMapClient from "./StoresMapClient";

export const dynamic = "force-dynamic";

async function getStores(shopId?: string) {
  return prisma.store.findMany({
    where: shopId ? { shopId } : undefined,
    orderBy: { createdAt: "asc" },
  });
}

export default async function StoresPage({
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
  const stores = await getStores(shopId);

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
    <div className="max-w-6xl mx-auto px-4 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-stone-800">สาขาของเรา</h1>
        <p className="text-stone-500 mt-2">
          {stores.length > 0
            ? `เรามี ${stores.length} สาขา พร้อมให้บริการ`
            : "กำลังเปิดสาขาเร็ว ๆ นี้"}
        </p>
      </div>

      {stores.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-stone-400">
          <p className="text-5xl mb-4">📍</p>
          <p className="text-lg font-medium">ยังไม่มีสาขาในขณะนี้</p>
          <p className="text-sm mt-1">กรุณาติดตามข่าวสารเร็ว ๆ นี้</p>
        </div>
      ) : (
        <StoresMapClient stores={stores} />
      )}
    </div>
    </>
  );
}
