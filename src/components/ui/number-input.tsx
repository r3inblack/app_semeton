import * as React from "react";
import { Input } from "@/components/ui/input";

const formatID = (digits: string) =>
  digits ? new Intl.NumberFormat("id-ID").format(Number(digits)) : "";

const toDigits = (s: string) => (s ?? "").toString().replace(/\D/g, "");

export interface NumberInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value" | "type"> {
  value?: number | string | null;
  onChange?: (e: { target: { value: string } }) => void;
}

export const NumberInput = React.forwardRef<HTMLInputElement, NumberInputProps>(
  ({ value, onChange, ...props }, ref) => {
    const digits = toDigits(value == null ? "" : String(value));
    const display = formatID(digits);
    return (
      <Input
        {...props}
        ref={ref}
        type="text"
        inputMode="numeric"
        value={display}
        onChange={(e) => {
          const d = toDigits(e.target.value);
          onChange?.({ target: { value: d } });
        }}
      />
    );
  }
);
NumberInput.displayName = "NumberInput";
