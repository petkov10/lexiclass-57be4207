// Server-only: единна точка за всички AI заявки.
// Позволява администраторът да ползва вградения AI (Lovable) или собствен
// ключ за Google Gemini / OpenAI, зададен в Настройки → AI.

export type AiProvider = "lovable" | "gemini" | "openai";

type ChatPayload = {
  model?: string;
  messages: unknown[];
  response_format?: unknown;
  temperature?: number;
};

type ProviderConfig = {
  provider: AiProvider;
  url: string;
  key: string;
  model: string;
};

const LOVABLE_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";
const OPENAI_URL = "https://api.openai.com/v1/chat/completions";

const DEFAULTS: Record<AiProvider, string> = {
  lovable: "google/gemini-3.7-flash",
  gemini: "gemini-2.5-flash",
  openai: "gpt-4o-mini",
};

let cache: { at: number; value: { provider: AiProvider; model: string | null; api_key: string | null } } | null = null;

async function loadSettings() {
  if (cache && Date.now() - cache.at < 30_000) return cache.value;
  let value = { provider: "lovable" as AiProvider, model: null as string | null, api_key: null as string | null };
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("ai_settings")
      .select("provider, model, api_key")
      .eq("id", 1)
      .maybeSingle();
    if (data) {
      value = {
        provider: (data.provider as AiProvider) ?? "lovable",
        model: data.model ?? null,
        api_key: data.api_key ?? null,
      };
    }
  } catch {
    /* пада обратно към вградения AI */
  }
  cache = { at: Date.now(), value };
  return value;
}

function lovableConfig(model?: string): ProviderConfig | null {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) return null;
  return { provider: "lovable", url: LOVABLE_URL, key, model: model || DEFAULTS.lovable };
}

async function resolve(model?: string): Promise<{ primary: ProviderConfig | null; fallback: ProviderConfig | null }> {
  const s = await loadSettings();
  const fallback = lovableConfig(model);
  if (s.provider === "lovable" || !s.api_key) return { primary: fallback, fallback: null };
  const primary: ProviderConfig = {
    provider: s.provider,
    url: s.provider === "gemini" ? GEMINI_URL : OPENAI_URL,
    key: s.api_key,
    model: s.model || DEFAULTS[s.provider],
  };
  return { primary, fallback };
}

async function post(cfg: ProviderConfig, payload: ChatPayload): Promise<Response> {
  const body: Record<string, unknown> = { ...payload, model: cfg.model };
  // Gemini's OpenAI-съвместим слой не приема всички полета.
  if (cfg.provider === "gemini" && payload.response_format) {
    body.response_format = { type: "json_object" };
  }
  return fetch(cfg.url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${cfg.key}` },
    body: JSON.stringify(body),
  });
}

/**
 * Изпраща chat заявка към избрания доставчик. При грешка от собствен ключ
 * автоматично опитва отново през вградения AI, за да не спира работата.
 */
export async function aiChat(payload: ChatPayload): Promise<Response> {
  const { primary, fallback } = await resolve(payload.model);
  if (!primary) {
    return new Response("Няма конфигуриран AI доставчик. Добавете ключ в Настройки → AI.", { status: 500 });
  }
  try {
    const res = await post(primary, payload);
    if (res.ok || !fallback || primary.provider === "lovable") return res;
    // Собственият ключ е отказал (лимит, невалиден ключ) → вграден AI.
    return await post(fallback, payload);
  } catch (e) {
    if (fallback && primary.provider !== "lovable") return post(fallback, payload);
    throw e;
  }
}

/** Единен превод на HTTP грешките към разбираеми съобщения. */
export function aiErrorResponse(status: number, text: string): Response {
  if (status === 429) return new Response("Прекалено много заявки към AI. Опитайте след минута.", { status: 429 });
  if (status === 402) return new Response("Изчерпан AI кредит. Добавете кредити или собствен ключ в Настройки → AI.", { status: 402 });
  if (status === 401 || status === 403)
    return new Response("Невалиден AI ключ. Проверете настройките за AI.", { status: 401 });
  return new Response(text || "Грешка при AI заявката.", { status: status || 500 });
}
