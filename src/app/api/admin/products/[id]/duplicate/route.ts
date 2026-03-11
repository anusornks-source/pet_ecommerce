import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireShopAdmin, isShopAuthResponse } from "@/lib/shopAuth";
import { syncProductImagesToMarketingAssets } from "@/lib/marketingAssets";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireShopAdmin(request);
  if (isShopAuthResponse(auth)) return auth;
  const { shopId } = auth;

  const { id } = await params;

  const product = await prisma.product.findFirst({
    where: { id, shopId },
    include: { variants: true, tags: true },
  });

  if (!product) {
    return NextResponse.json({ success: false, error: "ไม่พบสินค้า" }, { status: 404 });
  }

  const newProduct = await prisma.product.create({
    data: {
      shopId,
      name: `สำเนา: ${product.name}`,
      description: product.description,
      shortDescription: product.shortDescription,
      sourceDescription: product.sourceDescription,
      price: product.price,
      normalPrice: product.normalPrice,
      stock: product.stock,
      images: product.images,
      videos: product.videos ?? [],
      categoryId: product.categoryId,
      petTypeId: product.petTypeId,
      active: false,
      featured: false,
      deliveryDays: product.deliveryDays,
      warehouseCountry: product.warehouseCountry,
      costPrice: product.costPrice,
      sourceData: product.sourceData ?? undefined,
      cjProductId: product.cjProductId,
      source: product.source,
      tags: { connect: product.tags.map((t) => ({ id: t.id })) },
      variants: {
        create: product.variants.map((v) => ({
          size: v.size,
          color: v.color,
          price: v.price,
          stock: v.stock,
          sku: v.sku,
          variantImage: v.variantImage,
          attributes: v.attributes ?? undefined,
          active: v.active,
          cjVid: v.cjVid,
          cjStock: v.cjStock,
        })),
      },
    },
  });

  const variantImages = product.variants.map((v) => v.variantImage).filter(Boolean) as string[];
  const allUrls = [...product.images, ...variantImages];
  if (allUrls.length > 0) {
    await syncProductImagesToMarketingAssets(newProduct.id, shopId, allUrls);
  }

  return NextResponse.json({ success: true, data: { id: newProduct.id } });
}
