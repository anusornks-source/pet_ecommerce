import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, isNextResponse } from "@/lib/adminAuth";
import { prisma } from "@/lib/prisma";

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
    const product = await prisma.product.create({
      data: {
        name: candidate.productName,
        name_th: candidate.name_th,
        description: candidate.description || candidate.productName,
        description_th: candidate.description_th,
        price: price ?? candidate.suggestedPrice ?? 0,
        stock: 0,
        images: candidate.productImage ? [candidate.productImage] : [],
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
