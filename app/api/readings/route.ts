import { createWebReading } from "@/lib/tarot-reading";

const WINDOW_MS = 10 * 60 * 1000;
const MAX_READINGS_PER_WINDOW = 8;
const visitors = new Map<string, { count: number; resetAt: number }>();

function clientAddress(request: Request) {
  return request.headers.get("cf-connecting-ip")
    || request.headers.get("x-real-ip")
    || request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || "unknown";
}

function rateLimit(request: Request) {
  const now = Date.now();
  const address = clientAddress(request);
  const current = visitors.get(address);
  if (!current || current.resetAt <= now) {
    visitors.set(address, { count: 1, resetAt: now + WINDOW_MS });
    return null;
  }
  if (current.count >= MAX_READINGS_PER_WINDOW) {
    return Math.max(1, Math.ceil((current.resetAt - now) / 1000));
  }
  current.count += 1;
  if (visitors.size > 2_000) {
    for (const [key, value] of visitors) {
      if (value.resetAt <= now) visitors.delete(key);
    }
  }
  return null;
}

export async function POST(request: Request) {
  try {
    const retryAfter = rateLimit(request);
    if (retryAfter) {
      return Response.json(
        { error: "你刚刚已经完成了多次解读，请稍后再回来。" },
        { status: 429, headers: { "Cache-Control": "no-store", "Retry-After": String(retryAfter) } },
      );
    }
    const input = await request.json() as { question?: unknown; choices?: unknown; draw_token?: unknown };
    return Response.json(await createWebReading(input.question, input.choices, input.draw_token), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "解读暂时没有完成。";
    const status = message.includes("密钥") ? 503 : message.includes("DeepSeek") ? 502 : 400;
    return Response.json({ error: message }, { status, headers: { "Cache-Control": "no-store" } });
  }
}
