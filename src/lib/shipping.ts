import { prisma } from "@/lib/prisma";

export interface ShippingResult {
  shipping: number;
  subtotal: number;
  freeShippingMin: number | null;
  /** Message for "ซื้อเพิ่มอีก X เพื่อรับส่งฟรี" - null if already free */
  addForFreeShipping: number | null;
}

/**
 * Calculate shipping for cart items.
 * Groups by shop, applies each shop's shippingFee and freeShippingMin.
 * Total shipping = sum of per-shop shipping.
 */
export async function calculateCartShipping(
  items: Array<{
    productId: string;
    variantId: string | null;
    quantity: number;
    product: { shopId: string; price: number };
    variant?: { price: number } | null;
  }>
): Promise<ShippingResult> {
  if (items.length === 0) {
    return { shipping: 0, subtotal: 0, freeShippingMin: null, addForFreeShipping: null };
  }

  const subtotal = items.reduce(
    (sum, item) => sum + (item.variant?.price ?? item.product.price) * item.quantity,
    0
  );

  const shopIds = [...new Set(items.map((i) => i.product.shopId))];
  const shopSettings = await prisma.shopSettings.findMany({
    where: { shopId: { in: shopIds } },
    select: { shopId: true, shippingFee: true, freeShippingMin: true },
  });
  const settingsByShop = Object.fromEntries(
    shopSettings.map((s) => [
      s.shopId,
      {
        shippingFee: s.shippingFee ?? 0,
        freeShippingMin: s.freeShippingMin ?? 0,
      },
    ])
  );

  let totalShipping = 0;
  const addForFreeList: number[] = [];

  for (const shopId of shopIds) {
    const shopItems = items.filter((i) => i.product.shopId === shopId);
    const shopSubtotal = shopItems.reduce(
      (sum, item) => sum + (item.variant?.price ?? item.product.price) * item.quantity,
      0
    );
    const settings = settingsByShop[shopId] ?? { shippingFee: 0, freeShippingMin: 0 };
    const { shippingFee, freeShippingMin } = settings;

    let shopShipping = 0;
    if (freeShippingMin > 0 && shopSubtotal >= freeShippingMin) {
      shopShipping = 0;
    } else {
      shopShipping = shippingFee;
      if (freeShippingMin > 0 && shopSubtotal < freeShippingMin) {
        addForFreeList.push(freeShippingMin - shopSubtotal);
      }
    }
    totalShipping += shopShipping;
  }

  const maxFreeMin = Math.max(
    ...shopSettings.map((s) => s.freeShippingMin ?? 0),
    0
  );
  const minAddForFree = addForFreeList.length > 0 ? Math.min(...addForFreeList) : 0;

  return {
    shipping: totalShipping,
    subtotal,
    freeShippingMin: maxFreeMin > 0 ? maxFreeMin : null,
    addForFreeShipping: totalShipping > 0 && minAddForFree > 0 ? minAddForFree : null,
  };
}
