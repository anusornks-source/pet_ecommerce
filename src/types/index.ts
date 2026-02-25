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

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  images: string[];
  categoryId: string;
  category: Category;
  petType?: string | null;
  featured: boolean;
  createdAt: string;
}

export interface CartItem {
  id: string;
  cartId: string;
  productId: string;
  quantity: number;
  product: Product;
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

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
