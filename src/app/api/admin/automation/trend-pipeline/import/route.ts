import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, isNextResponse } from "@/lib/adminAuth";
import { prisma } from "@/lib/prisma";
import { syncProductImagesToMarketingAssets } from "@/lib/marketingAssets";
import { generateFullDescEn, generateFullDescTh, generateNameTh } from "@/lib/aiDescriptions";

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (isNextResponse(auth)) return auth;

  const { candidateId, categoryId, petTypeId, shopId, price } = await request.json();

  if (!candidateId) {
    return NextResponse.json({ success: false, error: "candidateId required" }, { status: 400 });
  }

  const candidate = await prisma.trendCandidate.findUnique({ where: { id: candidateId } });
  if (!candidate || candidate.status !== "enriched") {
    return NextResponse.json({ success: false, error: "Candidate not found or not enriched" }, { status: 400 });
  }

  if (!categoryId || !shopId) {
    return NextResponse.json({ success: false, error: "categoryId and shopId required" }, { status: 400 });
  }

  try {
    // Create Product from enriched candidate data
    const productImages = candidate.productImage ? [candidate.productImage] : [];
    const sourceDesc = candidate.description || candidate.productName;
    const [description, description_th, name_th] = await Promise.all([
      generateFullDescEn(candidate.productName, sourceDesc),
      candidate.description_th ?? generateFullDescTh(candidate.productName, sourceDesc),
      candidate.name_th ?? generateNameTh(candidate.productName),
    ]);

    const product = await prisma.product.create({
      data: {
        name: candidate.productName,
        name_th: name_th ?? null,
        description: description ?? sourceDesc,
        description_th: description_th ?? null,
        price: price ?? candidate.suggestedPrice ?? 0,
        stock: 0,
        images: productImages,
        categoryId,
        petTypeId: petTypeId || null,
        shopId,
        source: `trend:${candidate.platformSource}`,
        sourceDescription: `Imported from ${candidate.platformSource} trend pipeline`,
        sourceData: {
          candidateId: candidate.id,
          platformSource: candidate.platformSource,
          sourceUrl: candidate.sourceUrl,
          salesVolume: candidate.salesVolume,
          overallScore: candidate.overallScore,
          nicheKeyword: candidate.nicheKeyword,
        },
        active: false, // Start as inactive — admin can activate after review
      },
    });

    if (productImages.length > 0) {
      await syncProductImagesToMarketingAssets(product.id, shopId, productImages);
    }

    // Link candidate to product
    await prisma.trendCandidate.update({
      where: { id: candidateId },
      data: {
        productId: product.id,
        status: "imported",
        importedAt: new Date(),
      },
    });

    return NextResponse.json({ success: true, data: product });
  } catch (err) {
    return NextResponse.json({
      success: false,
      error: err instanceof Error ? err.message : "Import failed",
    });
  }
}
