"use client";

import { useState, useEffect, useCallback } from "react";

interface ConfigStatus {
  database: boolean;
  cj: boolean;
  email: boolean;
  facebook: boolean;
  line: boolean;
  stripe: boolean;
}

interface TestResult {
  success: boolean;
  message?: string;
  error?: string;
  ms?: number;
}

interface TestState {
  loading: boolean;
  result: TestResult | null;
}

function StatusBadge({ configured }: { configured: boolean }) {
  return configured ? (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
      Configured
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-stone-400 bg-stone-50 border border-stone-200 px-2 py-0.5 rounded-full">
      <span className="w-1.5 h-1.5 rounded-full bg-stone-300" />
      Not configured
    </span>
  );
}

function ResultBox({ state }: { state: TestState | undefined }) {
  if (!state) return null;
  if (state.loading) {
    return (
      <div className="mt-3 flex items-center gap-2 text-sm text-stone-400">
        <span className="inline-block w-4 h-4 border-2 border-stone-300 border-t-orange-400 rounded-full animate-spin" />
        กำลังทดสอบ...
      </div>
    );
  }
  if (!state.result) return null;
  const { success, message, error, ms } = state.result;
  return (
    <div
      className={`mt-3 rounded-xl px-4 py-3 text-sm flex items-start gap-2 ${
        success
          ? "bg-emerald-50 border border-emerald-200 text-emerald-700"
          : "bg-red-50 border border-red-200 text-red-700"
      }`}
    >
      <span className="text-base leading-none mt-0.5">{success ? "✅" : "❌"}</span>
      <div className="flex-1 min-w-0">
        <p className="break-words">{success ? message : error}</p>
        {ms !== undefined && (
          <p className={`text-xs mt-0.5 ${success ? "text-emerald-500" : "text-red-400"}`}>{ms} ms</p>
        )}
      </div>
    </div>
  );
}

