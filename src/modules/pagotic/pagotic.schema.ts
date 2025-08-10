// src/modules/pagotic/pagotic.schema.ts
import { z } from "zod";

// yyyy-MM-dd'T'HH:mm:ssZ (offset sem ":")
const dateTimePagoTIC = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{4}$/, "Use formato yyyy-MM-dd'T'HH:mm:ssZ");

function addDays(d: Date, days: number) {
  const x = new Date(d);
  x.setUTCDate(x.getUTCDate() + days);
  return x;
}

export const createPagoSchema = z
  .object({
    // For hosted checkout, 'type' can be omitted and the API returns form_url.
    // When charging directly, set 'type' accordingly ("online", "coupon", etc).
    type: z.enum(["debit", "online", "transfer", "debin", "coupon"]).optional(),

    return_url: z.string().trim().url(),
    back_url: z.string().trim().url(),
    notification_url: z.string().trim().url(),

    // Unique per transaction (REQUIRED by API)
    external_transaction_id: z.string().trim().min(1),

    // Required per API
    due_date: dateTimePagoTIC,
    last_due_date: dateTimePagoTIC,
    currency_id: z.enum(["ARS", "USD"]).default("ARS"),

    // Only when charging directly. Omit for hosted checkout.
    payment_methods: z
      .array(
        z.object({
          amount: z.number().positive(),
          media_payment_id: z.number().int().optional(),
          number: z.string().trim().min(1).optional(), // card number
          installments: z.number().int().optional(),
          holder: z
            .object({
              name: z.string().min(1).optional(),
              identification: z
                .object({
                  type: z.string().min(1).optional(),
                  number: z.string().min(1).optional(),
                  country: z.string().length(3).optional(), // ISO 3166-1 alpha-3
                })
                .optional(),
            })
            .optional(),
        })
      )
      .optional(),

    details: z
      .array(
        z.object({
          // Mantido conforme sua decisão anterior
          concept_id: z.literal("woocommerce"),
          concept_description: z.string().trim().min(1).max(160),
          amount: z.number().positive(),
          external_reference: z.string().trim().min(1),
        })
      )
      .min(1),

    payer: z.object({
      name: z.string().trim().min(1),
      email: z.string().trim().email(),
      identification: z.object({
        // A doc usa labels como "DNI_ARG", etc. Mantenha seu mapeamento se já estiver válido.
        type: z.string().trim().min(1),
        number: z.string().trim().min(1),
        country: z.string().trim().length(2).transform((s) => s.toUpperCase()),
      }),
    }),

    metadata: z.record(z.any()).optional(),
  })
  .superRefine((v, ctx) => {
    const parse = (s: string) => {
      const withColon = s.replace(/([+-]\d{2})(\d{2})$/, "$1:$2");
      return new Date(withColon);
    };
    const now = new Date();
    const due = parse(v.due_date);
    const last = parse(v.last_due_date);

    if (due.getTime() < now.getTime()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["due_date"], message: "due_date não pode ser no passado" });
    }
    if (last.getTime() < due.getTime()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["last_due_date"], message: "last_due_date deve ser >= due_date" });
    }
    if (last.getTime() > addDays(due, 30).getTime()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["last_due_date"], message: "last_due_date não pode exceder 30 dias após due_date" });
    }
  });

export type CreatePagoPayload = z.infer<typeof createPagoSchema>;
