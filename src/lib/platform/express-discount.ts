export interface CampaignDiscountInput {
  type: string;
  value: number | string | unknown;
}

export function computeCampaignDiscount(subtotal: number, campaign: CampaignDiscountInput) {
  const value = Number(campaign.value);
  if (campaign.type.toLowerCase() === "percent") {
    return Math.min(subtotal, (subtotal * value) / 100);
  }
  return Math.min(subtotal, value);
}
