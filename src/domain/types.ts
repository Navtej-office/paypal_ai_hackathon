import type { DealStatus } from "./deal";

export type Invoice = {
  paypalId: string;
  sentAt: Date;
  dueAt: Date;
  paidAt?: Date;
};

export type Deal = {
  id: string;
  brandName: string;
  status: DealStatus;
  amountCents: number;
  liveAt?: Date;
  invoice?: Invoice;
};