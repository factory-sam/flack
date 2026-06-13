import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requestLogger } from "@/lib/logger";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const inviteToken = requestUrl.searchParams.get("invite_token");
  const log = requestLogger("auth.callback", { hasCode: Boolean(code), hasInvite: Boolean(inviteToken) });

  if (code) {
    const supabase = await createSupabaseServerClient();
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
    if (exchangeError) {
      log.error({ err: exchangeError }, "failed to exchange auth code for session");
    } else if (inviteToken) {
      const { error: inviteError } = await supabase.rpc("accept_invite", { invite_token: inviteToken });
      if (inviteError) {
        log.warn({ err: inviteError }, "failed to accept invite during auth callback");
      } else {
        log.info("invite accepted during auth callback");
      }
    }
  }

  return NextResponse.redirect(new URL("/", request.url));
}
