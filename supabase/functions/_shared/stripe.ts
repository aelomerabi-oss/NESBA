import Stripe from "stripe";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// NESBA keeps 20% of every sale; the rest goes to the creator.
export const PLATFORM_FEE_PERCENT = 20;

export function platformFee(amountCents: number) {
  return Math.round((amountCents * PLATFORM_FEE_PERCENT) / 100);
}

export function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

export function getStripe() {
  const key = Deno.env.get("STRIPE_SECRET_KEY");
  if (!key) {
    throw new Error("Payments are not set up yet (STRIPE_SECRET_KEY is missing)");
  }
  return new Stripe(key, { httpClient: Stripe.createFetchHttpClient() });
}

// Service-role client: bypasses row level security, so only use it after
// checking who the caller is.
export function adminClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );
}

// The signed-in user making the request, or null.
export async function getCaller(req: Request) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return null;

  const client = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );

  const { data: { user } } = await client.auth.getUser();
  return user ?? null;
}

// Where Stripe sends people back to. Only our own site is allowed, so a
// checkout link cannot redirect somewhere else.
export function siteUrl(requested?: unknown) {
  const configured = (Deno.env.get("SITE_URL") || "").replace(/\/$/, "");
  const allowed = [configured, "http://localhost:8081"].filter(Boolean);

  if (typeof requested === "string") {
    const origin = requested.replace(/\/$/, "");
    if (allowed.includes(origin)) return origin;
  }

  return configured || "http://localhost:8081";
}
