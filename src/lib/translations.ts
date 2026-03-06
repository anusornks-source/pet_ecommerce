export type Lang = 'th' | 'en';

export const translations = {
  nav: {
    home:     { th: 'หน้าแรก',        en: 'Home' },
    products: { th: 'สินค้า',         en: 'Products' },
    advisor:  { th: 'ที่ปรึกษา AI', en: 'AI Advisor' },
    stores:   { th: 'สาขา',           en: 'Stores' },
    articles: { th: 'บทความ',         en: 'Articles' },
  },
  auth: {
    login:    { th: 'เข้าสู่ระบบ',   en: 'Login' },
    register: { th: 'สมัครสมาชิก',   en: 'Register' },
    logout:   { th: 'ออกจากระบบ',    en: 'Logout' },
    profile:  { th: 'โปรไฟล์ของฉัน', en: 'My Profile' },
    orders:   { th: 'ประวัติคำสั่งซื้อ', en: 'Order History' },
    adminCms: { th: 'Admin CMS',      en: 'Admin CMS' },
  },
  cart: {
    title:   { th: 'ตะกร้าสินค้า', en: 'Cart' },
    empty:   { th: 'ตะกร้าว่าง',   en: 'Cart is empty' },
    checkout:{ th: 'ชำระเงิน',     en: 'Checkout' },
    total:   { th: 'ยอดรวม',        en: 'Total' },
    remove:  { th: 'ลบ',            en: 'Remove' },
    qty:     { th: 'จำนวน',         en: 'Qty' },
  },
  product: {
    addToCart:      { th: 'เพิ่มลงตะกร้า',    en: 'Add to Cart' },
    outOfStock:     { th: 'สินค้าหมด',        en: 'Out of Stock' },
    inStock:        { th: 'มีสินค้า',         en: 'In Stock' },
    deliveryDays:   { th: 'จัดส่งภายใน',      en: 'Delivery in' },
    days:           { th: 'วัน',               en: 'days' },
    reviews:        { th: 'รีวิวสินค้า',       en: 'Reviews' },
    noReviews:      { th: 'ยังไม่มีรีวิว',     en: 'No reviews yet' },
    relatedProducts:{ th: 'สินค้าที่เกี่ยวข้อง', en: 'Related Products' },
    allProducts:    { th: 'สินค้าทั้งหมด',     en: 'All Products' },
    sortBy:         { th: 'เรียงโดย',          en: 'Sort by' },
    search:         { th: 'ค้นหาสินค้า...',   en: 'Search products...' },
    free_shipping:  { th: '🚚 จัดส่งทั่วไทย', en: '🚚 Nationwide Shipping' },
    quality:        { th: '✅ สินค้าคุณภาพ',   en: '✅ Quality Products' },
    afterSales:     { th: '💬 ดูแลหลังขาย',   en: '💬 After Sales Support' },
  },
  breadcrumb: {
    home:     { th: 'หน้าแรก', en: 'Home' },
    products: { th: 'สินค้า',  en: 'Products' },
    articles: { th: 'บทความ',  en: 'Articles' },
    stores:   { th: 'สาขา',    en: 'Stores' },
    cart:     { th: 'ตะกร้า',  en: 'Cart' },
    checkout: { th: 'ชำระเงิน', en: 'Checkout' },
  },
  common: {
    loading:  { th: 'กำลังโหลด...', en: 'Loading...' },
    noData:   { th: 'ไม่พบข้อมูล',  en: 'No data found' },
    save:     { th: 'บันทึก',       en: 'Save' },
    cancel:   { th: 'ยกเลิก',       en: 'Cancel' },
    confirm:  { th: 'ยืนยัน',       en: 'Confirm' },
    back:     { th: 'กลับ',         en: 'Back' },
    viewAll:  { th: 'ดูทั้งหมด',    en: 'View All' },
    baht:     { th: '฿',            en: '฿' },
  },
  checkout: {
    title:       { th: 'ชำระเงิน',         en: 'Checkout' },
    shipping:    { th: 'ที่อยู่จัดส่ง',    en: 'Shipping Address' },
    payment:     { th: 'วิธีชำระเงิน',     en: 'Payment Method' },
    orderSummary:{ th: 'สรุปคำสั่งซื้อ',   en: 'Order Summary' },
    placeOrder:  { th: 'สั่งซื้อ',          en: 'Place Order' },
    success:     { th: 'สั่งซื้อสำเร็จ',   en: 'Order Placed!' },
  },
  profile: {
    title:    { th: 'โปรไฟล์',            en: 'Profile' },
    orders:   { th: 'ประวัติคำสั่งซื้อ',   en: 'Order History' },
    addresses:{ th: 'ที่อยู่จัดส่ง',       en: 'Addresses' },
    wishlist: { th: 'รายการโปรด',          en: 'Wishlist' },
  },
  advisor: {
    title:       { th: '🐾 ที่ปรึกษาสัตว์เลี้ยง AI', en: '🐾 AI Pet Advisor' },
    placeholder: { th: 'ถามเกี่ยวกับสัตว์เลี้ยงของคุณ...', en: 'Ask about your pet...' },
    send:        { th: 'ส่ง', en: 'Send' },
  },
  stores: {
    title: { th: 'สาขาของเรา', en: 'Our Stores' },
  },
} as const;

export type TranslationKey = keyof typeof translations;

/** Helper: pick string by lang */
export function pickLang(th: string | null | undefined, en: string | null | undefined, lang: Lang): string {
  if (lang === 'th') return th || en || '';
  return en || th || '';
}
