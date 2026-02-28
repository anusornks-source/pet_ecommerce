"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { formatPrice } from "@/lib/utils";

interface Message {
  role: "user" | "assistant";
  content: string;
  products?: Product[];
  articles?: Article[];
}

interface Product {
  id: string;
  name: string;
  price: number;
  stock: number;
  category: string;
  petType: string | null;
  image: string | null;
}

interface Article {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  coverImage: string | null;
  tags: string[];
}

const STARTERS = [
  "ลูกสุนัขของฉันกินอาหารน้อยลง ควรทำอย่างไร?",
  "แมวของฉันขนร่วงผิดปกติ เป็นเพราะอะไร?",
  "อาหารแบบไหนดีที่สุดสำหรับกระต่าย?",
  "สุนัขพันธุ์เล็กควรออกกำลังกายแค่ไหน?",
];

export default function AdvisorPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (messages.length > 0 && scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages, loading]);

  async function sendMessage(text: string) {
    if (!text.trim() || loading) return;

    const userMsg: Message = { role: "user", content: text };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/advisor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages.map((m) => ({ role: m.role, content: m.content })),
        }),
      });
      const data = await res.json();

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.message || "ขออภัย เกิดข้อผิดพลาด",
          products: data.products?.length ? data.products : undefined,
          articles: data.articles?.length ? data.articles : undefined,
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "ขออภัย เกิดข้อผิดพลาด กรุณาลองใหม่" },
      ]);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }

  return (
    // Fixed height = viewport minus global navbar (h-16 = 4rem)
    <div className="flex flex-col bg-stone-50" style={{ height: "calc(100dvh - 4rem)" }}>

      {/* Advisor header */}
      <div className="bg-white border-b border-stone-100 shadow-sm shrink-0">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
          <div className="w-12 h-12 bg-orange-100 rounded-2xl flex items-center justify-center text-2xl shrink-0">
            🐾
          </div>
          <div>
            <h1 className="font-bold text-lg text-stone-800">Pet Advisor AI</h1>
            <p className="text-sm text-stone-500">ผู้เชี่ยวชาญด้านการดูแลสัตว์เลี้ยง พร้อมช่วยเหลือคุณ</p>
          </div>
          <div className="ml-auto flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-xs text-stone-500">Online</span>
          </div>
        </div>
      </div>

      {/* Scrollable messages area */}
      <div ref={scrollAreaRef} className="flex-1 overflow-y-auto bg-linear-to-b from-orange-50/50 to-white">
        <div className="max-w-3xl mx-auto px-4 py-6 flex flex-col gap-4">

          {/* Welcome / Starters */}
          {messages.length === 0 && (
            <div className="flex flex-col items-center gap-6 py-8 text-center">
              <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center text-4xl">
                🐾
              </div>
              <div>
                <h2 className="text-xl font-bold text-stone-800 mb-1">สวัสดี! ฉันคือ Pet Advisor</h2>
                <p className="text-stone-500 text-sm max-w-md">
                  ถามฉันได้เลยเกี่ยวกับสุขภาพ โภชนาการ และพฤติกรรมของสัตว์เลี้ยงคุณ
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-lg">
                {STARTERS.map((s) => (
                  <button
                    key={s}
                    onClick={() => sendMessage(s)}
                    className="text-left px-4 py-3 rounded-xl border border-orange-200 bg-white hover:bg-orange-50 hover:border-orange-400 transition-colors text-sm text-stone-700"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Messages */}
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} gap-3`}>
              {msg.role === "assistant" && (
                <div className="w-9 h-9 bg-orange-100 rounded-xl flex items-center justify-center text-lg shrink-0 mt-1">
                  🐾
                </div>
              )}
              <div className={`max-w-[80%] flex flex-col gap-3 ${msg.role === "user" ? "items-end" : "items-start"}`}>
                <div
                  className={`px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                    msg.role === "user"
                      ? "bg-orange-500 text-white rounded-tr-sm"
                      : "bg-white border border-stone-100 shadow-sm text-stone-800 rounded-tl-sm"
                  }`}
                >
                  {msg.content}
                </div>

                {/* Recommended products */}
                {msg.products && msg.products.length > 0 && (
                  <div className="w-full">
                    <p className="text-xs text-stone-400 mb-2 font-medium">สินค้าที่แนะนำ</p>
                    <div className="flex gap-2 overflow-x-auto pb-1">
                      {msg.products.map((p) => (
                        <Link
                          key={p.id}
                          href={`/products/${p.id}`}
                          className="shrink-0 w-36 bg-white border border-stone-100 rounded-xl overflow-hidden hover:shadow-md transition-shadow"
                        >
                          <div className="relative h-24 bg-stone-50">
                            {p.image ? (
                              <Image src={p.image} alt={p.name} fill className="object-cover" sizes="144px" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-2xl">🛍️</div>
                            )}
                          </div>
                          <div className="p-2">
                            <p className="text-xs font-medium text-stone-800 line-clamp-2">{p.name}</p>
                            <p className="text-xs text-orange-500 font-bold mt-1">{formatPrice(p.price)}</p>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recommended articles */}
                {msg.articles && msg.articles.length > 0 && (
                  <div className="w-full">
                    <p className="text-xs text-stone-400 mb-2 font-medium">บทความที่เกี่ยวข้อง</p>
                    <div className="flex flex-col gap-2">
                      {msg.articles.map((a) => (
                        <Link
                          key={a.id}
                          href={`/articles/${a.slug}`}
                          className="flex items-center gap-3 bg-white border border-stone-100 rounded-xl p-2 hover:shadow-md transition-shadow"
                        >
                          {a.coverImage && (
                            <div className="relative w-12 h-12 shrink-0 rounded-lg overflow-hidden bg-stone-50">
                              <Image src={a.coverImage} alt={a.title} fill className="object-cover" sizes="48px" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-stone-800 line-clamp-2">{a.title}</p>
                            {a.excerpt && <p className="text-xs text-stone-400 line-clamp-1 mt-0.5">{a.excerpt}</p>}
                          </div>
                          <svg className="w-4 h-4 text-stone-300 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Loading */}
          {loading && (
            <div className="flex justify-start gap-3">
              <div className="w-9 h-9 bg-orange-100 rounded-xl flex items-center justify-center text-lg shrink-0">
                🐾
              </div>
              <div className="bg-white border border-stone-100 shadow-sm rounded-2xl rounded-tl-sm px-4 py-3">
                <div className="flex gap-1 items-center h-5">
                  <span className="w-2 h-2 rounded-full bg-orange-300 animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-2 h-2 rounded-full bg-orange-300 animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-2 h-2 rounded-full bg-orange-300 animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Input bar — NOT sticky, part of flex column */}
      <div className="bg-white border-t border-stone-100 shadow-[0_-4px_12px_rgba(0,0,0,0.05)] shrink-0">
        <div className="max-w-3xl mx-auto px-4 py-3 flex gap-2">
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(input); } }}
            placeholder="ถามเกี่ยวกับสัตว์เลี้ยงของคุณ..."
            className="flex-1 px-4 py-3 rounded-2xl border border-stone-200 focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 text-sm bg-stone-50"
            disabled={loading}
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || loading}
            className="w-12 h-12 bg-orange-500 hover:bg-orange-600 disabled:bg-stone-200 text-white rounded-2xl flex items-center justify-center transition-colors shrink-0"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
        <p className="text-center text-xs text-stone-400 pb-3">
          Pet Advisor ใช้ AI — ข้อมูลเบื้องต้นเท่านั้น ปรึกษาสัตวแพทย์สำหรับอาการรุนแรง
        </p>
      </div>
    </div>
  );
}
