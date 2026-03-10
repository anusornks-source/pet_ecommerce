import type { CustomJWTPayload } from "@/lib/auth";

export interface ApiSuccess<T> {
  success: true;
  data: T;
}

export interface ApiError {
  success: false;
  error: string;
  code?: string;
  fieldErrors?: Record<string, string>;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

export interface LoginRequestBody {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface RegisterRequestBody {
  email: string;
  password: string;
  name: string;
}

export interface AuthUserDto {
  id: string;
  email: string;
  name: string;
  role: string;
}

export interface LoginSuccessPayload {
  user: AuthUserDto;
  tokenPayload: CustomJWTPayload;
}

export type LoginResponse = ApiResponse<LoginSuccessPayload>;

export interface RegisterSuccessPayload {
  user: AuthUserDto;
  tokenPayload: CustomJWTPayload;
}

export type RegisterResponse = ApiResponse<RegisterSuccessPayload>;

export type LogoutResponse = ApiResponse<null>;

export function mapUserToDto(user: {
  id: string;
  email: string;
  name: string;
  role: string;
}): AuthUserDto {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  };
}

