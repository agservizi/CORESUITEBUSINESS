import { NextResponse } from "next/server";
import { withApi } from "@/lib/api-handler";
import { createCheckoutSession, isStripeConfigured } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";

export const POST = withApi(
  async (request, { user }) => {
    if (!isStripeConfigured()) {
      return NextResponse.json({ error: "Stripe non configurato" }, { status: 503 });
    }

    const body = await request.json();
    const amountCents = Math.round(Number(body.amount) * 100);
    if (!amountCents || amountCents <= 0) {
      return NextResponse.json({ error: "Importo non valido" }, { status: 400 });
    }

    const origin = request.headers.get("origin") || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const clientId = body.clientId ? String(body.clientId) : undefined;

    const payment = await prisma.payment.create({
      data: {
        amount: Number(body.amount),
        description: body.description ? String(body.description) : "Pagamento Coresuite",
        clientId,
        status: "PENDING",
        metadata: body.metadata ?? {},
      },
    });

    const session = await createCheckoutSession({
      amountCents,
      description: payment.description || "Pagamento",
      clientEmail: body.clientEmail ? String(body.clientEmail) : user.email,
      metadata: {
        paymentId: payment.id,
        clientId: clientId || "",
        userId: user.id,
      },
      successUrl: `${origin}/payments/success?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${origin}/payments/cancel`,
    });

    await prisma.payment.update({
      where: { id: payment.id },
      data: { stripeSessionId: session.id },
    });

    return NextResponse.json({ sessionId: session.id, url: session.url });
  }
);
