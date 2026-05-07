import { BUYER_FEE_BPS, PAYMENT_COST_BPS, SELLER_FEE_BPS } from "@/modules/marketplace/constants";

export type OrderQuote = {
  grossNgn: number;
  buyerFeeNgn: number;
  sellerFeeNgn: number;
  authenticationFeeNgn: number;
  paymentFeeNgn: number;
  shippingFeeNgn: number;
  payoutNgn: number;
  buyerTotalNgn: number;
};

function basisPoints(amount: number, bps: number) {
  return Math.round((amount * bps) / 10_000);
}

export function calculateAuthenticationFeeNgn(priceNgn: number) {
  if (priceNgn <= 100_000) return 0;
  if (priceNgn <= 500_000) return 1_500;
  if (priceNgn <= 2_000_000) return 3_000;
  return 5_000;
}

export function calculateOrderQuote(priceNgn: number, shippingFeeNgn = 0): OrderQuote {
  const buyerFeeNgn = basisPoints(priceNgn, BUYER_FEE_BPS);
  const sellerFeeNgn = basisPoints(priceNgn, SELLER_FEE_BPS);
  const authenticationFeeNgn = calculateAuthenticationFeeNgn(priceNgn);
  const buyerTotalBeforeProcessorCost = priceNgn + buyerFeeNgn + shippingFeeNgn;
  const paymentFeeNgn = basisPoints(buyerTotalBeforeProcessorCost, PAYMENT_COST_BPS);
  const payoutNgn = priceNgn - sellerFeeNgn - authenticationFeeNgn;

  return {
    grossNgn: priceNgn,
    buyerFeeNgn,
    sellerFeeNgn,
    authenticationFeeNgn,
    paymentFeeNgn,
    shippingFeeNgn,
    payoutNgn,
    buyerTotalNgn: buyerTotalBeforeProcessorCost,
  };
}

export function calculateBarterTopUpNgn(targetValueNgn: number, offeredValueNgn: number) {
  const delta = Math.abs(targetValueNgn - offeredValueNgn);
  return delta > 10_000 ? delta : 0;
}
