"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, use } from "react";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { useWishlist } from "@/context/WishlistContext";
import { formatPrice } from "@/lib/utils";
import type { Product, ProductVariant, Review } from "@/types";
import toast from "react-hot-toast";
import ShareButtons from "@/components/ShareButtons";
import { useLocale } from "@/context/LocaleContext";

export default function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { user } = useAuth();
  const { addToCart } = useCart();
  const { isWishlisted, toggle: toggleWishlist } = useWishlist();
  const { pick, t } = useLocale();

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(0);
  const [pinnedImage, setPinnedImage] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [adding, setAdding] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);

  const [variantError, setVariantError] = useState(false);

  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);
  const [hoverRating, setHoverRating] = useState(0);

  const fetchReviews = () => {
    fetch(`/api/products/${id}/reviews`)
      .then((r) => r.json())
      .then((data) => { if (data.success) setReviews(data.data); });
  };

  useEffect(() => {
    fetch(`/api/products/${id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success) setProduct(data.data);
        setLoading(false);
      });
    fetchReviews();
  }, [id]);

  const handleSubmitReview = async () => {
    if (!user) { toast.error(pick("กรุณาเข้าสู่ระบบก่อน", "Please log in first")); return; }
    setSubmittingReview(true);
    try {
      const res = await fetch(`/api/products/${id}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating: reviewRating, comment: reviewComment }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(pick("รีวิวสำเร็จ!", "Review submitted!"));
        setReviewComment("");
        setReviewRating(5);
        fetchReviews();
      } else {
        toast.error(data.error || pick("เกิดข้อผิดพลาด", "Something went wrong"));
      }
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleDeleteReview = async (reviewId: string) => {
    const res = await fetch(`/api/reviews/${reviewId}`, { method: "DELETE" });
    const data = await res.json();
    if (data.success) {
      toast.success(pick("ลบรีวิวแล้ว", "Review deleted"));
      fetchReviews();
    }
  };

  const hasVariants = (product?.variants?.length ?? 0) > 0;
  const displayPrice = selectedVariant?.price ?? product?.price ?? 0;
  const displayStock = selectedVariant?.stock ?? product?.stock ?? 0;

  const handleAddToCart = async () => {
    if (!user) {
      toast.error(pick("กรุณาเข้าสู่ระบบก่อน", "Please log in first"));
      router.push("/login");
      return;
    }
    if (!product) return;
    if (hasVariants && !selectedVariant) {
      toast.error(pick("กรุณาเลือกตัวเลือกสินค้าก่อนนะคะ ☝️", "Please select an option first ☝️"));
      setVariantError(true);
      setTimeout(() => setVariantError(false), 2500);
      document.getElementById("variant-selector")?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    if (displayStock === 0) return;
    setAdding(true);
    try {
      await addToCart(product.id, quantity, selectedVariant?.id ?? null);
      toast.success(`${pick("เพิ่ม", "Added")} "${pick(product.name_th, product.name)}" ${pick("ในตะกร้าแล้ว! 🛒", "to cart! 🛒")}`);
    } catch {
      toast.error(pick("เกิดข้อผิดพลาด", "Something went wrong"));
    } finally {
      setAdding(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 animate-pulse">
          <div className="h-96 bg-stone-100 rounded-3xl" />
          <div className="space-y-4">
            <div className="h-8 bg-stone-100 rounded w-3/4" />
            <div className="h-6 bg-stone-100 rounded w-1/4" />
            <div className="h-4 bg-stone-100 rounded" />
            <div className="h-4 bg-stone-100 rounded w-2/3" />
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-20 text-center">
        <div className="text-6xl mb-4">😢</div>
        <h2 className="text-2xl font-bold text-stone-700">{pick("ไม่พบสินค้า", "Product not found")}</h2>
        <Link href="/products" className="mt-4 btn-primary inline-block">{pick("กลับไปดูสินค้า", "Browse Products")}</Link>
      </div>
    );
  }

  const placeholder = `https://placehold.co/600x400/fff7ed/f97316?text=${encodeURIComponent(product.name)}`;
  const validImages = (product.images ?? []).filter((img): img is string => {
    if (typeof img !== "string" || !img.trim()) return false;
    try { new URL(img); return true; } catch { return false; }
  });
  const images = validImages.length > 0 ? validImages : [placeholder];
  const safeIndex = selectedImage < images.length ? selectedImage : 0;

  // pinnedImage wins when user manually clicks gallery/thumbnails
  // otherwise show variant image (if any), then fallback to gallery
  const mainImage = pinnedImage ?? selectedVariant?.variantImage ?? images[safeIndex];

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-stone-400 mb-6">
        <Link href="/" className="hover:text-orange-500">{t("home", "nav")}</Link>
        <span>/</span>
        <Link href="/products" className="hover:text-orange-500">{t("products", "nav")}</Link>
        <span>/</span>
        <Link href={`/products?category=${product.category.slug}`} className="hover:text-orange-500">
          {pick((product.category as { name_th?: string | null }).name_th, product.category.name)}
        </Link>
        <span>/</span>
        <span className="text-stone-600 truncate max-w-48">{pick(product.name_th, product.name)}</span>
      </nav>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
        {/* Images */}
        <div className="space-y-3">
          <div className="relative h-80 md:h-115 rounded-3xl overflow-hidden bg-orange-50 group">
            <Image
              src={mainImage}
              alt={product.name}
              fill
              className="object-cover transition-opacity duration-200"
              sizes="(max-width: 768px) 100vw, 50vw"
              priority
            />
            {product.featured && (
              <span className="absolute top-4 left-4 bg-orange-500 text-white px-3 py-1 rounded-full text-sm font-medium z-10">
                ⭐ สินค้าแนะนำ
              </span>
            )}
            {/* Prev / Next arrows */}
            {images.length > 1 && (
              <>
                <button
                  onClick={() => { const i = (safeIndex - 1 + images.length) % images.length; setSelectedImage(i); setPinnedImage(images[i]); }}
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/80 hover:bg-white shadow flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10"
                  aria-label="รูปก่อนหน้า"
                >
                  <svg className="w-4 h-4 text-stone-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <button
                  onClick={() => { const i = (safeIndex + 1) % images.length; setSelectedImage(i); setPinnedImage(images[i]); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/80 hover:bg-white shadow flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10"
                  aria-label="รูปถัดไป"
                >
                  <svg className="w-4 h-4 text-stone-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
                {/* Dot indicators */}
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
                  {images.map((img, idx) => (
                    <button
                      key={idx}
                      onClick={() => { setSelectedImage(idx); setPinnedImage(img); }}
                      className={`h-2 rounded-full transition-all duration-200 ${
                        idx === safeIndex ? "bg-white w-5" : "bg-white/60 w-2"
                      }`}
                    />
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Thumbnails */}
          {images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {images.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => { setSelectedImage(idx); setPinnedImage(img); }}
                  className={`relative w-20 h-20 rounded-xl overflow-hidden shrink-0 border-2 transition-all ${
                    safeIndex === idx
                      ? "border-orange-500 scale-105 shadow-md"
                      : "border-stone-100 hover:border-stone-300"
                  }`}
                >
                  <Image src={img} alt="" fill className="object-cover" sizes="80px" />
                </button>
              ))}
            </div>
          )}

          {/* Features + Share — under image */}
          <div className="mt-6 pt-6 px-4 border-t border-stone-100 space-y-4">
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-stone-500">
              {[
                { icon: "🚚", label: pick("จัดส่งทั่วไทย", "Nationwide Shipping") },
                { icon: "✅", label: pick("สินค้าคุณภาพ", "Quality Products") },
                { icon: "💬", label: pick("ดูแลหลังขาย", "After Sales Support") },
              ].map((f) => (
                <span key={f.label} className="flex items-center gap-1.5">
                  <span>{f.icon}</span>{f.label}
                </span>
              ))}
            </div>
            <ShareButtons url={`/products/${product.id}`} title={product.name} />
          </div>
        </div>

        {/* Info */}
        <div className="space-y-5">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="text-sm text-orange-500 font-medium bg-orange-50 px-3 py-1 rounded-full">
                {product.category.icon} {pick((product.category as { name_th?: string | null }).name_th, product.category.name)}
              </span>
              {product.petType && (
                <span className="text-sm text-stone-500 bg-stone-50 px-3 py-1 rounded-full">
                  {product.petType.icon} {pick((product.petType as { name_th?: string | null }).name_th, product.petType.name)}
                </span>
              )}
              {product.tags && product.tags.map((tag) => (
                <span
                  key={tag.id}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${
                    ({ orange: "bg-orange-100 text-orange-700 border-orange-200", red: "bg-red-100 text-red-700 border-red-200", green: "bg-green-100 text-green-700 border-green-200", blue: "bg-blue-100 text-blue-700 border-blue-200", purple: "bg-purple-100 text-purple-700 border-purple-200", yellow: "bg-yellow-100 text-yellow-800 border-yellow-200" })[tag.color] ?? "bg-orange-100 text-orange-700 border-orange-200"
                  }`}
                >
                  {tag.icon} {tag.name}
                </span>
              ))}
            </div>
            <div className="flex items-start justify-between gap-3">
              <h1 className="text-2xl md:text-3xl font-bold text-stone-800">{pick(product.name_th, product.name)}</h1>
              {user && (
                <button
                  onClick={() => toggleWishlist(product.id)}
                  className="shrink-0 w-10 h-10 rounded-full border border-stone-200 flex items-center justify-center text-xl hover:scale-110 transition-transform"
                  title={isWishlisted(product.id) ? "ลบออกจาก Wishlist" : "เพิ่มใน Wishlist"}
                >
                  {isWishlisted(product.id) ? "❤️" : "🤍"}
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-3xl font-bold text-orange-500">{formatPrice(displayPrice)}</span>
            {product.normalPrice != null && product.normalPrice > displayPrice && (
              <>
                <span className="text-lg text-stone-400 line-through">{formatPrice(product.normalPrice)}</span>
                <span className="bg-red-500 text-white text-sm font-bold px-2 py-0.5 rounded-md leading-tight">
                  -{Math.round((1 - displayPrice / product.normalPrice) * 100)}%
                </span>
              </>
            )}
          </div>

          {/* Short description */}
          {(product.shortDescription || (product as { shortDescription_th?: string | null }).shortDescription_th) && (() => {
            const displayShort = pick((product as { shortDescription_th?: string | null }).shortDescription_th, product.shortDescription);
            return displayShort ? (
              <p className="text-stone-500 text-sm leading-relaxed">{displayShort}</p>
            ) : null;
          })()}

          {/* Stock + Delivery time */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <div className="flex items-center gap-2">
              {displayStock > 0 ? (
                <>
                  <span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block" />
                  <span className="text-sm text-green-600 font-medium">
                    {pick("มีสินค้า", "In Stock")} {displayStock <= 5 ? pick(`(เหลือ ${displayStock} ชิ้น)`, `(${displayStock} left)`) : ""}
                  </span>
                </>
              ) : (
                <>
                  <span className="w-2.5 h-2.5 rounded-full bg-red-400 inline-block" />
                  <span className="text-sm text-red-500 font-medium">{pick("สินค้าหมด", "Out of Stock")}</span>
                </>
              )}
            </div>
            {product.deliveryDays && (
              <div className="flex items-center gap-1.5 text-sm text-stone-500">
                <span>🚚</span>
                <span>{pick("จัดส่งภายใน", "Ships within")} <span className="font-medium text-stone-700">{product.deliveryDays} {pick("วัน", "days")}</span></span>
              </div>
            )}
          </div>

          {/* Variant selector */}
          {hasVariants && (
            <div id="variant-selector" className={`transition-all duration-300 rounded-xl ${variantError ? "ring-2 ring-orange-400 ring-offset-2 p-3 bg-orange-50" : ""}`}>
              <label className="text-sm font-medium text-stone-700 block mb-2">
                {pick("เลือกตัวเลือกสินค้า", "Select Option")} {!selectedVariant && <span className="text-orange-400">*</span>}
              </label>
              <div className="flex flex-wrap gap-2">
                {product.variants!.map((v) => {
                  const label = [v.size, v.color].filter(Boolean).join(" / ") || `Variant`;
                  const isSelected = selectedVariant?.id === v.id;
                  const isOut = v.stock === 0;
                  return (
                    <button
                      key={v.id}
                      onClick={() => { setSelectedVariant(isSelected ? null : v); setPinnedImage(null); }}
                      disabled={isOut}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border-2 text-sm font-medium transition-all ${
                        isSelected
                          ? "border-orange-500 bg-orange-50 text-orange-600"
                          : isOut
                          ? "border-stone-100 text-stone-300 cursor-not-allowed line-through"
                          : "border-stone-200 text-stone-700 hover:border-orange-300 hover:bg-orange-50"
                      }`}
                    >
                      {v.variantImage && (
                        <div className="relative w-6 h-6 rounded-md overflow-hidden shrink-0">
                          <Image src={v.variantImage} alt={label} fill className="object-cover" sizes="24px" />
                        </div>
                      )}
                      {label}
                      {isOut && " (หมด)"}
                    </button>
                  );
                })}
              </div>
              {selectedVariant ? (
                <div className="mt-1.5 space-y-1">
                  <p className="text-xs text-stone-400">
                    {formatPrice(selectedVariant.price)}
                    {selectedVariant.sku && ` • SKU: ${selectedVariant.sku}`}
                  </p>
                  {selectedVariant.attributes && selectedVariant.attributes.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {selectedVariant.attributes.map((attr, i) => (
                        <span key={i} className="text-xs bg-stone-100 text-stone-500 px-2 py-0.5 rounded-full">
                          {attr.name}: {attr.value}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ) : variantError ? (
                <p className="mt-2 text-sm text-orange-500 font-medium animate-pulse">
                  ☝️ {pick("กรุณาเลือกตัวเลือกสินค้าก่อนเพิ่มในตะกร้า", "Please select an option before adding to cart")}
                </p>
              ) : (
                <p className="mt-2 text-xs text-stone-400">{pick("กรุณาเลือกตัวเลือกสินค้า", "Please select an option")}</p>
              )}
            </div>
          )}

          {/* Quantity + Add to cart */}
          {displayStock > 0 && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-stone-600 block mb-2">{pick("จำนวน", "Quantity")}</label>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-10 h-10 rounded-xl border border-stone-200 flex items-center justify-center text-stone-600 hover:bg-orange-50 hover:border-orange-300 transition-colors text-lg font-bold"
                  >
                    −
                  </button>
                  <span className="w-12 text-center font-bold text-stone-800 text-lg">{quantity}</span>
                  <button
                    onClick={() => setQuantity(Math.min(displayStock, quantity + 1))}
                    className="w-10 h-10 rounded-xl border border-stone-200 flex items-center justify-center text-stone-600 hover:bg-orange-50 hover:border-orange-300 transition-colors text-lg font-bold"
                  >
                    +
                  </button>
                </div>
              </div>

              <button
                onClick={() => {
                  const msg = pick(
                    `แนะนำสินค้าที่คล้ายกับ "${pick(product.name_th, product.name)}" ในหมวด ${pick((product.category as { name_th?: string | null }).name_th, product.category.name)}`,
                    `Recommend products similar to "${pick(product.name_th, product.name)}" in category ${pick((product.category as { name_th?: string | null }).name_th, product.category.name)}`
                  );
                  window.dispatchEvent(new CustomEvent("open-chat", { detail: { message: msg } }));
                }}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-orange-200 text-orange-600 hover:bg-orange-50 transition-colors text-sm font-medium"
              >
                ✨ {pick("ถาม AI หาสินค้าที่คล้ายกัน", "Ask AI for similar products")}
              </button>

              <div className="flex gap-3">
                <button
                  onClick={handleAddToCart}
                  disabled={adding}
                  className="flex-1 btn-primary py-4 text-base flex items-center justify-center gap-2"
                >
                  {adding ? (
                    <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  ) : (
                    "🛒"
                  )}
                  {pick("เพิ่มในตะกร้า", "Add to Cart")}
                </button>
                <Link
                  href="/cart"
                  className="btn-outline py-4 px-6 flex items-center gap-2"
                  onClick={handleAddToCart}
                >
                  {pick("ซื้อเลย", "Buy Now")}
                </Link>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Description — full width below the grid */}
      {(product.description || product.description_th) && (() => {
        const displayDesc = pick(product.description_th, product.description);
        return displayDesc ? (
          <div className="mt-6 bg-white rounded-2xl border border-stone-100 p-6 md:p-8">
            <h2 className="text-lg font-bold text-stone-800 mb-4 pb-3 border-b border-stone-100">{pick("รายละเอียดสินค้า", "Product Description")}</h2>
            <div
              className="text-stone-600 leading-relaxed [&_p]:mb-3 [&_b]:font-semibold [&_strong]:font-semibold [&_img]:max-w-full [&_img]:rounded-xl [&_img]:my-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-3 [&_li]:mb-1"
              dangerouslySetInnerHTML={{ __html: displayDesc }}
            />
          </div>
        ) : null;
      })()}

      {/* Product Specs — derived from variant attributes */}
      {(() => {
        const specMap = new Map<string, Set<string>>();
        (product.variants ?? []).forEach((v) => {
          if (v.attributes) {
            v.attributes.forEach(({ name, value }) => {
              if (!specMap.has(name)) specMap.set(name, new Set());
              specMap.get(name)!.add(value);
            });
          }
        });
        // Also add petType and category as basic specs
        if (product.petType) specMap.set(pick("เหมาะสำหรับ", "Suitable for"), new Set([pick((product.petType as { name_th?: string | null }).name_th, product.petType.name)]));
        const specs = Array.from(specMap.entries());
        if (specs.length === 0) return null;
        return (
          <div className="mt-6 bg-white rounded-2xl border border-stone-100 p-6 md:p-8">
            <h2 className="text-lg font-bold text-stone-800 mb-4 pb-3 border-b border-stone-100">{pick("ข้อมูลจำเพาะสินค้า", "Product Specifications")}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-12 gap-y-0 text-sm divide-y divide-stone-50">
              {specs.map(([name, values]) => (
                <div key={name} className="flex gap-3 py-2.5">
                  <span className="text-stone-400 w-36 shrink-0">{name}</span>
                  <span className="text-stone-700">{Array.from(values).join(", ")}</span>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* Reviews Section */}
      <div className="mt-12">
        <h2 className="text-2xl font-bold text-stone-800 mb-6">
          {pick("รีวิวสินค้า", "Product Reviews")}
          {reviews.length > 0 && (
            <span className="ml-3 text-base font-normal text-stone-500">
              ({reviews.length} {pick("รีวิว", "reviews")} •{" "}
              {(reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)} ⭐)
            </span>
          )}
        </h2>

        {/* Write Review */}
        {user ? (
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-stone-100 mb-8">
            <h3 className="font-semibold text-stone-800 mb-4">{pick("เขียนรีวิว", "Write a Review")}</h3>
            <div className="mb-4">
              <label className="text-sm text-stone-600 block mb-2">{pick("คะแนน", "Rating")}</label>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setReviewRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    className="text-3xl transition-transform hover:scale-110"
                  >
                    {star <= (hoverRating || reviewRating) ? "⭐" : "☆"}
                  </button>
                ))}
                <span className="ml-2 text-sm text-stone-500 self-center">
                  {pick(
                    ["", "แย่มาก", "แย่", "ปานกลาง", "ดี", "ดีมาก"][reviewRating],
                    ["", "Very Bad", "Bad", "Okay", "Good", "Excellent"][reviewRating]
                  )}
                </span>
              </div>
            </div>
            <div className="mb-4">
              <label className="text-sm text-stone-600 block mb-2">{pick("ความคิดเห็น (ไม่บังคับ)", "Comment (optional)")}</label>
              <textarea
                rows={3}
                className="input w-full text-sm resize-none"
                style={{ padding: "0.625rem 0.75rem" }}
                placeholder={pick("บอกเล่าประสบการณ์การใช้สินค้า...", "Share your experience with this product...")}
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
              />
            </div>
            <button
              onClick={handleSubmitReview}
              disabled={submittingReview}
              className="btn-primary px-6 py-2.5 text-sm"
            >
              {submittingReview ? pick("กำลังส่ง...", "Submitting...") : pick("ส่งรีวิว", "Submit Review")}
            </button>
          </div>
        ) : (
          <div className="bg-orange-50 rounded-2xl p-5 mb-8 text-center">
            <p className="text-stone-600 text-sm">
              <Link href="/login" className="text-orange-500 font-medium hover:underline">{pick("เข้าสู่ระบบ", "Log in")}</Link>
              {" "}{pick("เพื่อเขียนรีวิวสินค้า", "to write a review")}
            </p>
          </div>
        )}

        {/* Reviews List */}
        {reviews.length === 0 ? (
          <div className="text-center py-12 text-stone-400">
            <div className="text-5xl mb-3">💬</div>
            <p>{pick("ยังไม่มีรีวิว เป็นคนแรกที่รีวิวสินค้านี้!", "No reviews yet. Be the first to review this product!")}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {reviews.map((review) => (
              <div key={review.id} className="bg-white rounded-2xl p-5 shadow-sm border border-stone-100">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-orange-100 flex items-center justify-center text-sm font-bold text-orange-600 shrink-0">
                      {review.user.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium text-stone-800 text-sm">{review.user.name}</p>
                      <p className="text-xs text-stone-400">
                        {new Date(review.createdAt).toLocaleDateString("th-TH", {
                          year: "numeric", month: "long", day: "numeric"
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-sm">{"⭐".repeat(review.rating)}{"☆".repeat(5 - review.rating)}</span>
                    {(user?.id === review.userId || user?.role === "ADMIN") && (
                      <button
                        onClick={() => handleDeleteReview(review.id)}
                        className="text-xs text-red-400 hover:text-red-600 transition-colors ml-1"
                      >
                        ลบ
                      </button>
                    )}
                  </div>
                </div>
                {review.comment && (
                  <p className="mt-3 text-stone-600 text-sm leading-relaxed">{review.comment}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
