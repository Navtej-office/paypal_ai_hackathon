import { z } from "zod";
import { toCents } from "../domain/money";

// PayPal only accepts these payment terms (see paypal/payload.ts).
export const SUPPORTED_TERM_DAYS = [0, 10, 15, 30, 45, 60, 90] as const;

export const DealSchema = z.object({
  brandName: z.string().trim().min(1),
  brandEmail: z.email(),
  deliverables: z
    .array(
      z.object({
        platform: z.enum(["youtube", "instagram", "x", "linkedin", "podcast", "other"]),
        type: z.string().trim().min(1), // e.g. "dedicated video", "reel", "story"
      }),
    )
    .min(1),
  amount: z.number().positive(),
  currency: z.literal("USD"),
  termDays: z
    .number()
    .int()
    .refine((d) => (SUPPORTED_TERM_DAYS as readonly number[]).includes(d), "Unsupported payment term")
    .default(30),
  deadline: z.iso.date().optional(), // YYYY-MM-DD
});

export type ExtractedDeal = Omit<z.infer<typeof DealSchema>, "amount"> & { amountCents: number };

export function parseDeal(raw: unknown): ExtractedDeal {
  const result = DealSchema.safeParse(raw);
  if (!result.success) {
    const problems = result.error.issues.map((i) => `${i.path.join(".") || "deal"}: ${i.message}`);
    throw new Error(`Invalid deal: ${problems.join("; ")}`);
  }
  const { amount, ...rest } = result.data;
  return { ...rest, amountCents: toCents(String(amount)) };
}