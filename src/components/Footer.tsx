import Image from "next/image";

interface FooterProps {
  storeName?: string;
  logoUrl?: string;
  phone?: string;
  lineId?: string;
  facebookUrl?: string;
  instagramUrl?: string;
  tiktokUrl?: string;
  primaryColor?: string;
}

export default function Footer({
  storeName = "PetShop",
  logoUrl,
  phone,
  lineId,
  facebookUrl,
  instagramUrl,
  tiktokUrl,
  primaryColor = "#f97316",
}: FooterProps) {
  const year = new Date().getFullYear();
  const hasSocial = lineId || facebookUrl || instagramUrl || tiktokUrl;
  const hasContact = phone || lineId;

  return (
    <footer className="bg-stone-800 text-stone-300 mt-16">
      <div className="max-w-6xl mx-auto px-4 py-12 grid grid-cols-1 md:grid-cols-3 gap-8">
        <div>
          <div className="flex items-center gap-2 text-white font-bold text-xl mb-3">
            {logoUrl ? (
              <div className="relative w-8 h-8 shrink-0">
                <Image src={logoUrl} alt={storeName} fill className="object-contain brightness-0 invert" sizes="32px" />
              </div>
            ) : (
              <span className="text-2xl">🐾</span>
            )}
            <span>{storeName}</span>
          </div>
          <p className="text-sm leading-relaxed">
            ร้านสัตว์เลี้ยงออนไลน์ที่คุณไว้วางใจได้ เราคัดสรรสัตว์เลี้ยง อาหาร และของเล่น คุณภาพสูงสำหรับน้องรัก
          </p>
          {hasSocial && (
            <div className="flex items-center gap-3 mt-4">
              {lineId && (
                <a
                  href={`https://line.me/ti/p/~${lineId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-9 h-9 rounded-full bg-stone-700 hover:bg-[#06C755] flex items-center justify-center transition-colors text-base"
                  title="LINE"
                >
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                    <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63.349 0 .631.285.631.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.281.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
                  </svg>
                </a>
              )}
              {facebookUrl && (
                <a
                  href={facebookUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-9 h-9 rounded-full bg-stone-700 hover:bg-[#1877F2] flex items-center justify-center transition-colors"
                  title="Facebook"
                >
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  </svg>
                </a>
              )}
              {instagramUrl && (
                <a
                  href={instagramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-9 h-9 rounded-full bg-stone-700 hover:bg-[#E1306C] flex items-center justify-center transition-colors"
                  title="Instagram"
                >
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                  </svg>
                </a>
              )}
              {tiktokUrl && (
                <a
                  href={tiktokUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-9 h-9 rounded-full bg-stone-700 hover:bg-stone-500 flex items-center justify-center transition-colors"
                  title="TikTok"
                >
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                    <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.15 8.15 0 004.77 1.52V6.75a4.85 4.85 0 01-1-.06z" />
                  </svg>
                </a>
              )}
            </div>
          )}
        </div>
        <div>
          <h4 className="text-white font-semibold mb-3">ลิงก์ด่วน</h4>
          <ul className="space-y-2 text-sm">
            <li><a href="/" className="hover:text-orange-400 transition-colors">หน้าแรก</a></li>
            <li><a href="/products" className="hover:text-orange-400 transition-colors">สินค้าทั้งหมด</a></li>
            <li><a href="/articles" className="hover:text-orange-400 transition-colors">บทความ</a></li>
            <li><a href="/stores" className="hover:text-orange-400 transition-colors">สาขา</a></li>
          </ul>
        </div>
        <div>
          <h4 className="text-white font-semibold mb-3">ติดต่อเรา</h4>
          <ul className="space-y-2 text-sm">
            {hasContact ? (
              <>
                {phone && <li>📞 <a href={`tel:${phone}`} className="hover:text-orange-400 transition-colors">{phone}</a></li>}
                {lineId && (
                  <li>
                    💬 LINE:{" "}
                    <a href={`https://line.me/ti/p/~${lineId}`} target="_blank" rel="noopener noreferrer" className="hover:text-orange-400 transition-colors">
                      {lineId}
                    </a>
                  </li>
                )}
              </>
            ) : (
              <>
                <li>📞 02-123-4567</li>
                <li>📧 hello@petshop.com</li>
                <li>📍 กรุงเทพมหานคร</li>
                <li>🕐 เปิดทุกวัน 09:00 - 21:00</li>
              </>
            )}
          </ul>
        </div>
      </div>
      <div className="border-t border-stone-700 text-center py-4 text-xs text-stone-500">
        © {year} {storeName}. สงวนลิขสิทธิ์ทุกประการ
      </div>
    </footer>
  );
}
