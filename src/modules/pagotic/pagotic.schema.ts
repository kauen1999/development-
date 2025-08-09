import { z } from "zod";

// Ex.: 2025-08-09T17:18:48-0300 (sem milissegundos; offset sem “:”)
const dateTimePagoTIC = z
  .string()
  .regex(
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{4}$/,
    "Use formato yyyy-MM-dd'T'HH:mm:ssZ (ex.: 2025-08-09T17:18:48-0300)"
  );

function addDays(d: Date, days: number) {
  const x = new Date(d);
  x.setUTCDate(x.getUTCDate() + days);
  return x;
}

export const createPagoSchema = z
  .object({
    type: z.literal("online"),

    return_url: z.string().trim().url(),
    back_url: z.string().trim().url(),
    notification_url: z.string().trim().url(),

    number: z.string().trim().min(1),
    external_transaction_id: z.string().trim().min(1),

    // ✅ campos de data no padrão exigido
    due_date: dateTimePagoTIC,
    last_due_date: dateTimePagoTIC,

    // ✅ moeda obrigatória (ISO-4217). Se usa só ARS, pode deixar literal.
    currency_id: z.enum(["ARS", "USD"]).default("ARS"),

    payment_methods: z
      .array(z.object({ method: z.enum(["credit", "debit"]).default("credit") }))
      .min(1),

    details: z
      .array(
        z.object({
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
        type: z.enum(["DNI", "CUIT", "CUIL", "PAS"]).default("DNI"),
        number: z.string().trim().min(1),
        country: z.string().trim().length(2).transform((s) => s.toUpperCase()),
      }),
    }),
  })
  .superRefine((v, ctx) => {
    // coerência de datas
    const parse = (s: string) => {
      // insere “:” no offset para o Date do JS: 2025-08-09T17:18:48-0300 -> -03:00
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
