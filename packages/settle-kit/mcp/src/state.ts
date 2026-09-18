export type PayPhase = {
  step: "awaiting-approval";
  payId: string;
  url: string;
  amountAtomic: string;
  quoteNonce: string;
};
