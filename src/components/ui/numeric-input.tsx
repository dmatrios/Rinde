"use client";

import { type ComponentProps } from "react";
import { Input } from "@/components/ui/input";

type NumericInputProps = Omit<ComponentProps<typeof Input>, "onChange" | "type" | "value"> & {
  decimals?: number;
  onValueChange: (value: string) => void;
  value: string;
};

export function NumericInput({
  decimals = 2,
  onValueChange,
  value,
  ...props
}: NumericInputProps) {
  return (
    <Input
      {...props}
      type="text"
      inputMode={decimals ? "decimal" : "numeric"}
      autoComplete="off"
      pattern={decimals ? "[0-9]*[.]?[0-9]*" : "[0-9]*"}
      value={value}
      onChange={(event) => onValueChange(sanitizeNumericValue(event.target.value, decimals))}
    />
  );
}

export function sanitizeNumericValue(value: string, decimals = 2) {
  const compact = value.replace(/[^\d.]/g, "");
  if (!decimals) return compact.replace(/\D/g, "");

  const [whole = "", ...decimalParts] = compact.split(".");
  const decimal = decimalParts.join("").slice(0, decimals);
  return decimalParts.length ? `${whole}.${decimal}` : whole;
}
