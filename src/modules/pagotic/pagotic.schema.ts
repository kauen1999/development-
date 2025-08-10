import { z } from "zod";

// yyyy-MM-dd'T'HH:mm:ssZ (offset sem ":")
export const dateTimePagoTIC = z
  .string()
  .regex(
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{4}$/,
    "Use formato yyyy-MM-dd'T'HH:mm:ssZ (ex.: 2025-08-09T17:18:48-0300)"
  );

// enums mínimos (ajuste conforme seu realm)
const CurrencyId = z.enum(["ARS", "USD"]);
const IdentificationType = z.enum(["DNI_ARG"]); // adicione outros se necessário
const CountryAlpha3 = z.enum(["ARG"]);          // adicione outros se necessário

const detailsItemSchema = z.object({
  concept_id: z.string().trim().min(1),
  concept_description: z.string().trim().min(1).max(160),
  amount: z.number().positive(),
  currency_id: CurrencyId, // <-- obrigatório em cada item
  external_reference: z.union([z.string(), z.number()]).transform(String).optional(),
  collector_id: z.string().optional(),
});

const payerSchema = z.object({
  id: z.string().optional(), // se usar CUSTOMERS
  external_reference: z.union([z.string(), z.number()]).transform(String).optional(),
  name: z.string().trim().min(1),
  email: z.string().trim().email(),
  identification: z.object({
    type: IdentificationType,       // ex.: "DNI_ARG"
    number: z.string().trim().min(1),
    country: CountryAlpha3,         // ex.: "ARG" (ISO 3166-1 alfa-3)
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
    collector_id: z.string().trim().min(1),     // <-- requerido no root
    return_url: z.string().trim().url(),
    back_url: z.string().trim().url(),
    notification_url: z.string().trim().url(),

    // exigido pelo seu realm para evitar 4120
    payment_number: z.string().trim().min(1, "payment_number é obrigatório"),

    external_transaction_id: z.string().trim().min(1),

    // datas no formato exigido
    due_date: dateTimePagoTIC,
    last_due_date: dateTimePagoTIC,

    // Checkout hospedado: NÃO incluir `type` nem `payment_methods`

    details: z.array(detailsItemSchema).min(1),
    payer: payerSchema,

    metadata: z.record(z.any()).optional(),
    carrier: z.string().optional(),
    presets: z.any().optional(),
  })
  .superRefine((v, ctx) => {
    // Sanidade de datas
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
