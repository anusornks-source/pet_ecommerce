"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { formatPrice } from "@/lib/utils";

interface ChatProduct {
  id: string;
  name: string;
  price: number;
  stock: number;
  category: string;
  categoryIcon: string;
  petType: string | null;
  featured: boolean;
  image: string | null;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  products?: ChatProduct[];
  searching?: boolean;
}

interface ChatAssistantProps {
  productContext?: { id: string; name: string; category: string };
  initialMessage?: string;
  shopId?: string;
  shopName?: string;
}

const DEFAULT_SUGGESTIONS = [
  { label: "สินค้าแนะนำ", message: "แนะนำสินค้าขายดีในร้าน" },
  { label: "สินค้าราคาไม่เกิน 500", message: "แนะนำสินค้าราคาไม่เกิน 500 บาท" },
];

function ProductCard({ product }: { product: ChatProduct }) {
  const placeholder = `https://placehold.co/120x120/fff7ed/f97316?text=${encodeURIComponent(product.name.slice(0, 8))}`;
  return (
    <Link
      href={`/products/${product.id}`}
      className="flex items-center gap-3 p-2.5 bg-white rounded-xl border border-stone-100 hover:border-orange-200 hover:bg-orange-50 transition-all group"
    >
      <div className="relative w-14 h-14 rounded-lg overflow-hidden bg-orange-50 shrink-0">
        <Image
          src={product.image ?? placeholder}
          alt={product.name}
          fill
          className="object-cover"
          sizes="56px"
          unoptimized={!product.image}
          onError={(e) => { (e.target as HTMLImageElement).src = placeholder; }}
        />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-stone-800 truncate group-hover:text-orange-600 transition-colors">
          {product.name}
        </p>
        <p className="text-xs text-stone-400">{product.categoryIcon} {product.category}</p>
        {product.stock === 0 && (
          <p className="text-xs text-red-500 font-medium">สินค้าหมด</p>
        )}
        {product.stock > 0 && product.stock <= 5 && (
          <p className="text-xs text-amber-500 font-medium">เหลือน้อย</p>
        )}
      </div>
      <div className="shrink-0">
        <p className="text-sm font-bold text-orange-600">{formatPrice(product.price)}</p>
      </div>
    </Link>
  );
}

function SearchingIndicator() {
  return (
    <div className="flex items-center gap-2 text-xs text-stone-400 py-1">
      <div className="flex gap-1">
        <span className="w-1.5 h-1.5 bg-orange-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
        <span className="w-1.5 h-1.5 bg-orange-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
        <span className="w-1.5 h-1.5 bg-orange-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
      </div>
      กำลังค้นหาสินค้า...
    </div>
  );
}

