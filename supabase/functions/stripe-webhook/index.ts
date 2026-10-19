/*
 * Stripe webhook: the only place a payment is treated as done.
 *
 * Events handled:
 *   checkout.session.completed / async_payment_succeeded
 *       course   -> purchase "paid" and the buyer is enrolled
 *       tutoring -> booking "confirmed" and a private session is scheduled
 *       event    -> ticket "paid" and the buyer is registered for the workshop
 *   checkout.session.expired / async_payment_failed
 *       the pending purchase/booking is marked "expired"
 *   charge.refunded -> purchase "refunded" / booking "cancelled"
 *
 * Stripe signs every request; anything without a valid signature is
 * rejected. Deploy this function with JWT verification turned off.
 */
import Stripe from "stripe";
import { adminClient, getStripe, json } from "../_shared/stripe.ts";

type Db = ReturnType<typeof adminClient>;

async function notify(db: Db, userId: string, type: string, title: string, body: string, data: Record<string, unknown>) {
  await db.from("notifications").insert({ user_id: userId, type, title, body, data });
}

async function completeCourse(db: Db, purchaseId: string, paymentIntent: string | null) {
  const { data: purchase } = await db
    .from("course_purchases")
    .update({ status: "paid", paid_at: new Date().toISOString(), stripe_payment_intent_id: paymentIntent })
    .eq("id", purchaseId)
    .neq("status", "paid")
    .select("*, course:courses(title)")
    .maybeSingle();

  // Already handled (Stripe can send the same event twice).
  if (!purchase) return;

  const { error } = await db
    .from("enrollments")
    .insert({ user_id: purchase.buyer_id, course_id: purchase.course_id });

  if (error && error.code !== "23505") throw error;

  if (purchase.coupon_id) {
    await db.rpc("redeem_coupon", { p_coupon_id: purchase.coupon_id });
  }

  await notify(db, purchase.seller_id, "course_sale", "New sale",
    `Someone bought ${purchase.course?.title || "your course"}.`, { course_id: purchase.course_id });

  await notify(db, purchase.buyer_id, "course_purchase", "You're enrolled",
    `${purchase.course?.title || "Your course"} is unlocked. Happy learning!`, { course_id: purchase.course_id });
}

async function completeBooking(db: Db, bookingId: string, paymentIntent: string | null) {
  const { data: booking } = await db
    .from("tutoring_bookings")
    .update({ status: "confirmed", paid_at: new Date().toISOString(), stripe_payment_intent_id: paymentIntent })
    .eq("id", bookingId)
    .eq("status", "pending_payment")
    .select("*, offer:tutoring_offers(title), student:profiles!tutoring_bookings_student_id_fkey(full_name)")
    .maybeSingle();

  if (!booking) return;

  const startsAt = new Date(booking.starts_at);
  const endsAt = new Date(startsAt.getTime() + booking.duration_minutes * 60 * 1000);

  // A private event gives the session a live room only these two can join.
  const { data: event, error } = await db
    .from("events")
    .insert({
      title: `Private session: ${booking.offer?.title || "1-to-1"}`,
      description: booking.note || null,
      starts_at: startsAt.toISOString(),
      ends_at: endsAt.toISOString(),
      event_type: "live_class",
      status: "scheduled",
      capacity: 2,
      host_id: booking.teacher_id,
      is_private: true,
    })
    .select("id")
    .single();

  if (error) throw error;

  await db.from("event_registrations").insert({ event_id: event.id, user_id: booking.student_id });
  await db.from("tutoring_bookings").update({ event_id: event.id }).eq("id", booking.id);

  const when = startsAt.toUTCString();

  await notify(db, booking.teacher_id, "tutoring_booked", "New private session booked",
    `${booking.student?.full_name || "A student"} booked ${booking.offer?.title || "a session"} for ${when}.`,
    { booking_id: booking.id, event_id: event.id });

  await notify(db, booking.student_id, "tutoring_confirmed", "Session confirmed",
    `Your private session is booked for ${when}. Join it from Live when the teacher starts.`,
    { booking_id: booking.id, event_id: event.id });
}

