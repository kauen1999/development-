import { z } from "zod";

// yyyy-MM-dd'T'HH:mm:ssZ (offset sem ":")
const dateTimePagoTIC = z
  .string()
  .regex(
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{4}$/,
    "Use formato yyyy-MM-dd'T'HH:mm:ssZ (ex.: 2025-08-09T17:18:48-0300)"
  );

// Helper para validar coerência das datas
function addDays(d: Date, days: number) {
  const x = new Date(d);
  x.setUTCDate(x.getUTCDate() + days);
  return x;
}

/**
 * Hosted checkout payload (no card data).
 * - NO 'payment_methods'
 * - NO 'type'
 * - Required: urls, external_transaction_id, due_date, last_due_date, currency_id, details[], payer
 */
export const createPagoSchema = z
  .object({
    return_url: z.string().trim().url(),
    back_url: z.string().trim().url(),
    notification_url: z.string().trim().url(),

    // 🔹 novo campo obrigatório
    payment_number: z.string().trim().min(1, "payment_number é obrigatório"),

    external_transaction_id: z.string().trim().min(1),

    due_date: dateTimePagoTIC,
    last_due_date: dateTimePagoTIC,

    currency_id: z.enum(["ARS", "USD"]).default("ARS"),

    details: z
      .array(
        z.object({
          // troque para o concept_id aceito pela sua conta
          concept_id: z.string().trim().min(1),
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
        type: z.string().trim().min(1),
        number: z.string().trim().min(1),
        country: z.string().trim().length(2).transform((s) => s.toUpperCase()),
      }),
    }),
  })
  
  .superRefine((v, ctx) => {
    // Date sanity checks
    const parse = (s: string) => {
      const withColon = s.replace(/([+-]\d{2})(\d{2})$/, "$1:$2");
      return new Date(withColon);
    };
    const now = new Date();
    const due = parse(v.due_date);
    const last = parse(v.last_due_date);

    if (due.getTime() < now.getTime()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["due_date"],
        message: "due_date não pode ser no passado",
      });
    }
    if (last.getTime() < due.getTime()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["last_due_date"],
        message: "last_due_date deve ser >= due_date",
      });
    }
    if (last.getTime() > addDays(due, 30).getTime()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["last_due_date"],
        message: "last_due_date não pode exceder 30 dias após due_date",
      });
    }
  });

export type CreatePagoPayload = z.infer<typeof createPagoSchema>;
