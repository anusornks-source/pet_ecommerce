export interface User {
  id: string;
  email: string;
  name: string;
  phone?: string | null;
  address?: string | null;
  avatar?: string | null;
  role: "USER" | "ADMIN";
  createdAt: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  icon?: string | null;
}

export interface ProductVariant {
  id: string;
  productId: string;
  size?: string | null;
  color?: string | null;
  price: number;
  stock: number;
  sku?: string | null;
  variantImage?: string | null;
  attributes?: { name: string; value: string }[] | null;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  shortDescription?: string | null;
  price: number;
  stock: number;
  images: string[];
  categoryId: string;
  category: Category;
  petType?: string | null;
  featured: boolean;
  highlight: boolean;
  highlightOrder?: number | null;
  createdAt: string;
  variants?: ProductVariant[];
}

export interface CartItem {
  id: string;
  cartId: string;
  productId: string;
  variantId?: string | null;
  quantity: number;
  product: Product;
  variant?: ProductVariant | null;
}

export interface Cart {
  id: string;
  userId: string;
  items: CartItem[];
}

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  quantity: number;
  price: number;
  product: Product;
}

export interface Payment {
  id: string;
  orderId: string;
  method: string;
  status: string;
  amount: number;
  ref?: string | null;
  paidAt?: string | null;
}

export interface Order {
  id: string;
  userId: string;
  status: string;
  total: number;
  address: string;
  phone: string;
  note?: string | null;
  createdAt: string;
  items: OrderItem[];
  payment?: Payment | null;
}

export interface Review {
  id: string;
  productId: string;
  userId: string;
  rating: number;
  comment?: string | null;
  createdAt: string;
  user: Pick<User, "id" | "name" | "avatar">;
}

export interface WishlistItem {
  id: string;
  userId: string;
  productId: string;
  createdAt: string;
  product: Product;
}

export interface Address {
  id: string;
  userId: string;
  label: string;
  name: string;
  phone: string;
  address: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
