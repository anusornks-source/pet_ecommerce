import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `คุณคือ "PetShop Assistant" ผู้ช่วยช้อปปิ้งสัตว์เลี้ยงที่เป็นมิตรและมีความรู้ด้านสัตว์เลี้ยง
คุณช่วยลูกค้าค้นหาสินค้า แนะนำผลิตภัณฑ์ และตอบคำถามเกี่ยวกับสินค้าในร้าน
ตอบเป็นภาษาไทยเสมอ ตอบสั้นกระชับแต่เป็นประโยชน์
เมื่อลูกค้าถามเกี่ยวกับสินค้า ให้ใช้เครื่องมือ search_products เพื่อค้นหาสินค้าจริงในระบบ`;

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
  featured?: boolean;
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
  if (params.featured !== undefined) {
    where.featured = params.featured;
  }

  const products = await prisma.product.findMany({
    where,
    include: { category: true, petType: true },
    orderBy: { featured: "desc" },
    take: 6,
  });

  return products.map((p) => ({
    id: p.id,
    name: p.name,
    price: p.price,
    stock: p.stock,
    category: p.category.name,
    categoryIcon: p.category.icon,
    petType: p.petType?.name ?? null,
    featured: p.featured,
    image: (() => {
      const imgs = p.images as string[];
      const valid = imgs?.find((img) => {
        try { new URL(img); return true; } catch { return false; }
      });
      return valid ?? null;
    })(),
  }));
}

export async function POST(request: NextRequest) {
  try {
    const { messages, productContext, shopId } = await request.json() as {
      messages: ChatMessage[];
      productContext?: { id: string; name: string; category: string };
      shopId?: string;
    };

    const systemPrompt = productContext
      ? `${SYSTEM_PROMPT}\n\nลูกค้ากำลังดูสินค้า: "${productContext.name}" หมวดหมู่: ${productContext.category}`
      : SYSTEM_PROMPT;

    // Agentic loop: allow up to 5 tool call rounds
    let currentMessages: Anthropic.Messages.MessageParam[] = messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    let foundProducts: Awaited<ReturnType<typeof searchProducts>> = [];
    let finalText = "";

    for (let round = 0; round < 5; round++) {
      const response = await client.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1024,
        system: systemPrompt,
        tools: [
          {
            name: "search_products",
            description:
              "ค้นหาสินค้าในร้าน PetShop ตามคำค้นหา หมวดหมู่ ประเภทสัตว์ หรือช่วงราคา",
            input_schema: {
              type: "object" as const,
              properties: {
                query: {
                  type: "string",
                  description: "คำค้นหาสินค้า เช่น 'อาหารแมว' 'ของเล่นสุนัข'",
                },
                category: {
                  type: "string",
                  description: "หมวดหมู่สินค้า เช่น 'อาหาร' 'ของเล่น' 'ที่นอน' 'อุปกรณ์'",
                },
                petType: {
                  type: "string",
                  description: "ประเภทสัตว์เลี้ยง: dog, cat, bird, fish, rabbit, other",
                },
                minPrice: {
                  type: "number",
                  description: "ราคาต่ำสุด (บาท)",
                },
                maxPrice: {
                  type: "number",
                  description: "ราคาสูงสุด (บาท)",
                },
                featured: {
                  type: "boolean",
                  description: "ค้นหาเฉพาะสินค้าแนะนำ",
                },
              },
            },
          },
        ],
        messages: currentMessages,
      });

      if (response.stop_reason === "end_turn") {
        // Extract text from response
        for (const block of response.content) {
          if (block.type === "text") finalText = block.text;
        }
        break;
      }

      if (response.stop_reason === "tool_use") {
        // Process tool calls
        const toolResults: Anthropic.Messages.ToolResultBlockParam[] = [];

        for (const block of response.content) {
          if (block.type === "tool_use" && block.name === "search_products") {
            const input = block.input as Parameters<typeof searchProducts>[0];
            const products = await searchProducts(input, shopId);
            if (products.length > foundProducts.length) {
              foundProducts = products;
            }
            toolResults.push({
              type: "tool_result",
              tool_use_id: block.id,
              content: JSON.stringify(products),
            });
          }
        }

        // Add assistant response + tool results to message history
        currentMessages = [
          ...currentMessages,
          { role: "assistant", content: response.content },
          { role: "user", content: toolResults },
        ];
        continue;
      }

      // Fallback: extract text anyway
      for (const block of response.content) {
        if (block.type === "text") finalText = block.text;
      }
      break;
    }

    return NextResponse.json({
      success: true,
      message: finalText,
      products: foundProducts,
    });
  } catch (error) {
    console.error("Chat error:", error);
    return NextResponse.json(
      { success: false, error: "เกิดข้อผิดพลาด กรุณาลองใหม่" },
      { status: 500 }
    );
  }
}