function TestButton({
  onClick,
  loading,
  label,
  variant = "primary",
  disabled,
}: {
  onClick: () => void;
  loading: boolean;
  label: string;
  variant?: "primary" | "secondary";
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading || disabled}
      className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
        variant === "primary"
          ? "bg-stone-800 hover:bg-stone-700 text-white"
          : "bg-stone-100 hover:bg-stone-200 text-stone-700"
      }`}
    >
      {loading && (
        <span className="inline-block w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
      )}
      {label}
    </button>
  );
}

export default function SystemIntegrationPage() {
  const [config, setConfig] = useState<ConfigStatus | null>(null);
  const [tests, setTests] = useState<Record<string, TestState>>({});
  const [testEmail, setTestEmail] = useState("");

  useEffect(() => {
    fetch("/api/admin/system-integration")
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setConfig(d.data);
      });
  }, []);

  const runTest = useCallback(async (testId: string, payload?: Record<string, string>) => {
    setTests((prev) => ({ ...prev, [testId]: { loading: true, result: null } }));
    try {
      const res = await fetch("/api/admin/system-integration", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ test: testId, payload }),
      });
      const data = await res.json();
      setTests((prev) => ({ ...prev, [testId]: { loading: false, result: data } }));
    } catch {
      setTests((prev) => ({
        ...prev,
        [testId]: { loading: false, result: { success: false, error: "Network error" } },
      }));
    }
  }, []);

  const configuredCount = config ? Object.values(config).filter(Boolean).length : 0;
  const totalCount = config ? Object.values(config).length : 0;

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-stone-800">System Integration</h1>
        <p className="text-stone-500 text-sm mt-1">ตรวจสอบและทดสอบการเชื่อมต่อ API ทั้งหมด</p>
      </div>

      {/* Overview */}
      {config && (
        <div className="mb-6 bg-white rounded-2xl border border-stone-100 p-5 flex items-center gap-6">
          <div className="flex items-center gap-3">
            <div
              className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl font-bold ${
                configuredCount === totalCount
                  ? "bg-emerald-50 text-emerald-600"
                  : configuredCount === 0
                  ? "bg-red-50 text-red-500"
                  : "bg-orange-50 text-orange-500"
              }`}
            >
              {configuredCount === totalCount ? "✅" : "⚠️"}
            </div>
            <div>
              <p className="font-semibold text-stone-800">
                {configuredCount}/{totalCount} Integrations configured
              </p>
              <p className="text-xs text-stone-400 mt-0.5">
                {configuredCount === totalCount
                  ? "ทุก integration พร้อมใช้งาน"
                  : `ยังมี ${totalCount - configuredCount} integration ที่ยังไม่ได้ตั้งค่า`}
              </p>
            </div>
          </div>
          <div className="ml-auto flex flex-wrap gap-2">
            {[
              { key: "database", label: "Database" },
              { key: "cj", label: "CJ" },
              { key: "email", label: "Email" },
              { key: "facebook", label: "Facebook" },
              { key: "line", label: "LINE" },
              { key: "stripe", label: "Stripe" },
            ].map(({ key, label }) => (
              <span
                key={key}
                className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                  config[key as keyof ConfigStatus]
                    ? "bg-emerald-50 text-emerald-600 border border-emerald-200"
                    : "bg-stone-50 text-stone-400 border border-stone-200"
                }`}
              >
                {label}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* ── Database ── */}
        <div className="bg-white rounded-2xl border border-stone-100 p-5">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🗄️</span>
              <div>
                <h2 className="font-semibold text-stone-800">Database</h2>
                <p className="text-xs text-stone-400 mt-0.5">PostgreSQL (Neon)</p>
              </div>
            </div>
            <StatusBadge configured={config?.database ?? false} />
          </div>

          <div className="flex gap-2">
            <TestButton
              onClick={() => runTest("database")}
              loading={tests["database"]?.loading ?? false}
              label="Test Connection"
            />
          </div>
          <ResultBox state={tests["database"]} />
        </div>

        {/* ── CJ Dropshipping ── */}
        <div className="bg-white rounded-2xl border border-stone-100 p-5">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🚚</span>
              <div>
                <h2 className="font-semibold text-stone-800">CJ Dropshipping</h2>
                <p className="text-xs text-stone-400 mt-0.5">CJ_API_KEY</p>
              </div>
            </div>
            <StatusBadge configured={config?.cj ?? false} />
          </div>

          <div className="flex gap-2">
            <TestButton
              onClick={() => runTest("cj-auth")}
              loading={tests["cj-auth"]?.loading ?? false}
              label="Test Auth Token"
              disabled={!config?.cj}
            />
            <TestButton
              onClick={() => runTest("cj-search")}
              loading={tests["cj-search"]?.loading ?? false}
              label="Test Search API"
              variant="secondary"
              disabled={!config?.cj}
            />
          </div>
          <ResultBox state={tests["cj-auth"]} />
          <ResultBox state={tests["cj-search"]} />

          {!config?.cj && (
            <p className="mt-3 text-xs text-stone-400">ต้องตั้งค่า CJ_API_KEY ใน .env ก่อน</p>
          )}
        </div>

        {/* ── Email ── */}
        <div className="bg-white rounded-2xl border border-stone-100 p-5">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl">📧</span>
              <div>
                <h2 className="font-semibold text-stone-800">Email (SMTP)</h2>
                <p className="text-xs text-stone-400 mt-0.5">
                  {process.env.NEXT_PUBLIC_APP_URL ? "Nodemailer" : "EMAIL_HOST / EMAIL_USER / EMAIL_PASS"}
                </p>
              </div>
            </div>
            <StatusBadge configured={config?.email ?? false} />
          </div>

          <div className="flex gap-2 flex-wrap">
            <TestButton
              onClick={() => runTest("email-verify")}
              loading={tests["email-verify"]?.loading ?? false}
              label="Verify SMTP"
              disabled={!config?.email}
            />
          </div>

          {/* Send test email */}
          <div className="mt-3 flex gap-2">
            <input
              type="email"
              placeholder="ส่ง test email ไปที่..."
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              className="flex-1 text-sm border border-stone-200 rounded-xl px-3 py-2 text-stone-700 placeholder-stone-300 focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-orange-300"
            />
            <TestButton
              onClick={() => runTest("email-send", { to: testEmail })}
              loading={tests["email-send"]?.loading ?? false}
              label="Send"
              variant="secondary"
              disabled={!config?.email || !testEmail.trim()}
            />
          </div>

          <ResultBox state={tests["email-verify"]} />
          <ResultBox state={tests["email-send"]} />

          {!config?.email && (
            <p className="mt-3 text-xs text-stone-400">ต้องตั้งค่า EMAIL_HOST, EMAIL_USER, EMAIL_PASS ใน .env</p>
          )}
        </div>

        {/* ── Stripe ── */}
        <div className="bg-white rounded-2xl border border-stone-100 p-5">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl">💳</span>
              <div>
                <h2 className="font-semibold text-stone-800">Stripe</h2>
                <p className="text-xs text-stone-400 mt-0.5">STRIPE_SECRET_KEY</p>
              </div>
            </div>
            <StatusBadge configured={config?.stripe ?? false} />
          </div>

          <div className="flex gap-2">
            <TestButton
              onClick={() => runTest("stripe")}
              loading={tests["stripe"]?.loading ?? false}
              label="Test Connection"
              disabled={!config?.stripe}
            />
          </div>
          <ResultBox state={tests["stripe"]} />

          {!config?.stripe && (
            <p className="mt-3 text-xs text-stone-400">ต้องตั้งค่า STRIPE_SECRET_KEY ใน .env</p>
          )}
        </div>

        {/* ── Facebook OAuth ── */}
        <div className="bg-white rounded-2xl border border-stone-100 p-5">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🔵</span>
              <div>
                <h2 className="font-semibold text-stone-800">Facebook OAuth</h2>
                <p className="text-xs text-stone-400 mt-0.5">FACEBOOK_APP_ID / FACEBOOK_APP_SECRET</p>
              </div>
            </div>
            <StatusBadge configured={config?.facebook ?? false} />
          </div>

          <div
            className={`rounded-xl px-4 py-3 text-sm ${
              config?.facebook
                ? "bg-emerald-50 border border-emerald-200 text-emerald-700"
                : "bg-stone-50 border border-stone-200 text-stone-400"
            }`}
          >
            {config?.facebook ? (
              <span className="flex items-center gap-2">
                <span>✅</span> FACEBOOK_APP_ID และ FACEBOOK_APP_SECRET พร้อมแล้ว
              </span>
            ) : (
              <span>ยังไม่ได้ตั้งค่า — Social login ด้วย Facebook จะไม่ทำงาน</span>
            )}
          </div>
          <p className="mt-2 text-xs text-stone-400">
            * Facebook OAuth ทดสอบได้เฉพาะผ่าน browser flow เท่านั้น
          </p>
        </div>

        {/* ── LINE OAuth ── */}
        <div className="bg-white rounded-2xl border border-stone-100 p-5">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🟢</span>
              <div>
                <h2 className="font-semibold text-stone-800">LINE OAuth</h2>
                <p className="text-xs text-stone-400 mt-0.5">LINE_CHANNEL_ID / LINE_CHANNEL_SECRET</p>
              </div>
            </div>
            <StatusBadge configured={config?.line ?? false} />
          </div>

          <div
            className={`rounded-xl px-4 py-3 text-sm ${
              config?.line
                ? "bg-emerald-50 border border-emerald-200 text-emerald-700"
                : "bg-stone-50 border border-stone-200 text-stone-400"
            }`}
          >
            {config?.line ? (
              <span className="flex items-center gap-2">
                <span>✅</span> LINE_CHANNEL_ID และ LINE_CHANNEL_SECRET พร้อมแล้ว
              </span>
            ) : (
              <span>ยังไม่ได้ตั้งค่า — Social login ด้วย LINE จะไม่ทำงาน</span>
            )}
          </div>
          <p className="mt-2 text-xs text-stone-400">
            * LINE OAuth ทดสอบได้เฉพาะผ่าน browser flow เท่านั้น
          </p>
        </div>
      </div>

      {/* ENV Reference */}
      <div className="mt-6 bg-white rounded-2xl border border-stone-100 p-5">
        <h2 className="font-semibold text-stone-800 mb-3">📋 Environment Variables Reference</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-0 text-sm">
          {[
            { group: "Database", vars: ["DATABASE_URL", "DIRECT_URL"] },
            { group: "Auth", vars: ["JWT_SECRET", "NEXT_PUBLIC_APP_URL"] },
            { group: "CJ Dropshipping", vars: ["CJ_API_KEY", "CJ_LOGISTIC_NAME"] },
            { group: "Email", vars: ["EMAIL_HOST", "EMAIL_PORT", "EMAIL_USER", "EMAIL_PASS", "EMAIL_FROM"] },
            { group: "Facebook", vars: ["FACEBOOK_APP_ID", "FACEBOOK_APP_SECRET"] },
            { group: "LINE", vars: ["LINE_CHANNEL_ID", "LINE_CHANNEL_SECRET"] },
            { group: "Stripe", vars: ["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET", "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY"] },
            { group: "Storage", vars: ["BLOB_READ_WRITE_TOKEN"] },
          ].map(({ group, vars }) => (
            <div key={group} className="py-3 border-b border-stone-50 last:border-0">
              <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-1.5">{group}</p>
              <div className="flex flex-wrap gap-1.5">
                {vars.map((v) => (
                  <code
                    key={v}
                    className="text-xs bg-stone-50 border border-stone-200 text-stone-600 px-2 py-0.5 rounded-lg font-mono"
                  >
                    {v}
                  </code>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
