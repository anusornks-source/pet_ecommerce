import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

interface ShopContext {
  shopName?: string;
  categories: string[];
  petTypes: string[];
  sampleProducts: string[];
  articleTopics: string[];
}

function buildSystemPrompt(ctx: ShopContext) {
  const { shopName, categories, petTypes, sampleProducts, articleTopics } = ctx;

  const intro = shopName
    ? `คุณคือที่ปรึกษาของร้าน "${shopName}" ผู้ช่วยให้ข้อมูลสินค้าและคำแนะนำที่เกี่ยวกับสัตว์เลี้ยง`
    : `คุณคือ "Pet Advisor" ผู้เชี่ยวชาญด้านการดูแลสัตว์เลี้ยง`;

  const shopInfo = shopName && (categories.length > 0 || sampleProducts.length > 0) ? `
ข้อมูลร้าน "${shopName}":
- หมวดหมู่สินค้าในร้าน: ${categories.length > 0 ? categories.join(", ") : "หลากหลาย"}
${petTypes.length > 0 ? `- สัตว์เลี้ยงที่ร้านโฟกัส: ${petTypes.join(", ")}` : ""}
${sampleProducts.length > 0 ? `- ตัวอย่างสินค้า: ${sampleProducts.slice(0, 8).join(", ")}` : ""}
${articleTopics.length > 0 ? `- บทความในร้าน: ${articleTopics.slice(0, 5).join(", ")}` : ""}

สำคัญ: ตอบเฉพาะคำถามที่เกี่ยวข้องกับสินค้าและ content ของร้านนี้เท่านั้น ห้ามแนะนำสินค้าประเภทที่ร้านไม่ได้ขาย` : "";

  return `${intro}${shopInfo}

บทบาทของคุณ:
- ให้ข้อมูลและแนะนำสินค้าในร้านโดยใช้ search_products
- แนะนำบทความที่เกี่ยวข้องโดยใช้ search_articles
- ตอบคำถามเกี่ยวกับสัตว์เลี้ยงที่สอดคล้องกับสินค้าของร้าน
- สำหรับอาการป่วยรุนแรง ให้แนะนำพบสัตวแพทย์

กฎสำคัญ:
- ตอบเป็นภาษาไทยเสมอ เป็นมิตรและกระชับ
- ถ้าถามเรื่องที่ร้านไม่มีสินค้า ให้แจ้งตามตรงและแนะนำสิ่งที่มีแทน`;
}

async function getShopContext(shopId?: string, shopName?: string): Promise<ShopContext> {
  if (!shopId) return { shopName, categories: [], petTypes: [], sampleProducts: [], articleTopics: [] };

  const [products, articles] = await Promise.all([
    prisma.product.findMany({
      where: { shopId },
      select: { name: true, category: { select: { name: true } }, petType: { select: { name: true } } },
      orderBy: { featured: "desc" },
      take: 30,
    }),
    prisma.article.findMany({
      where: { shopId, published: true },
      select: { title: true },
      take: 10,
    }),
  ]);

  const categories = [...new Set(products.map((p) => p.category.name))];
  const petTypes = [...new Set(products.map((p) => p.petType?.name).filter(Boolean))] as string[];
  const sampleProducts = products.slice(0, 10).map((p) => p.name);
  const articleTopics = articles.map((a) => a.title);

  return { shopName, categories, petTypes, sampleProducts, articleTopics };
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

async function searchProducts(params: {
  query?: string;
  category?: string;
  petType?: string;
  maxPrice?: number;
  minPrice?: number;
}, shopId?: string) {
  const where: Record<string, unknown> = shopId ? { shopId } : {};

  if (params.query) {
    where.OR = [
      { name: { contains: params.query, mode: "insensitive" } },
      { description: { contains: params.query, mode: "insensitive" } },
    ];
  }
  if (params.category) {
    where.category = {
      OR: [
        { name: { contains: params.category, mode: "insensitive" } },
        { slug: { contains: params.category, mode: "insensitive" } },
      ],
    };
  }
  if (params.petType) {
    where.petType = { slug: { contains: params.petType.toLowerCase(), mode: "insensitive" } };
  }
  if (params.minPrice !== undefined || params.maxPrice !== undefined) {
    where.price = {
      ...(params.minPrice !== undefined ? { gte: params.minPrice } : {}),
      ...(params.maxPrice !== undefined ? { lte: params.maxPrice } : {}),
    };
  }

  const products = await prisma.product.findMany({
    where,
    include: { category: true, petType: true },
    orderBy: { featured: "desc" },
    take: 4,
  });

  return products.map((p) => ({
    id: p.id,
    name: p.name,
    price: p.price,
    stock: p.stock,
    category: p.category.name,
    petType: p.petType?.name ?? null,
    image: (() => {
      const imgs = p.images as string[];
      const valid = imgs?.find((img) => {
        try { new URL(img); return true; } catch { return false; }
      });
      return valid ?? null;
    })(),
  }));
}

async function searchArticles(params: { query?: string; tag?: string }, shopId?: string) {
  const where: Record<string, unknown> = { published: true, ...(shopId ? { shopId } : {}) };

  if (params.query) {
    where.OR = [
      { title: { contains: params.query, mode: "insensitive" } },
      { excerpt: { contains: params.query, mode: "insensitive" } },
    ];
  }
  if (params.tag) {
    where.tags = { has: params.tag };
  }

  const articles = await prisma.article.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 3,
    select: { id: true, title: true, slug: true, excerpt: true, coverImage: true, tags: true },
  });

  return articles;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const shopId = searchParams.get("shopId") ?? undefined;
  const shopName = searchParams.get("shopName") ?? undefined;
  const ctx = await getShopContext(shopId, shopName);
  return NextResponse.json({ success: true, data: ctx });
}

