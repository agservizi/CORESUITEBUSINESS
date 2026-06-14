import { NextResponse } from "next/server";
import { withApi } from "@/lib/api-handler";
import {
  listClientBalances,
  listLoyaltyRewards,
  createLoyaltyReward,
  addLoyaltyMovement,
  redeemLoyaltyReward,
  getClientLoyaltyBalance,
} from "@/lib/platform/fedelta-service";

export const GET = withApi(
  async (request) => {
    const view = new URL(request.url).searchParams.get("view") || "balances";

    if (view === "rewards") {
      return NextResponse.json({ rewards: await listLoyaltyRewards(false) });
    }
    if (view === "balance") {
      const clientId = new URL(request.url).searchParams.get("clientId");
      if (!clientId) return NextResponse.json({ error: "clientId richiesto" }, { status: 400 });
      return NextResponse.json({ balance: await getClientLoyaltyBalance(clientId) });
    }
    return NextResponse.json({ balances: await listClientBalances() });
  },
  { requireCsrf: false, serviceSlug: "fedelta" }
);

export const POST = withApi(
  async (request, { user }) => {
    const body = await request.json();

    if (body.action === "createReward") {
      const reward = await createLoyaltyReward(body);
      return NextResponse.json({ reward }, { status: 201 });
    }

    if (body.action === "redeem") {
      const movement = await redeemLoyaltyReward(String(body.clientId), String(body.rewardId), {
        id: user.id,
        name: user.name,
        email: user.email,
      });
      return NextResponse.json({ movement });
    }

    const movement = await addLoyaltyMovement(
      {
        clientId: String(body.clientId),
        points: Number(body.points),
        movementType: String(body.movementType || "accredito"),
        description: body.description ? String(body.description) : undefined,
        reason: body.reason ? String(body.reason) : undefined,
        notes: body.notes ? String(body.notes) : undefined,
      },
      { id: user.id, name: user.name, email: user.email }
    );
    return NextResponse.json({ movement }, { status: 201 });
  },
  { serviceSlug: "fedelta" }
);
