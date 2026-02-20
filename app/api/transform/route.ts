import { NextResponse } from "next/server";
import OpenAI from "openai";

export const runtime = "nodejs";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

type Mode = "easy" | "summary" | "checklist";

function makePrompt(mode: Mode, text: string) {
  if (mode === "easy") {
    return `
너는 한국어 문장을 쉽게 바꿔주는 도우미야. 대상은 ADHD/느린 학습자/인지적 어려움이 있는 사람이야.

규칙:
- 문장은 짧게.
- 어려운 단어는 쉬운 말로 바꾸고, 꼭 필요하면 (쉬운 설명)을 덧붙여.
- 핵심 정보는 빼지 마.
- 차분하고 친절한 톤.
- 결과는 한국어로만.

원문:
${text}
`.trim();
  }

  if (mode === "summary") {
    return `
다음 한국어 글을 아주 쉬운 말로 3문장으로 요약해줘.
- 핵심 행동/정보만
- 각 문장은 짧게
- 번호 없이 3줄로 출력

원문:
${text}
`.trim();
  }

  return `
다음 한국어 글을 실행 가능한 체크리스트로 바꿔줘.
- 각 항목은 한 줄
- 행동 동사로 시작
- 출력 형식은 "- [ ] 내용"

원문:
${text}
`.trim();
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const text = body?.text as string;
    const mode = body?.mode as Mode;

    if (!text || !mode) {
      return NextResponse.json({ error: "Missing text or mode" }, { status: 400 });
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [{ role: "user", content: makePrompt(mode, text) }],
      temperature: 0.3,
    });

    const output = completion.choices[0]?.message?.content ?? "";
    return NextResponse.json({ output });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Server error" }, { status: 500 });
  }
}