export default function ChatAssistant({ productContext, initialMessage, shopId, shopName }: ChatAssistantProps) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [quickSuggestions, setQuickSuggestions] = useState(DEFAULT_SUGGESTIONS);

  useEffect(() => {
    if (!shopId) return;
    fetch(`/api/categories?shopId=${shopId}&limit=2`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success && data.data?.length > 0) {
          const catSuggestions = data.data.slice(0, 2).map((c: { name: string; icon: string }) => ({
            label: `${c.icon} ${c.name}`,
            message: `มีสินค้าหมวด${c.name}อะไรบ้าง`,
          }));
          setQuickSuggestions([...DEFAULT_SUGGESTIONS, ...catSuggestions]);
        }
      })
      .catch(() => {});
  }, [shopId]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const initialSentRef = useRef(false);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [open]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Auto-send initialMessage when opened (from product page "Ask AI" button)
  useEffect(() => {
    if (open && initialMessage && !initialSentRef.current && messages.length === 0) {
      initialSentRef.current = true;
      sendMessage(initialMessage);
    }
  }, [open, initialMessage]); // eslint-disable-line react-hooks/exhaustive-deps

  // Listen for open-chat event from product pages
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ message: string }>).detail;
      setOpen(true);
      setMessages([]);
      initialSentRef.current = false;
      setTimeout(() => sendMessage(detail.message), 100);
    };
    window.addEventListener("open-chat", handler);
    return () => window.removeEventListener("open-chat", handler);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: text.trim(),
    };
    const searchingMsg: Message = {
      id: Date.now().toString() + "-searching",
      role: "assistant",
      content: "",
      searching: true,
    };

    setMessages((prev) => [...prev, userMsg, searchingMsg]);
    setInput("");
    setLoading(true);

    const history = [...messages, userMsg]
      .filter((m) => !m.searching)
      .map((m) => ({ role: m.role, content: m.content }));

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history, productContext, shopId, shopName }),
      });
      const data = await res.json();

      setMessages((prev) => {
        const filtered = prev.filter((m) => !m.searching);
        if (data.success) {
          return [
            ...filtered,
            {
              id: Date.now().toString() + "-ai",
              role: "assistant" as const,
              content: data.message,
              products: data.products?.length > 0 ? data.products : undefined,
            },
          ];
        } else {
          return [
            ...filtered,
            {
              id: Date.now().toString() + "-err",
              role: "assistant" as const,
              content: data.error ?? "เกิดข้อผิดพลาด กรุณาลองใหม่",
            },
          ];
        }
      });
    } catch {
      setMessages((prev) => {
        const filtered = prev.filter((m) => !m.searching);
        return [
          ...filtered,
          {
            id: Date.now().toString() + "-err",
            role: "assistant" as const,
            content: "ไม่สามารถเชื่อมต่อได้ กรุณาลองใหม่",
          },
        ];
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  return (
    <>
      {/* Floating Button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-orange-500 hover:bg-orange-600 text-white rounded-full shadow-xl flex items-center justify-center transition-all hover:scale-110 active:scale-95"
          aria-label="เปิด Shopping Assistant"
        >
          <span className="text-2xl">✨</span>
        </button>
      )}

      {/* Chat Panel */}
      {open && (
        <div className="fixed bottom-0 right-0 md:bottom-6 md:right-6 z-50 flex flex-col w-full md:w-[380px] h-[100dvh] md:h-[600px] bg-white md:rounded-2xl shadow-2xl border border-stone-100 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3.5 bg-white border-b border-stone-100 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center text-lg">✨</div>
              <div>
                <p className="font-semibold text-stone-800 text-sm leading-tight">Shopping Assistant</p>
                <p className="text-xs text-green-500">Online</p>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-stone-100 text-stone-400 hover:text-stone-600 transition-colors"
            >
              ✕
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
            {/* Welcome state */}
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center py-8">
                <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center text-3xl mb-3">✨</div>
                <p className="font-semibold text-stone-800 mb-1">ยินดีต้อนรับ!</p>
                <p className="text-stone-400 text-sm mb-6">
                  {shopName ? `ฉันช่วยค้นหาสินค้าของ ${shopName}` : "ฉันช่วยค้นหาสินค้า"}<br />
                  และแนะนำสิ่งที่เหมาะสำหรับสัตว์เลี้ยงของคุณ
                </p>

                {/* Quick suggestions */}
                <div className="w-full space-y-2">
                  <p className="text-xs text-stone-400 font-medium mb-2">ลองถามว่า...</p>
                  {quickSuggestions.map((s) => (
                    <button
                      key={s.label}
                      onClick={() => sendMessage(s.message)}
                      className="w-full text-left text-sm px-3 py-2 rounded-xl bg-stone-50 hover:bg-orange-50 hover:text-orange-700 text-stone-600 border border-stone-100 hover:border-orange-200 transition-all"
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Messages list */}
            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] ${msg.role === "user" ? "order-2" : "order-1"}`}>
                  {msg.searching ? (
                    <div className="bg-stone-50 rounded-2xl rounded-tl-sm px-4 py-3">
                      <SearchingIndicator />
                    </div>
                  ) : (
                    <>
                      {/* Product cards above text for assistant */}
                      {msg.role === "assistant" && msg.products && msg.products.length > 0 && (
                        <div className="space-y-2 mb-2">
                          <p className="text-xs text-stone-400 font-medium">
                            พบ {msg.products.length} สินค้า
                          </p>
                          {msg.products.map((product) => (
                            <ProductCard key={product.id} product={product} />
                          ))}
                        </div>
                      )}

                      {/* Message bubble */}
                      {msg.content && (
                        <div
                          className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                            msg.role === "user"
                              ? "bg-orange-500 text-white rounded-tr-sm"
                              : "bg-stone-50 text-stone-700 rounded-tl-sm"
                          }`}
                        >
                          {msg.content}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <form onSubmit={handleSubmit} className="px-4 py-3 border-t border-stone-100 bg-white shrink-0">
            <div className="flex items-center gap-2 bg-stone-50 rounded-xl px-3 py-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="ถามเกี่ยวกับสินค้า..."
                disabled={loading}
                className="flex-1 bg-transparent text-sm text-stone-800 placeholder:text-stone-400 outline-none"
              />
              <button
                type="submit"
                disabled={!input.trim() || loading}
                className="w-8 h-8 bg-orange-500 hover:bg-orange-600 disabled:bg-stone-200 text-white rounded-lg flex items-center justify-center transition-colors shrink-0"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
