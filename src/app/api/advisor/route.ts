import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `คุณคือ "Pet Advisor" ผู้เชี่ยวชาญด้านการดูแลสัตว์เลี้ยงที่มีความรู้ลึกด้านสุขภาพ โภชนาการ พฤติกรรม และการเลี้ยงดูสัตว์เลี้ยงทุกชนิด

บทบาทของคุณ:
- ให้คำปรึกษาด้านสุขภาพสัตว์เลี้ยง (อาการป่วย โรค วัคซีน)
- แนะนำโภชนาการและอาหารที่เหมาะสม
- อธิบายพฤติกรรมสัตว์เลี้ยงและวิธีแก้ปัญหา
- แนะนำการดูแลรักษาและทำความสะอาด
- เมื่อเหมาะสม ให้แนะนำสินค้าในร้านโดยใช้ search_products
- เมื่อเหมาะสม ให้แนะนำบทความที่เกี่ยวข้องโดยใช้ search_articles

กฎสำคัญ:
- ตอบเป็นภาษาไทยเสมอ
- ตอบด้วยความห่วงใยและเป็นมิตร
- สำหรับอาการป่วยรุนแรง ให้แนะนำพบสัตวแพทย์เสมอ
- อย่าวินิจฉัยโรคแทนสัตวแพทย์ แต่ให้ข้อมูลเบื้องต้นได้`;

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
}) {
  const where: Record<string, unknown> = {};

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

async function searchArticles(params: { query?: string; tag?: string }) {
  const where: Record<string, unknown> = { published: true };

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

export async function POST(request: NextRequest) {
  try {
    const { messages } = await request.json() as { messages: ChatMessage[] };

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
        system: SYSTEM_PROMPT,
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
              const products = await searchProducts(input);
              if (products.length > foundProducts.length) foundProducts = products;
              toolResults.push({ type: "tool_result", tool_use_id: block.id, content: JSON.stringify(products) });
            }
            if (block.name === "search_articles") {
              const input = block.input as Parameters<typeof searchArticles>[0];
              const articles = await searchArticles(input);
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