async function completeTicket(db: Db, ticketId: string, paymentIntent: string | null) {
  const { data: ticket } = await db
    .from("event_ticket_purchases")
    .update({ status: "paid", paid_at: new Date().toISOString(), stripe_payment_intent_id: paymentIntent })
    .eq("id", ticketId)
    .eq("status", "pending")
    .select("*, event:events(title,starts_at)")
    .maybeSingle();

  if (!ticket) return;

  // Registered seats are what let the buyer into the live room.
  const { error } = await db
    .from("event_registrations")
    .insert({ event_id: ticket.event_id, user_id: ticket.buyer_id });

  if (error && error.code !== "23505") throw error;

  const title = ticket.event?.title || "your workshop";

  await notify(db, ticket.seller_id, "ticket_sale", "New ticket sold",
    `Someone bought a ticket for ${title}.`, { event_id: ticket.event_id });

  await notify(db, ticket.buyer_id, "ticket_purchase", "You're in!",
    `Your ticket for ${title} is confirmed. Join from Live when the host starts.`, { event_id: ticket.event_id });
}

async function expire(db: Db, session: Stripe.Checkout.Session) {
  const { kind, purchase_id, booking_id, ticket_id } = session.metadata || {};

  if (kind === "course" && purchase_id) {
    await db.from("course_purchases").update({ status: "expired" }).eq("id", purchase_id).eq("status", "pending");
  } else if (kind === "tutoring" && booking_id) {
    await db.from("tutoring_bookings").update({ status: "expired" }).eq("id", booking_id).eq("status", "pending_payment");
  } else if (kind === "event" && ticket_id) {
    await db.from("event_ticket_purchases").update({ status: "expired" }).eq("id", ticket_id).eq("status", "pending");
  }
}

async function refund(db: Db, charge: Stripe.Charge) {
  const paymentIntent = typeof charge.payment_intent === "string" ? charge.payment_intent : charge.payment_intent?.id;
  if (!paymentIntent || !charge.refunded) return;

  await db.from("course_purchases").update({ status: "refunded" }).eq("stripe_payment_intent_id", paymentIntent);
  await db.from("tutoring_bookings").update({ status: "cancelled" }).eq("stripe_payment_intent_id", paymentIntent);

  // A refunded ticket gives up its seat.
  const { data: tickets } = await db
    .from("event_ticket_purchases")
    .update({ status: "refunded" })
    .eq("stripe_payment_intent_id", paymentIntent)
    .select("event_id,buyer_id");

  for (const t of tickets || []) {
    await db.from("event_registrations").delete().eq("event_id", t.event_id).eq("user_id", t.buyer_id);
  }
}

Deno.serve(async (req) => {
  const signature = req.headers.get("Stripe-Signature");
  const secret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

  if (!signature || !secret) {
    return json({ error: "Missing signature" }, 400);
  }

  const stripe = getStripe();
  const payload = await req.text();

  let event: Stripe.Event;

  try {
    event = await stripe.webhooks.constructEventAsync(
      payload,
      signature,
      secret,
      undefined,
      Stripe.createSubtleCryptoProvider(),
    );
  } catch (error) {
    console.error("Invalid Stripe signature:", error);
    return json({ error: "Invalid signature" }, 400);
  }

  const db = adminClient();

  try {
    switch (event.type) {
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded": {
        const session = event.data.object as Stripe.Checkout.Session;

        // Bank payments can complete later; wait for async_payment_succeeded.
        if (session.payment_status !== "paid") break;

        const paymentIntent = typeof session.payment_intent === "string" ? session.payment_intent : null;
        const { kind, purchase_id, booking_id, ticket_id } = session.metadata || {};

        if (kind === "course" && purchase_id) await completeCourse(db, purchase_id, paymentIntent);
        if (kind === "tutoring" && booking_id) await completeBooking(db, booking_id, paymentIntent);
        if (kind === "event" && ticket_id) await completeTicket(db, ticket_id, paymentIntent);
        break;
      }

      case "checkout.session.expired":
      case "checkout.session.async_payment_failed":
        await expire(db, event.data.object as Stripe.Checkout.Session);
        break;

      case "charge.refunded":
        await refund(db, event.data.object as Stripe.Charge);
        break;
    }

    return json({ received: true });
  } catch (error) {
    // A 500 makes Stripe retry the event later.
    console.error(`stripe-webhook ${event.type} error:`, error);
    return json({ error: "Webhook handling failed" }, 500);
  }
});
