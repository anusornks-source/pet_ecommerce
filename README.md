# 🐾 PetShop - ร้านสัตว์เลี้ยงออนไลน์

Web e-commerce สำหรับขายสัตว์เลี้ยง อาหาร และของเล่น

## Tech Stack

- **Next.js 15** (App Router)
- **TypeScript**
- **PostgreSQL** + **Prisma ORM**
- **Tailwind CSS v4**
- **Jose** (JWT authentication)
- **Bcryptjs** (password hashing)
- **React Hot Toast** (notifications)

## Features

- ✅ Register / Login (JWT + HTTP-only cookie)
- ✅ Product listing with filters (category, pet type, search)
- ✅ Product detail page
- ✅ Shopping cart (add, update quantity, remove)
- ✅ Checkout with multi-step form
- ✅ Payment methods (PromptPay, Credit Card, Bank Transfer, COD)
- ✅ Order history
- ✅ User profile (view & edit)
- ✅ Protected routes via middleware

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Setup environment

```bash
cp .env.example .env.local
# Edit .env.local with your PostgreSQL connection string
```

### 3. Setup database

```bash
# Push schema to database
npm run db:push

# Seed with sample data
npm run db:seed
```

### 4. Run development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Production Deployment

### 1. Database Setup (Neon PostgreSQL)

1. สร้างบัญชีที่ [Neon](https://neon.tech)
2. สร้าง Project ใหม่
3. คัดลอก Connection String จากแท็บ "Connection Details"
4. อัปเดตไฟล์ `.env`:

```env
DATABASE_URL="postgresql://username:password@host/database?sslmode=require"
DIRECT_URL="postgresql://username:password@host/database?sslmode=require"
JWT_SECRET="your-super-secret-jwt-key-change-in-production"
NEXT_PUBLIC_APP_URL="https://yourdomain.com"
```

### 2. Deploy to Vercel

1. Push code to GitHub
2. เชื่อมต่อกับ Vercel
3. เพิ่ม Environment Variables ใน Vercel Dashboard
4. Deploy

### 3. Database Migration

```bash
# สำหรับ Production
npm run db:push
npm run db:seed
```

**⚠️ สำคัญ:** ตรวจสอบว่า Neon database ไม่ได้ปิดตัวเอง (Resume ถ้าจำเป็น)

## Demo Accounts

| Role  | Email                | Password   |
|-------|----------------------|------------|
| User  | demo@petshop.com     | demo1234   |
| Admin | admin@petshop.com    | admin1234  |

## Database Commands

```bash
npm run db:generate   # Generate Prisma client
npm run db:push       # Push schema changes
npm run db:migrate    # Create migration
npm run db:seed       # Seed sample data
npm run db:studio     # Open Prisma Studio
```

## Project Structure

```
src/
├── app/
│   ├── api/           # API routes
│   │   ├── auth/      # login, register, logout, me
│   │   ├── products/  # product list + detail
│   │   ├── cart/      # cart management
│   │   ├── orders/    # order creation + history
│   │   └── categories/
│   ├── (pages)/
│   │   ├── page.tsx          # Home
│   │   ├── login/            # Login
│   │   ├── register/         # Register
│   │   ├── products/         # Product list + detail
│   │   ├── cart/             # Cart
│   │   ├── checkout/         # Checkout + success
│   │   └── profile/          # Profile + orders
│   └── layout.tsx
├── components/
│   ├── Navbar.tsx
│   ├── ProductCard.tsx
│   └── Footer.tsx
├── context/
│   ├── AuthContext.tsx
│   └── CartContext.tsx
├── lib/
│   ├── prisma.ts
│   ├── auth.ts
│   └── utils.ts
├── types/
│   └── index.ts
└── middleware.ts
```
