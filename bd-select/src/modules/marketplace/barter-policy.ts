import { BARTER_TOP_UP_THRESHOLD_NGN } from "@/modules/marketplace/constants";

export type BarterValuation = {
  targetValueNgn: number;
  offeredValueNgn: number;
  deltaNgn: number;
  topUpNgn: number;
  topUpPayerId: string | null;
};

export function calculateBarterValuation(
  targetValueNgn: number,
  offeredValueNgn: number,
  targetSellerId: string,
  initiatorId: string,
): BarterValuation {
  const delta = Math.abs(targetValueNgn - offeredValueNgn);
  const topUpNgn = delta > BARTER_TOP_UP_THRESHOLD_NGN ? delta : 0;
  const topUpPayerId =
    topUpNgn === 0 ? null : offeredValueNgn < targetValueNgn ? initiatorId : targetSellerId;

  return {
    targetValueNgn,
    offeredValueNgn,
    deltaNgn: delta,
    topUpNgn,
    topUpPayerId,
  };
}
