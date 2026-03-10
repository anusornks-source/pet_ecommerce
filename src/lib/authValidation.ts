export interface RegisterInput {
  email: string;
  password: string;
  name: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export type AuthValidationErrorCode =
  | "INVALID_EMAIL"
  | "INVALID_PASSWORD"
  | "INVALID_NAME";

export interface AuthValidationError {
  field: keyof RegisterInput | keyof LoginInput;
  code: AuthValidationErrorCode;
  message: string;
}

const EMAIL_REGEX =
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateRegisterInput(
  input: RegisterInput,
  locale: "th" | "en" = "th"
): AuthValidationError[] {
  const errors: AuthValidationError[] = [];

  if (!EMAIL_REGEX.test(input.email.trim())) {
    errors.push({
      field: "email",
      code: "INVALID_EMAIL",
      message:
        locale === "th"
          ? "รูปแบบอีเมลไม่ถูกต้อง"
          : "Invalid email address",
    });
  }

  const password = input.password ?? "";
  if (password.length < 8 || !/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
    errors.push({
      field: "password",
      code: "INVALID_PASSWORD",
      message:
        locale === "th"
          ? "รหัสผ่านควรมีอย่างน้อย 8 ตัวอักษร และมีทั้งตัวอักษรและตัวเลข"
          : "Password must be at least 8 characters and contain both letters and numbers",
    });
  }

  if (!input.name || !input.name.trim()) {
    errors.push({
      field: "name",
      code: "INVALID_NAME",
      message:
        locale === "th"
          ? "กรุณากรอกชื่อ"
          : "Please enter your name",
    });
  }

  return errors;
}

export function validateLoginInput(
  input: LoginInput,
  locale: "th" | "en" = "th"
): AuthValidationError[] {
  const errors: AuthValidationError[] = [];

  if (!EMAIL_REGEX.test(input.email.trim())) {
    errors.push({
      field: "email",
      code: "INVALID_EMAIL",
      message:
        locale === "th"
          ? "รูปแบบอีเมลไม่ถูกต้อง"
          : "Invalid email address",
    });
  }

  if (!input.password) {
    errors.push({
      field: "password",
      code: "INVALID_PASSWORD",
      message:
        locale === "th"
          ? "กรุณากรอกรหัสผ่าน"
          : "Please enter your password",
    });
  }

  return errors;
}

