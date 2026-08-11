import { createClient } from "@supabase/supabase-js";

export function createSupabaseServerClient() {
  const url = process.env.SUPABASE_URL;
  const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;

  if (!url || !publishableKey) {
    throw new Error(
      "Supabase 환경변수(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY)가 설정되지 않았습니다. .env.local을 확인해 주세요."
    );
  }

  return createClient(url, publishableKey, {
    auth: { persistSession: false },
  });
}
