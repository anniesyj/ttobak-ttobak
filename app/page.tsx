"use client";

import { useEffect, useMemo, useState } from "react";

type Mode = "easy" | "summary" | "checklist";

const FREE_LIMIT = 5;
const USAGE_KEY = "ttobak_usage_count_v1";

const TRIAL_ACTIVE_KEY = "ttobak_trial_active_v1";
const TRIAL_EMAIL_KEY = "ttobak_trial_email_v1";
const TRIAL_START_KEY = "ttobak_trial_start_v1";
const TRIAL_DAYS = 7;

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function daysLeftFrom(startMs: number) {
  const msLeft = startMs + TRIAL_DAYS * 24 * 60 * 60 * 1000 - Date.now();
  return Math.max(0, Math.ceil(msLeft / (24 * 60 * 60 * 1000)));
}

export default function Home() {
  const [text, setText] = useState("");
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);

  // usage
  const [usageCount, setUsageCount] = useState(0);
  const remaining = useMemo(() => Math.max(0, FREE_LIMIT - usageCount), [usageCount]);

  // trial
  const [trialEmail, setTrialEmail] = useState("");
  const [trialActive, setTrialActive] = useState(false);
  const [trialStartMs, setTrialStartMs] = useState<number | null>(null);

  const proActive = useMemo(() => {
    if (!trialActive || !trialStartMs) return false;
    return daysLeftFrom(trialStartMs) > 0;
  }, [trialActive, trialStartMs]);

  const trialDaysLeft = useMemo(() => {
    if (!trialStartMs) return 0;
    return daysLeftFrom(trialStartMs);
  }, [trialStartMs]);

  const [mode, setMode] = useState<Mode>("easy");

  // modal
  const [paywallOpen, setPaywallOpen] = useState(false);

  useEffect(() => {
    try {
      const saved = Number(localStorage.getItem(USAGE_KEY) || 0);
      setUsageCount(Number.isFinite(saved) ? saved : 0);
    } catch {}

    try {
      setTrialEmail(localStorage.getItem(TRIAL_EMAIL_KEY) || "");
    } catch {}

    try {
      const active = localStorage.getItem(TRIAL_ACTIVE_KEY) === "true";
      setTrialActive(active);
    } catch {}

    try {
      const start = Number(localStorage.getItem(TRIAL_START_KEY) || 0);
      setTrialStartMs(start > 0 ? start : null);
    } catch {}

    // auto-expire
    try {
      const start = Number(localStorage.getItem(TRIAL_START_KEY) || 0);
      const active = localStorage.getItem(TRIAL_ACTIVE_KEY) === "true";
      if (active && start > 0 && daysLeftFrom(start) <= 0) {
        localStorage.setItem(TRIAL_ACTIVE_KEY, "false");
        setTrialActive(false);
      }
    } catch {}
  }, []);

  function persistUsage(next: number) {
    setUsageCount(next);
    try {
      localStorage.setItem(USAGE_KEY, String(next));
    } catch {}
  }

  async function run() {
    if (!text.trim()) return;

    if (!proActive && usageCount >= FREE_LIMIT) {
      setOutput("무료 사용 횟수를 모두 사용했어요. Pro 7일 체험을 시작하면 무제한으로 사용할 수 있어요.");
      setPaywallOpen(true);
      return;
    }

    setLoading(true);
    setOutput("");

    try {
      const res = await fetch("/api/transform", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, mode }),
      });

      const data = await res.json().catch(() => ({} as any));
      if (!res.ok) throw new Error(data?.error || data?.message || `HTTP ${res.status}`);

      if (!proActive) persistUsage(usageCount + 1);
      setOutput(data.output);
    } catch (e: any) {
      setOutput(`오류: ${e?.message || "요청 실패"}`);
    } finally {
      setLoading(false);
    }
  }

  function startTrial() {
    const email = trialEmail.trim();
    if (!isValidEmail(email)) {
      setOutput("이메일 형식이 올바르지 않아요. 예: name@example.com");
      return;
    }

    const now = Date.now();
    try {
      localStorage.setItem(TRIAL_EMAIL_KEY, email);
      localStorage.setItem(TRIAL_START_KEY, String(now));
      localStorage.setItem(TRIAL_ACTIVE_KEY, "true");
    } catch {}

    setTrialStartMs(now);
    setTrialActive(true);
    setPaywallOpen(false);
    setOutput("✅ Pro 7일 체험이 활성화됐어요! 이제 무제한으로 사용할 수 있어요.");
  }

  async function copyOutput() {
    if (!output) return;
    try {
      await navigator.clipboard.writeText(output);
      setOutput((prev) => prev + "\n\n(✅ 복사 완료)");
    } catch {
      setOutput((prev) => prev + "\n\n(복사 실패: 브라우저 권한을 확인해 주세요)");
    }
  }

  const modeLabel: Record<Mode, string> = {
    easy: "쉬운 문장",
    summary: "3줄 요약",
    checklist: "체크리스트",
  };

  return (
    <main className="min-h-screen bg-white text-slate-900">
      <div className="mx-auto max-w-3xl px-6 py-16">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img
              src="/ttobakttobak_logo_v1.png"
              alt="또박또박 로고"
              className="h-10 w-10 object-contain"
            />
            <div>
              <div className="text-lg font-semibold tracking-tight">또박또박</div>
              <div className="text-xs text-slate-500">읽기 편하게, 이해하기 쉽게.</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-xs text-slate-500">
              {proActive ? `PRO Trial (${trialDaysLeft}일)` : `Free ${remaining}/${FREE_LIMIT}`}
            </div>
            <button
              onClick={() => setPaywallOpen(true)}
              className="rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800"
              type="button"
            >
              {proActive ? "Pro 관리" : "Pro 업그레이드"}
            </button>
          </div>
        </div>

        {/* Hero */}
        <div className="mt-20">
          <h1 className="text-4xl font-semibold tracking-tight leading-tight">
            복잡한 문장을
            <br />
            더 읽기 쉽게 바꿉니다.
          </h1>

          <p className="mt-4 text-sm text-slate-500 max-w-lg">
            공지, 행정 문서, 정책 문장을 누구나 이해할 수 있는 형태로 변환합니다.
          </p>
        </div>

        {/* Mode selector */}
        <div className="mt-12 flex gap-3">
          {(["easy", "summary", "checklist"] as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`rounded-full px-4 py-2 text-xs font-medium transition ${
                mode === m ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
              type="button"
            >
              {modeLabel[m]}
            </button>
          ))}
        </div>

        {/* Input */}
        <div className="mt-6">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="여기에 텍스트를 붙여넣으세요..."
            className="w-full h-48 rounded-3xl border border-slate-200 p-5 text-sm leading-relaxed outline-none focus:ring-2 focus:ring-slate-200"
          />
        </div>

        {/* Action */}
        <div className="mt-6 flex items-center gap-3">
          <button
            onClick={run}
            disabled={loading}
            className="rounded-full bg-slate-900 px-6 py-3 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
            type="button"
          >
            {loading ? "처리 중..." : "변환하기"}
          </button>

          <button
            onClick={copyOutput}
            disabled={!output}
            className="rounded-full bg-slate-100 px-5 py-3 text-sm font-medium text-slate-700 hover:bg-slate-200 disabled:opacity-50"
            type="button"
          >
            결과 복사
          </button>
        </div>

        {/* Output */}
        <div className="mt-10">
          <div className="text-xs text-slate-500 mb-2">결과</div>
          <div className="rounded-3xl border border-slate-200 p-5 text-sm leading-relaxed whitespace-pre-wrap">
            {output || "결과가 여기에 표시됩니다."}
          </div>
        </div>

        <div className="mt-16 text-center text-xs text-slate-400">
          © {new Date().getFullYear()} 또박또박
        </div>
      </div>

      {/* Paywall modal */}
      {paywallOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-6">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-lg font-semibold">
                  {proActive ? "Pro 상태" : "Pro 업그레이드"}
                </div>
                <div className="mt-1 text-sm text-slate-500">
                  {proActive
                    ? `현재 Pro Trial 사용 중입니다. (${trialDaysLeft}일 남음)`
                    : "Pro를 시작하면 7일 동안 무제한으로 사용할 수 있어요."}
                </div>
              </div>
              <button
                onClick={() => setPaywallOpen(false)}
                className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-200"
                type="button"
              >
                닫기
              </button>
            </div>

            <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
              <div className="font-semibold">요금</div>
              <div className="mt-1 text-slate-600">
                Pro: 월 ₩4,900 (해커톤 데모: 결제 온보딩 승인 대기 → 체험 플로우로 시연)
              </div>
            </div>

            {!proActive ? (
              <div className="mt-5">
                <label className="text-xs font-semibold text-slate-700">이메일</label>
                <input
                  value={trialEmail}
                  onChange={(e) => setTrialEmail(e.target.value)}
                  className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-slate-200"
                  placeholder="name@example.com"
                />
                <button
                  onClick={startTrial}
                  className="mt-4 w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800"
                  type="button"
                >
                  Pro 7일 체험 시작
                </button>
                <div className="mt-3 text-[11px] leading-4 text-slate-500">
                  * 이메일은 체험 활성화 확인용으로만 사용합니다.
                </div>
              </div>
            ) : (
              <div className="mt-5">
                <button
                  onClick={() => {
                    try {
                      localStorage.removeItem(TRIAL_EMAIL_KEY);
                      localStorage.removeItem(TRIAL_START_KEY);
                      localStorage.setItem(TRIAL_ACTIVE_KEY, "false");
                    } catch {}
                    setTrialEmail("");
                    setTrialStartMs(null);
                    setTrialActive(false);
                    setOutput("Pro 체험 상태를 초기화했어요. (데모용)");
                    setPaywallOpen(false);
                  }}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 hover:bg-slate-50"
                  type="button"
                >
                  (데모) Pro 초기화
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}