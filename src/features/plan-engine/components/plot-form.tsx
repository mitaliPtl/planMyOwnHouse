"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { FormField } from "@/components/ui/form-field";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { PlotVisualization } from "@/features/plan-engine/components/plot-visualization";
import { putJson } from "@/lib/api-client";
import { plotSchema, type PlotFormInput, type PlotInput } from "@/validators/plot.validators";

interface PlotFormProps {
  projectId: string;
  initial?: Partial<PlotInput>;
}

const DIRECTION_OPTIONS = ["North", "South", "East", "West"] as const;

export function PlotForm({ projectId, initial }: PlotFormProps) {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<PlotFormInput, unknown, PlotInput>({
    resolver: zodResolver(plotSchema),
    defaultValues: {
      width: initial?.width ?? 30,
      length: initial?.length ?? 50,
      unit: initial?.unit ?? "FEET",
      floors: initial?.floors ?? 1,
      roadSide: initial?.roadSide,
      mainDoorDirection: initial?.mainDoorDirection,
      frontSetback: initial?.frontSetback ?? 5,
      rearSetback: initial?.rearSetback ?? 5,
      leftSetback: initial?.leftSetback ?? 3,
      rightSetback: initial?.rightSetback ?? 3,
    },
  });

  const values = watch();

  async function onSubmit(values: PlotInput) {
    setFormError(null);
    setIsSubmitting(true);

    const result = await putJson(`/api/projects/${projectId}/plot`, values);

    setIsSubmitting(false);

    if (!result.success) {
      setFormError(result.message);
      return;
    }

    router.push(`/projects/${projectId}/rooms`);
    router.refresh();
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4" noValidate>
        {formError && (
          <Alert variant="destructive" role="alert">
            <AlertDescription>{formError}</AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-3 gap-4">
          <FormField label="Width" htmlFor="width" required error={errors.width?.message}>
            <Input id="width" type="number" step="any" {...register("width")} />
          </FormField>
          <FormField label="Length" htmlFor="length" required error={errors.length?.message}>
            <Input id="length" type="number" step="any" {...register("length")} />
          </FormField>
          <FormField label="Unit" htmlFor="unit">
            <Select id="unit" {...register("unit")}>
              <option value="FEET">Feet</option>
              <option value="METER">Meter</option>
              <option value="YARD">Yard</option>
            </Select>
          </FormField>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <FormField label="Number of floors" htmlFor="floors" error={errors.floors?.message}>
            <Input id="floors" type="number" min={1} max={4} {...register("floors")} />
          </FormField>
          <FormField
            label="Road side"
            htmlFor="roadSide"
            description="Which edge faces the road"
            error={errors.roadSide?.message}
          >
            <Select id="roadSide" {...register("roadSide")}>
              <option value="">Not specified</option>
              {DIRECTION_OPTIONS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField
            label="Main door direction"
            htmlFor="mainDoorDirection"
            description="Which edge the entrance faces"
            error={errors.mainDoorDirection?.message}
          >
            <Select id="mainDoorDirection" {...register("mainDoorDirection")}>
              <option value="">Not specified</option>
              {DIRECTION_OPTIONS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </Select>
          </FormField>
        </div>

        <fieldset className="grid gap-4">
          <legend className="text-sm font-medium text-foreground">Setbacks</legend>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <FormField label="Front" htmlFor="frontSetback" error={errors.frontSetback?.message}>
              <Input id="frontSetback" type="number" step="any" {...register("frontSetback")} />
            </FormField>
            <FormField label="Rear" htmlFor="rearSetback" error={errors.rearSetback?.message}>
              <Input id="rearSetback" type="number" step="any" {...register("rearSetback")} />
            </FormField>
            <FormField label="Left" htmlFor="leftSetback" error={errors.leftSetback?.message}>
              <Input id="leftSetback" type="number" step="any" {...register("leftSetback")} />
            </FormField>
            <FormField label="Right" htmlFor="rightSetback" error={errors.rightSetback?.message}>
              <Input id="rightSetback" type="number" step="any" {...register("rightSetback")} />
            </FormField>
          </div>
        </fieldset>

        <Button type="submit" disabled={isSubmitting} className="w-fit">
          {isSubmitting && <Spinner />}
          Save & continue
        </Button>
      </form>

      <div>
        <PlotVisualization
          width={Number(values.width)}
          length={Number(values.length)}
          frontSetback={Number(values.frontSetback) || 0}
          rearSetback={Number(values.rearSetback) || 0}
          leftSetback={Number(values.leftSetback) || 0}
          rightSetback={Number(values.rightSetback) || 0}
          roadSide={values.roadSide as "North" | "South" | "East" | "West" | undefined}
          mainDoorDirection={values.mainDoorDirection as "North" | "South" | "East" | "West" | undefined}
          unit={values.unit ?? "FEET"}
        />
        {Number(values.width) > 0 && Number(values.length) > 0 && (
          <p className="mt-2 text-center text-sm text-muted-foreground">
            Total plot area: {(Number(values.width) * Number(values.length)).toLocaleString()}{" "}
            sq.{values.unit === "METER" ? "m" : values.unit === "YARD" ? "yd" : "ft"}
          </p>
        )}
      </div>
    </div>
  );
}
