export default function Footer() {
  return (
    <footer className="bg-stone-800 text-stone-300 mt-16">
      <div className="max-w-6xl mx-auto px-4 py-12 grid grid-cols-1 md:grid-cols-3 gap-8">
        <div>
          <div className="flex items-center gap-2 text-white font-bold text-xl mb-3">
            <span className="text-2xl">🐾</span>
            <span>PetShop</span>
          </div>
          <p className="text-sm leading-relaxed">
            ร้านสัตว์เลี้ยงออนไลน์ที่คุณไว้วางใจได้ เราคัดสรรสัตว์เลี้ยง อาหาร และของเล่น คุณภาพสูงสำหรับน้องรัก
          </p>
        </div>
        <div>
          <h4 className="text-white font-semibold mb-3">ลิงก์ด่วน</h4>
          <ul className="space-y-2 text-sm">
            <li><a href="/" className="hover:text-orange-400 transition-colors">หน้าแรก</a></li>
            <li><a href="/products" className="hover:text-orange-400 transition-colors">สินค้าทั้งหมด</a></li>
            <li><a href="/cart" className="hover:text-orange-400 transition-colors">ตะกร้าสินค้า</a></li>
            <li><a href="/profile" className="hover:text-orange-400 transition-colors">โปรไฟล์</a></li>
          </ul>
        </div>
        <div>
          <h4 className="text-white font-semibold mb-3">ติดต่อเรา</h4>
          <ul className="space-y-2 text-sm">
            <li>📞 02-123-4567</li>
            <li>📧 hello@petshop.com</li>
            <li>📍 กรุงเทพมหานคร</li>
            <li>🕐 เปิดทุกวัน 09:00 - 21:00</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-stone-700 text-center py-4 text-xs text-stone-500">
        © 2025 PetShop. สงวนลิขสิทธิ์ทุกประการ
      </div>
    </footer>
  );
}
