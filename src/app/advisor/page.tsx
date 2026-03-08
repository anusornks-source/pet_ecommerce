import { prisma } from "@/lib/prisma";
import { shopColorCSS } from "@/lib/shopColorCSS";
import AdvisorClient from "./AdvisorClient";

export default async function AdvisorPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[]>>;
}) {
  const sp = await searchParams;
  const shopId = typeof sp.shopId === "string" ? sp.shopId : undefined;

  let colorStyle: string | null = null;
  if (shopId) {
    const settings = await prisma.shopSettings.findFirst({
      where: { shopId },
      select: { primaryColor: true },
    });
    if (settings) colorStyle = shopColorCSS(settings.primaryColor);
  }

  return (
    <>
      {colorStyle && <style>{colorStyle}</style>}
      <AdvisorClient />
    </>
  );
}
