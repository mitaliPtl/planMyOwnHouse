import { z } from "zod";

export const plotUnitSchema = z.enum(["FEET", "METER", "YARD"]);

export const compassDirectionSchema = z.enum(["North", "South", "East", "West"]);

// A native <select>'s empty/placeholder option always submits "" — z.enum(...)
// .optional() only accepts undefined, not "", so an untouched dropdown would
// otherwise fail validation. Treat "" the same as not-selected.
function optionalCompassDirectionField() {
  return z
    .union([compassDirectionSchema, z.literal("")])
    .optional()
    .transform((v) => (v === "" ? undefined : v));
}

export const plotSchema = z
  .object({
    width: z.coerce.number().positive("Plot width must be greater than 0."),
    length: z.coerce.number().positive("Plot length must be greater than 0."),
    unit: plotUnitSchema.default("FEET"),
    floors: z.coerce.number().int().min(1).max(4).default(1),
    roadSide: optionalCompassDirectionField(),
    mainDoorDirection: optionalCompassDirectionField(),
    frontSetback: z.coerce.number().min(0).default(0),
    rearSetback: z.coerce.number().min(0).default(0),
    leftSetback: z.coerce.number().min(0).default(0),
    rightSetback: z.coerce.number().min(0).default(0),
  })
  .superRefine((data, ctx) => {
    if (data.frontSetback + data.rearSetback >= data.length) {
      ctx.addIssue({
        code: "custom",
        path: ["rearSetback"],
        message: "Front + rear setback must be less than the plot length.",
      });
    }
    if (data.leftSetback + data.rightSetback >= data.width) {
      ctx.addIssue({
        code: "custom",
        path: ["rightSetback"],
        message: "Left + right setback must be less than the plot width.",
      });
    }
  });

// z.coerce fields make the schema's input type (raw form values, e.g. strings from
// number inputs) differ from its output type (post-coercion numbers) — react-hook-form
// needs both to type a form using this resolver correctly.
export type PlotFormInput = z.input<typeof plotSchema>;
export type PlotInput = z.output<typeof plotSchema>;
