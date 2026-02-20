"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function LoginPage() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [msg, setMsg] = useState<string>("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // 이미 로그인되어 있으면 홈으로
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) window.location.href = "/";
    });
  }, []);

  async function handleAuth() {
    setMsg("");
    setLoading(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;

        // 이메일 인증을 끄지 않은 상태라면 "메일 확인" 단계일 수 있음
        // 그래도 profiles는 미리 upsert 해둠(세션이 있으면 id 사용 가능)
        const userId = data.user?.id;
        if (userId) {
          await supabase.from("profiles").upsert({ id: userId, email, is_pro: false });
        }

        setMsg("✅ 회원가입 완료! (이메일 인증 설정에 따라 메일 확인이 필요할 수 있어요)");
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;

        // 로그인 시 profiles 없으면 생성
        const userId = data.user?.id;
        if (userId) {
          await supabase.from("profiles").upsert({ id: userId, email });
        }

        window.location.href = "/";
      }
    } catch (e: any) {
      setMsg(`오류: ${e?.message ?? "로그인 실패"}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-white text-slate-900">
      <div className="mx-auto max-w-md px-6 py-16">
        <div className="flex items-center gap-3">
          <img
            src="/ttobakttobak_logo_v1.png"
            alt="또박또박 로고"
            className="h-10 w-10 object-contain"
          />
          <div>
            <div className="text-lg font-semibold">또박또박</div>
            <div className="text-xs text-slate-500">읽기 편하게, 이해하기 쉽게.</div>
          </div>
        </div>

        <h1 className="mt-10 text-3xl font-semibold tracking-tight">
          {mode === "login" ? "로그인" : "회원가입"}
        </h1>
        <p className="mt-3 text-sm text-slate-500">
          {mode === "login" ? "계정으로 로그인하세요." : "새 계정을 만들어 시작하세요."}
        </p>

        <div className="mt-8 space-y-3">
          <input
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-slate-200"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
          <input
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-slate-200"
            placeholder="Password"
            value={password}
            type="password"
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={mode === "login" ? "current-password" : "new-password"}
          />

          <button
            onClick={handleAuth}
            disabled={loading}
            className="w-full rounded-full bg-slate-900 px-6 py-3 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
          >
            {loading ? "처리 중..." : mode === "login" ? "로그인" : "회원가입"}
          </button>

          <button
            onClick={() => setMode(mode === "login" ? "signup" : "login")}
            className="w-full rounded-full bg-slate-100 px-6 py-3 text-sm font-medium text-slate-700 hover:bg-slate-200"
          >
            {mode === "login" ? "계정이 없나요? 회원가입" : "이미 계정이 있나요? 로그인"}
          </button>

          {msg && (
            <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
              {msg}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}