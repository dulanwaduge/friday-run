import { z } from "zod";
import { normaliseDate } from "./dateUtils.js";

const optionalText = z
  .string()
  .trim()
  .max(500)
  .optional()
  .nullable()
  .transform((value) => (value ? value : null));

export const entryPayloadSchema = z
  .object({
    date: z.string().transform(normaliseDate),
    startLocation: z.string().trim().min(2).max(240),
    endLocation: z.string().trim().min(2).max(240),
    kilometres: z.coerce.number().min(0).max(2000),
    calculatedKilometres: z.coerce.number().min(0).max(2000).optional().nullable(),
    distanceSource: z.enum(["calculated", "manual"]).default("manual"),
    notes: optionalText,
    vehicle: optionalText,
    odometerStart: z.coerce.number().min(0).optional().nullable(),
    odometerEnd: z.coerce.number().min(0).optional().nullable(),
    roundTrip: z.boolean().default(false)
  })
  .refine(
    (data) =>
      data.odometerStart == null ||
      data.odometerEnd == null ||
      data.odometerEnd >= data.odometerStart,
    {
      path: ["odometerEnd"],
      message: "Odometer end must be greater than or equal to odometer start"
    }
  );

export const rangeQuerySchema = z
  .object({
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    financialYear: z.string().regex(/^\d{4}-\d{2}$/).optional(),
    search: z.string().trim().max(120).optional(),
    limit: z.coerce.number().int().min(1).max(500).default(100),
    offset: z.coerce.number().int().min(0).default(0)
  })
  .refine((data) => !(data.startDate && data.financialYear), {
    message: "Use either a custom date range or financialYear, not both"
  });

export const reportQuerySchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  financialYear: z.string().regex(/^\d{4}-\d{2}$/).optional(),
  period: z.enum(["week", "month", "financial-year", "custom"]).default("custom"),
  format: z.enum(["csv", "xlsx", "pdf"]).default("csv")
});