export async function POST(request: NextRequest) {
  try {
    const { messages, shopId, shopName } = await request.json() as {
      messages: ChatMessage[];
      shopId?: string;
      shopName?: string;
    };

    const ctx = await getShopContext(shopId, shopName);

    let currentMessages: Anthropic.Messages.MessageParam[] = messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    let foundProducts: Awaited<ReturnType<typeof searchProducts>> = [];
    let foundArticles: Awaited<ReturnType<typeof searchArticles>> = [];
    let finalText = "";

    for (let round = 0; round < 5; round++) {
      const response = await client.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 1024,
        system: buildSystemPrompt(ctx),
        tools: [
          {
            name: "search_products",
            description: "ค้นหาสินค้าในร้านเพื่อแนะนำให้ลูกค้า เมื่อเห็นว่าสินค้าจะเป็นประโยชน์",
            input_schema: {
              type: "object" as const,
              properties: {
                query: { type: "string", description: "คำค้นหาสินค้า เช่น 'อาหารแมว' 'แชมพูสุนัข'" },
                category: { type: "string", description: "หมวดหมู่ เช่น 'อาหาร' 'ของเล่น' 'ยา'" },
                petType: { type: "string", description: "ประเภทสัตว์: dog, cat, bird, fish, rabbit, other" },
                minPrice: { type: "number", description: "ราคาต่ำสุด (บาท)" },
                maxPrice: { type: "number", description: "ราคาสูงสุด (บาท)" },
              },
            },
          },
          {
            name: "search_articles",
            description: "ค้นหาบทความในร้านเพื่อแนะนำให้ลูกค้าอ่านเพิ่มเติม",
            input_schema: {
              type: "object" as const,
              properties: {
                query: { type: "string", description: "คำค้นหาบทความ เช่น 'โรคในแมว' 'อาหารสุนัข'" },
                tag: { type: "string", description: "tag ของบทความ" },
              },
            },
          },
        ],
        messages: currentMessages,
      });

      if (response.stop_reason === "end_turn") {
        for (const block of response.content) {
          if (block.type === "text") finalText = block.text;
        }
        break;
      }

      if (response.stop_reason === "tool_use") {
        const toolResults: Anthropic.Messages.ToolResultBlockParam[] = [];

        for (const block of response.content) {
          if (block.type === "tool_use") {
            if (block.name === "search_products") {
              const input = block.input as Parameters<typeof searchProducts>[0];
              const products = await searchProducts(input, shopId);
              if (products.length > foundProducts.length) foundProducts = products;
              toolResults.push({ type: "tool_result", tool_use_id: block.id, content: JSON.stringify(products) });
            }
            if (block.name === "search_articles") {
              const input = block.input as Parameters<typeof searchArticles>[0];
              const articles = await searchArticles(input, shopId);
              if (articles.length > foundArticles.length) foundArticles = articles;
              toolResults.push({ type: "tool_result", tool_use_id: block.id, content: JSON.stringify(articles) });
            }
          }
        }

        currentMessages = [
          ...currentMessages,
          { role: "assistant", content: response.content },
          { role: "user", content: toolResults },
        ];
        continue;
      }

      for (const block of response.content) {
        if (block.type === "text") finalText = block.text;
      }
      break;
    }

    return NextResponse.json({
      success: true,
      message: finalText,
      products: foundProducts,
      articles: foundArticles,
    });
  } catch (error) {
    console.error("Advisor error:", error);
    return NextResponse.json(
      { success: false, error: "เกิดข้อผิดพลาด กรุณาลองใหม่" },
      { status: 500 }
    );
  }
}
