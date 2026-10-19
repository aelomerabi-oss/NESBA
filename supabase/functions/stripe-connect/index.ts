/*
 * Connect a teacher or organisation to Stripe so they can be paid.
 *
 * Body: { action, returnOrigin }
 *   action "onboard"   -> create the Express account if needed and return
 *                         a Stripe onboarding link ({ url })
 *   action "status"    -> refresh and return the account's status
 *   action "dashboard" -> return a link to the creator's Stripe dashboard
 */
import {
  adminClient,
  corsHeaders,
  getCaller,
  getStripe,
  json,
  siteUrl,
} from "../_shared/stripe.ts";

const CREATOR_ROLES = ["teacher", "mentor", "organization", "admin"];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const user = await getCaller(req);
    if (!user) return json({ error: "Please log in." }, 401);

    const body = await req.json().catch(() => ({}));
    const action = body.action;
    const origin = siteUrl(body.returnOrigin);

    const db = adminClient();
    const stripe = getStripe();

    const { data: profile } = await db
      .from("profiles")
      .select("role,email,full_name")
      .eq("id", user.id)
      .single();

    if (!profile || !CREATOR_ROLES.includes(profile.role)) {
      return json({ error: "Only approved teachers and organisations can receive payments." }, 403);
    }

    let { data: account } = await db
      .from("creator_payout_accounts")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (action === "onboard") {
      if (!account) {
        const created = await stripe.accounts.create({
          type: "express",
          country: "NL",
          email: profile.email || user.email || undefined,
          capabilities: {
            card_payments: { requested: true },
            transfers: { requested: true },
          },
          business_profile: { product_description: "Courses and private teaching on NESBA" },
          metadata: { nesba_user_id: user.id },
        });

        const { data: inserted, error } = await db
          .from("creator_payout_accounts")
          .insert({ user_id: user.id, stripe_account_id: created.id })
          .select("*")
          .single();

        if (error) throw error;
        account = inserted;
      }

      const link = await stripe.accountLinks.create({
        account: account.stripe_account_id,
        type: "account_onboarding",
        refresh_url: `${origin}/creator/payouts?refresh=1`,
        return_url: `${origin}/creator/payouts?done=1`,
      });

      return json({ url: link.url });
    }

    if (!account) {
      return json({ connected: false, chargesEnabled: false, payoutsEnabled: false, detailsSubmitted: false });
    }

    if (action === "dashboard") {
      const link = await stripe.accounts.createLoginLink(account.stripe_account_id);
      return json({ url: link.url });
    }

    // "status": ask Stripe, store, and return.
    const remote = await stripe.accounts.retrieve(account.stripe_account_id);

    const status = {
      charges_enabled: !!remote.charges_enabled,
      payouts_enabled: !!remote.payouts_enabled,
      details_submitted: !!remote.details_submitted,
      updated_at: new Date().toISOString(),
    };

    await db.from("creator_payout_accounts").update(status).eq("user_id", user.id);

    return json({
      connected: true,
      chargesEnabled: status.charges_enabled,
      payoutsEnabled: status.payouts_enabled,
      detailsSubmitted: status.details_submitted,
    });
  } catch (error) {
    console.error("stripe-connect error:", error);
    return json({ error: error instanceof Error ? error.message : "Something went wrong" }, 500);
  }
});
