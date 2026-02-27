import { prisma } from "@/lib/prisma";
import StoresMapClient from "./StoresMapClient";

export const dynamic = "force-dynamic";

async function getStores() {
  return prisma.store.findMany({ orderBy: { createdAt: "asc" } });
}

export default async function StoresPage() {
  const stores = await getStores();

  return (
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
  );
}
