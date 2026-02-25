"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import toast from "react-hot-toast";

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuth();
  const [form, setForm] = useState({ name: "", email: "", password: "", confirmPassword: "" });
  const [loading, setLoading] = useState(false);
  const [showPwd, setShowPwd] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) {
      toast.error("รหัสผ่านไม่ตรงกัน");
      return;
    }
    setLoading(true);
    try {
      await register(form.name, form.email, form.password);
      toast.success("สมัครสมาชิกสำเร็จ! 🎉");
      router.push("/");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
    } finally {
      setLoading(false);
    }
  };

  const passwordStrength = () => {
    const pwd = form.password;
    if (!pwd) return null;
    if (pwd.length < 6) return { label: "อ่อน", color: "bg-red-400", width: "w-1/3" };
    if (pwd.length < 10) return { label: "ปานกลาง", color: "bg-yellow-400", width: "w-2/3" };
    return { label: "แข็งแกร่ง", color: "bg-green-400", width: "w-full" };
  };

  const strength = passwordStrength();

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-3xl shadow-xl p-8 md:p-10">
          <div className="text-center mb-8">
            <div className="text-5xl mb-3">🐾</div>
            <h1 className="text-2xl font-bold text-stone-800">สมัครสมาชิก</h1>
            <p className="text-stone-500 mt-1">เริ่มช้อปสินค้าสัตว์เลี้ยงกับเรา</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1.5">ชื่อ-นามสกุล</label>
              <input
                type="text"
                className="input"
                placeholder="ชื่อของคุณ"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
                minLength={2}
              />
            </div>

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
                  placeholder="อย่างน้อย 6 ตัวอักษร"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required
                  minLength={6}
                />
                <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400">
                  {showPwd ? "🙈" : "👁️"}
                </button>
              </div>
              {strength && (
                <div className="mt-2">
                  <div className="h-1.5 bg-stone-100 rounded-full overflow-hidden">
                    <div className={`h-full ${strength.color} ${strength.width} transition-all`} />
                  </div>
                  <p className="text-xs text-stone-500 mt-1">ความแข็งแกร่ง: {strength.label}</p>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1.5">ยืนยันรหัสผ่าน</label>
              <input
                type={showPwd ? "text" : "password"}
                className={`input ${
                  form.confirmPassword && form.password !== form.confirmPassword
                    ? "border-red-300 focus:ring-red-300"
                    : ""
                }`}
                placeholder="ยืนยันรหัสผ่าน"
                value={form.confirmPassword}
                onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                required
              />
              {form.confirmPassword && form.password !== form.confirmPassword && (
                <p className="text-xs text-red-500 mt-1">รหัสผ่านไม่ตรงกัน</p>
              )}
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
                  กำลังสมัคร...
                </>
              ) : (
                "สมัครสมาชิก"
              )}
            </button>
          </form>

          <p className="text-center text-sm text-stone-500 mt-6">
            มีบัญชีแล้ว?{" "}
            <Link href="/login" className="text-orange-500 font-medium hover:text-orange-600">
              เข้าสู่ระบบ
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
