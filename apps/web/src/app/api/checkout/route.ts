import { NextRequest, NextResponse } from "next/server";
import { getStripe, PLANS, PlanId } from "@/lib/stripe";

export async function POST(request: NextRequest) {
  try {
    const { planId } = await request.json();

    if (!planId || !(planId in PLANS)) {
      return NextResponse.json(
        { error: "無効なプランです" },
        { status: 400 }
      );
    }

    const plan = PLANS[planId as PlanId];

    const session = await getStripe().checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "jpy",
            product_data: {
              name: `AI Builders Lab - ${plan.name}`,
              description: plan.description,
            },
            unit_amount: plan.price,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${request.nextUrl.origin}/apply/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${request.nextUrl.origin}/apply`,
      metadata: {
        planId,
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Checkout error:", error);
    return NextResponse.json(
      { error: "決済セッションの作成に失敗しました" },
      { status: 500 }
    );
  }
}
