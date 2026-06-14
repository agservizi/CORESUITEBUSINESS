import { NextRequest, NextResponse } from "next/server";
import { withApi } from "@/lib/api-handler";
import { getClientIdForUser } from "@/lib/api-handler";
import { prisma } from "@/lib/prisma";
import { createCheckoutSession, isStripeConfigured } from "@/lib/stripe";

export async function POST(request: NextRequest) {
  return withApi(async (req, { user }) => {
    if (!isStripeConfigured()) {
      return NextResponse.json(
        { error: "Pagamenti non configurati. Imposta STRIPE_SECRET_KEY." },
        { status: 503 }
      );
    }

    const body = await req.json();
    const amountCents = Math.round(Number(body.amount || 0) * 100);
    if (amountCents < 50) {
      return NextResponse.json({ error: "Importo minimo €0,50" }, { status: 400 });
    }

    const clientId = await getClientIdForUser(user);
    const description = String(body.description || "Pagamento servizi AG");

    const payment = await prisma.payment.create({
      data: {
        clientId: clientId || undefined,
        amount: amountCents / 100,
        description,
        status: "PENDING",
      },
    });

    const origin = req.headers.get("origin") || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const session = await createCheckoutSession({
      amountCents,
      description,
      clientEmail: user.email,
      metadata: { paymentId: payment.id, userId: user.id },
      successUrl: `${origin}/portale?payment=success`,
      cancelUrl: `${origin}/portale?payment=cancelled`,
    });

    await prisma.payment.update({
      where: { id: payment.id },
      data: { stripeSessionId: session.id },
    });

    return NextResponse.json({ url: session.url, sessionId: session.id });
  })(request);
}
