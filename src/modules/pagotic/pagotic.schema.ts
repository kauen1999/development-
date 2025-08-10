import { z } from "zod";

// yyyy-MM-dd'T'HH:mm:ssZ (offset sem ":")
export const dateTimePagoTIC = z
  .string()
  .regex(
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{4}$/,
    "Use formato yyyy-MM-dd'T'HH:mm:ssZ (ex.: 2025-08-09T17:18:48-0300)"
  );

const CurrencyId = z.enum(["ARS", "USD"]);
const IdentificationType = z.enum(["DNI_ARG"]);
const CountryAlpha3 = z.enum(["ARG"]);

const detailsItemSchema = z.object({
  concept_id: z.string().trim().min(1),
  concept_description: z.string().trim().min(1).max(160),
  amount: z.number().positive(),
  currency_id: CurrencyId,
  external_reference: z.union([z.string(), z.number()]).transform(String).optional(),
  collector_id: z.string().optional(),
});

const payerSchema = z.object({
  id: z.string().optional(),
  external_reference: z.union([z.string(), z.number()]).transform(String).optional(),
  name: z.string().trim().min(1),
  email: z.string().trim().email(),
  identification: z.object({
    type: IdentificationType,
    number: z.string().trim().min(1),
    country: CountryAlpha3,
  }),
  phones: z.array(
    z.object({
      description: z.string().optional(),
      country_code: z.number().int().optional(),
      area_code: z.number().int().optional(),
      number: z.number().int().optional(),
      extension: z.number().int().optional(),
    })
  ).optional(),
});

export const createPagoSchema = z
  .object({
    collector_id: z.string().trim().min(1).optional(), // 🔹 agora opcional
    return_url: z.string().trim().url(),
    back_url: z.string().trim().url(),
    notification_url: z.string().trim().url(),

    payment_number: z.string().trim().min(1, "payment_number é obrigatório"),

    external_transaction_id: z.string().trim().min(1),

    due_date: dateTimePagoTIC,
    last_due_date: dateTimePagoTIC,

    details: z.array(detailsItemSchema).min(1),
    payer: payerSchema,

    metadata: z.record(z.any()).optional(),
    carrier: z.string().optional(),
    presets: z.any().optional(),
  })
  .superRefine((v, ctx) => {
    const parse = (s: string) => new Date(s.replace(/([+-]\d{2})(\d{2})$/, "$1:$2"));
    const now = new Date();
    const due = parse(v.due_date);
    const last = parse(v.last_due_date);

    if (due.getTime() < now.getTime()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["due_date"], message: "due_date não pode ser no passado" });
    }
    if (last.getTime() < due.getTime()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["last_due_date"], message: "last_due_date deve ser >= due_date" });
    }
  });

export type CreatePagoPayload = z.infer<typeof createPagoSchema>;
