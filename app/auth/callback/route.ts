import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        await supabase.from("profiles").upsert(
          {
            user_id: user.id,
            display_name:
              user.user_metadata?.display_name || user.email?.split("@")[0],
          },
          { onConflict: "user_id" },
        );
      }
    }
  }

  return NextResponse.redirect(new URL(next, requestUrl.origin));
}
