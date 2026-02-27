"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, Suspense } from "react";
import { useAuth } from "@/context/AuthContext";
import toast from "react-hot-toast";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [showPwd, setShowPwd] = useState(false);

  useEffect(() => {
    const error = searchParams.get("error");
    if (error) {
      const messages: Record<string, string> = {
        facebook_cancelled: "ยกเลิกการเข้าสู่ระบบ Facebook",
        facebook_token: "Facebook login ผิดพลาด กรุณาลองใหม่",
        facebook_profile: "ไม่สามารถดึงข้อมูล Facebook ได้",
        facebook_failed: "Facebook login ผิดพลาด กรุณาลองใหม่",
        line_cancelled: "ยกเลิกการเข้าสู่ระบบ LINE",
        line_token: "LINE login ผิดพลาด กรุณาลองใหม่",
        line_profile: "ไม่สามารถดึงข้อมูล LINE ได้",
        line_failed: "LINE login ผิดพลาด กรุณาลองใหม่",
      };
      toast.error(messages[error] ?? "เกิดข้อผิดพลาด กรุณาลองใหม่");
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(form.email, form.password);
      toast.success("เข้าสู่ระบบสำเร็จ! 🎉");
      router.push("/");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Card */}
        <div className="bg-white rounded-3xl shadow-xl p-8 md:p-10">
          <div className="text-center mb-8">
            <div className="text-5xl mb-3">🐾</div>
            <h1 className="text-2xl font-bold text-stone-800">ยินดีต้อนรับกลับ!</h1>
            <p className="text-stone-500 mt-1">เข้าสู่ระบบเพื่อช้อปสินค้าสัตว์เลี้ยง</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1.5">อีเมล</label>
              <input
                type="email"
                className="input"
                placeholder="your@email.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1.5">รหัสผ่าน</label>
              <div className="relative">
                <input
                  type={showPwd ? "text" : "password"}
                  className="input pr-12"
                  placeholder="รหัสผ่านของคุณ"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                >
                  {showPwd ? "🙈" : "👁️"}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary py-3 text-base flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  กำลังเข้าสู่ระบบ...
                </>
              ) : (
                "เข้าสู่ระบบ"
              )}
            </button>
          </form>

          {/* Demo accounts */}
          <div className="mt-6 p-4 bg-amber-50 rounded-xl border border-amber-200">
            <p className="text-xs font-medium text-amber-700 mb-2">💡 บัญชีทดสอบ</p>
            <div className="space-y-1 text-xs text-amber-600">
              <p>demo@petshop.com / demo1234</p>
              <p>admin@petshop.com / admin1234</p>
            </div>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-stone-200" />
            <span className="text-xs text-stone-400">หรือเข้าสู่ระบบด้วย</span>
            <div className="flex-1 h-px bg-stone-200" />
          </div>

          {/* Social login */}
          <div className="space-y-3">
            <a
              href="/api/auth/facebook"
              className="flex items-center justify-center gap-3 w-full py-3 px-4 rounded-xl border border-stone-200 hover:bg-stone-50 transition-colors text-sm font-medium text-stone-700"
            >
              <svg className="w-5 h-5 text-[#1877F2]" fill="currentColor" viewBox="0 0 24 24">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
              </svg>
              เข้าสู่ระบบด้วย Facebook
            </a>
            <a
              href="/api/auth/line"
              className="flex items-center justify-center gap-3 w-full py-3 px-4 rounded-xl border border-stone-200 hover:bg-stone-50 transition-colors text-sm font-medium text-stone-700"
            >
              <svg className="w-5 h-5 text-[#06C755]" fill="currentColor" viewBox="0 0 24 24">
                <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63h2.386c.349 0 .63.285.63.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63.349 0 .631.285.631.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.281.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
              </svg>
              เข้าสู่ระบบด้วย LINE
            </a>
          </div>

          <p className="text-center text-sm text-stone-500 mt-6">
            ยังไม่มีบัญชี?{" "}
            <Link href="/register" className="text-orange-500 font-medium hover:text-orange-600">
              สมัครสมาชิก
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
