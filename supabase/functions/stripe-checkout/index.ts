/*
 * Start a Stripe Checkout payment.
 *
 * Body:
 *   { kind: "course", courseId, couponCode?, returnOrigin }
 *   { kind: "tutoring", offerId, startsAt, note, returnOrigin }
 *
 * Prices always come from the database, never from the request. A pending
 * purchase/booking row is stored first; stripe-webhook completes it.
 * Returns { url } to send the learner to Stripe.
 */
import {
  adminClient,
  corsHeaders,
  getCaller,
  getStripe,
  json,
  platformFee,
  siteUrl,
} from "../_shared/stripe.ts";

const HOUR = 60 * 60 * 1000;

async function payoutAccount(db: ReturnType<typeof adminClient>, userId: string) {
  const { data } = await db
    .from("creator_payout_accounts")
    .select("stripe_account_id,charges_enabled")
    .eq("user_id", userId)
    .maybeSingle();

  return data?.charges_enabled ? data.stripe_account_id : null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const user = await getCaller(req);
    if (!user) return json({ error: "Please log in to buy." }, 401);

    const body = await req.json().catch(() => ({}));
    const origin = siteUrl(body.returnOrigin);
    const db = adminClient();
    const stripe = getStripe();

    if (body.kind === "course") {
      const { data: course } = await db
        .from("courses")
        .select("id,title,teacher_id,price_cents,currency,is_published")
        .eq("id", body.courseId)
        .maybeSingle();

      if (!course || !course.is_published) return json({ error: "Course not found." }, 404);
      if (!(course.price_cents > 0)) return json({ error: "This course is free." }, 400);
      if (course.teacher_id === user.id) return json({ error: "You created this course." }, 400);

      const { data: paid } = await db
        .from("course_purchases")
        .select("id")
        .eq("buyer_id", user.id)
        .eq("course_id", course.id)
        .eq("status", "paid")
        .maybeSingle();

      if (paid) return json({ error: "You already own this course." }, 400);

      let coupon: { id: string; percent_off: number } | null = null;

      if (typeof body.couponCode === "string" && body.couponCode.trim()) {
        const { data } = await db.rpc("find_coupon", {
          p_code: body.couponCode,
          p_course_id: course.id,
        });

        if (!data?.id) return json({ error: "This discount code is not valid for this course." }, 400);
        coupon = data;
      }

      const discount = coupon ? Math.round((course.price_cents * coupon.percent_off) / 100) : 0;
      let amount = course.price_cents - discount;

      // A 100% code: no payment needed, enroll straight away.
      if (amount <= 0) {
        const { error } = await db.from("course_purchases").insert({
          course_id: course.id,
          buyer_id: user.id,
          seller_id: course.teacher_id,
          amount_cents: 0,
          platform_fee_cents: 0,
          currency: course.currency,
          status: "paid",
          paid_at: new Date().toISOString(),
          coupon_id: coupon!.id,
          discount_cents: course.price_cents,
        });

        if (error) throw error;

        const { error: enrollError } = await db
          .from("enrollments")
          .insert({ user_id: user.id, course_id: course.id });

        if (enrollError && enrollError.code !== "23505") throw enrollError;

        await db.rpc("redeem_coupon", { p_coupon_id: coupon!.id });
        return json({ free: true });
      }

      // Stripe's minimum charge for euros is €0.50.
      amount = Math.max(amount, 50);

      const destination = await payoutAccount(db, course.teacher_id);
      if (!destination) return json({ error: "This course cannot be bought right now. The creator has not finished setting up payments." }, 409);

      const fee = platformFee(amount);

      const { data: purchase, error } = await db
        .from("course_purchases")
        .insert({
          course_id: course.id,
          buyer_id: user.id,
          seller_id: course.teacher_id,
          amount_cents: amount,
          platform_fee_cents: fee,
          currency: course.currency,
          coupon_id: coupon?.id ?? null,
          discount_cents: course.price_cents - amount,
        })
        .select("id")
        .single();

      if (error) throw error;

      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        customer_email: user.email,
        line_items: [{
          quantity: 1,
          price_data: {
            currency: course.currency,
            unit_amount: amount,
            product_data: {
              name: course.title,
              description: coupon ? `Discount ${coupon.percent_off}% applied` : undefined,
            },
          },
        }],
        payment_intent_data: {
          application_fee_amount: fee,
          transfer_data: { destination },
          metadata: { kind: "course", purchase_id: purchase.id },
        },
        metadata: { kind: "course", purchase_id: purchase.id },
        success_url: `${origin}/course/${course.id}?paid=1`,
        cancel_url: `${origin}/course/${course.id}`,
      });

      await db
        .from("course_purchases")
        .update({ stripe_checkout_session_id: session.id })
        .eq("id", purchase.id);

      return json({ url: session.url });
    }

    if (body.kind === "tutoring") {
      const { data: offer } = await db
        .from("tutoring_offers")
        .select("*")
        .eq("id", body.offerId)
        .maybeSingle();

      if (!offer || !offer.is_active) return json({ error: "This offer is no longer available." }, 404);
      if (offer.teacher_id === user.id) return json({ error: "This is your own offer." }, 400);

      const startsAt = new Date(String(body.startsAt));
      const now = Date.now();

      if (isNaN(startsAt.getTime()) || startsAt.getTime() < now + HOUR || startsAt.getTime() > now + 90 * 24 * HOUR) {
        return json({ error: "Choose a time at least 1 hour from now and within 90 days." }, 400);
      }

      const endsAt = new Date(startsAt.getTime() + offer.duration_minutes * 60 * 1000);

      // The teacher cannot be booked twice for the same time.
      const { data: clashes } = await db
        .from("tutoring_bookings")
        .select("starts_at,duration_minutes")
        .eq("teacher_id", offer.teacher_id)
        .eq("status", "confirmed")
        .lt("starts_at", endsAt.toISOString())
        .gt("starts_at", new Date(startsAt.getTime() - 4 * HOUR).toISOString());

      const overlaps = (clashes || []).some((b) => {
        const start = new Date(b.starts_at).getTime();
        return start < endsAt.getTime() && start + b.duration_minutes * 60 * 1000 > startsAt.getTime();
      });

      if (overlaps) return json({ error: "The teacher is already booked at that time. Pick another time." }, 409);

      const destination = await payoutAccount(db, offer.teacher_id);
      if (!destination) return json({ error: "This teacher cannot take bookings right now." }, 409);

      const fee = platformFee(offer.price_cents);
      const note = typeof body.note === "string" ? body.note.trim().slice(0, 1000) : null;

      const { data: booking, error } = await db
        .from("tutoring_bookings")
        .insert({
          offer_id: offer.id,
          teacher_id: offer.teacher_id,
          student_id: user.id,
          starts_at: startsAt.toISOString(),
          duration_minutes: offer.duration_minutes,
          note: note || null,
          amount_cents: offer.price_cents,
          platform_fee_cents: fee,
          currency: offer.currency,
        })
        .select("id")
        .single();

      if (error) throw error;

      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        customer_email: user.email,
        line_items: [{
          quantity: 1,
          price_data: {
            currency: offer.currency,
            unit_amount: offer.price_cents,
            product_data: {
              name: `Private session: ${offer.title}`,
              description: `${offer.duration_minutes} minutes`,
            },
          },
        }],
        payment_intent_data: {
          application_fee_amount: fee,
          transfer_data: { destination },
          metadata: { kind: "tutoring", booking_id: booking.id },
        },
        metadata: { kind: "tutoring", booking_id: booking.id },
        success_url: `${origin}/bookings?paid=1`,
        cancel_url: `${origin}/tutoring/${offer.id}`,
      });

      await db
        .from("tutoring_bookings")
        .update({ stripe_checkout_session_id: session.id })
        .eq("id", booking.id);

      return json({ url: session.url });
    }

    return json({ error: "Unknown purchase type." }, 400);
  } catch (error) {
    console.error("stripe-checkout error:", error);
    return json({ error: error instanceof Error ? error.message : "Something went wrong" }, 500);
  }
});
