import Stripe from "stripe";

let stripeInstance: Stripe | null = null;

export function getStripe(): Stripe {
  if (!stripeInstance) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error("STRIPE_SECRET_KEY is not configured");
    }
    stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2026-03-25.dahlia",
      typescript: true,
    });
  }
  return stripeInstance;
}

export const PLANS = {
  "video-only": {
    name: "動画のみ",
    price: 49800,
    description: "全講義動画アーカイブ閲覧",
  },
  "video-email": {
    name: "動画 + メールサポート",
    price: 98000,
    description: "動画閲覧 + 個別メール相談",
  },
  zoom: {
    name: "Zoom型（1期生）",
    price: 150000,
    description: "8週間×週1回2時間Zoom（録画あり）",
  },
} as const;

export type PlanId = keyof typeof PLANS;
