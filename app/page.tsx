"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Mode = "easy" | "summary" | "checklist";

const FREE_LIMIT = 5;

function todayISO() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function Home() {
  const [text, setText] = useState("");
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);

  const [mode, setMode] = useState<Mode>("easy");

  // auth
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState<string>("");

  // plan & usage
  const [isPro, setIsPro] = useState(false);
  const [usageCount, setUsageCount] = useState(0);

  const remaining = useMemo(() => Math.max(0, FREE_LIMIT - usageCount), [usageCount]);

  const modeLabel: Record<Mode, string> = {
    easy: "쉬운 문장",
    summary: "3줄 요약",
    checklist: "체크리스트",
  };

  useEffect(() => {
    // 로그인 상태 확인
    supabase.auth.getSession().then(async ({ data }) => {
      const session = data.session;
      if (!session) {
        window.location.href = "/login";
        return;
      }
      setUserId(session.user.id);
      setEmail(session.user.email ?? "");

      await loadProfile(session.user.id, session.user.email ?? "");
      await loadTodayUsage(session.user.id);
    });

    // 세션 변경 감지
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) window.location.href = "/login";
    });

    return () => {
      sub.subscription.unsubscribe();
    };
  }, []);

  async function loadProfile(uid: string, mail: string) {
    // profiles 없으면 upsert
    await supabase.from("profiles").upsert({ id: uid, email: mail });

    const { data } = await supabase.from("profiles").select("is_pro").eq("id", uid).single();
    setIsPro(Boolean(data?.is_pro));
  }

  async function loadTodayUsage(uid: string) {
    const day = todayISO();
    // row 없으면 생성
    await supabase.from("usage_daily").upsert({ user_id: uid, day, count: 0 });

    const { data } = await supabase
      .from("usage_daily")
      .select("count")
      .eq("user_id", uid)
      .eq("day", day)
      .single();

    setUsageCount(Number(data?.count ?? 0));
  }

  async function incrementUsage(uid: string) {
    const day = todayISO();
    const next = usageCount + 1;

    const { error } = await supabase
      .from("usage_daily")
      .update({ count: next })
      .eq("user_id", uid)
      .eq("day", day);

    if (!error) setUsageCount(next);
  }

  async function run() {
    if (!text.trim()) return;
    if (!userId) return;

    if (!isPro && usageCount >= FREE_LIMIT) {
      setOutput("무료 사용 횟수를 모두 사용했어요. Pro로 업그레이드하면 무제한으로 사용할 수 있어요.");
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

      if (!isPro) await incrementUsage(userId);
      setOutput(data.output);
    } catch (e: any) {
      setOutput(`오류: ${e?.message || "요청 실패"}`);
    } finally {
      setLoading(false);
    }
  }

  async function logout() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  // 데모용: Pro 토글(실결제 붙이기 전 해커톤 시연용)
  async function enableProDemo() {
    if (!userId) return;
    const { error } = await supabase.from("profiles").update({ is_pro: true }).eq("id", userId);
    if (!error) setIsPro(true);
  }

  async function disableProDemo() {
    if (!userId) return;
    const { error } = await supabase.from("profiles").update({ is_pro: false }).eq("id", userId);
    if (!error) setIsPro(false);
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

  return (
    <main className="min-h-screen bg-white text-slate-900">
      <div className="mx-auto max-w-3xl px-6 py-16">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img src="/ttobakttobak_logo_v1.png" alt="또박또박 로고" className="h-10 w-10 object-contain" />
            <div>
              <div className="text-lg font-semibold tracking-tight">또박또박</div>
              <div className="text-xs text-slate-500">읽기 편하게, 이해하기 쉽게.</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden text-xs text-slate-500 sm:block">{email}</div>
            <div className="text-xs text-slate-500">
              {isPro ? "PRO" : `Free ${remaining}/${FREE_LIMIT}`}
            </div>

            {!isPro ? (
              <button
                onClick={enableProDemo}
                className="rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800"
                type="button"
              >
                Pro 업그레이드
              </button>
            ) : (
              <button
                onClick={disableProDemo}
                className="rounded-full bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200"
                type="button"
              >
                Pro 해제(데모)
              </button>
            )}

            <button
              onClick={logout}
              className="rounded-full bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200"
              type="button"
            >
              로그아웃
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
    </main>
  );
}