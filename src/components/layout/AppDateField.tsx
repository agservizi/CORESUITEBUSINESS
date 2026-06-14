"use client";

import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import type { SxProps, Theme } from "@mui/material";
import dayjs, { type Dayjs } from "dayjs";
import { DATE_PICKER_DISPLAY_FORMAT, DATE_VALUE_FORMAT } from "./app-shell";

export type AppDateFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  size?: "small" | "medium";
  fullWidth?: boolean;
  disabled?: boolean;
  sx?: SxProps<Theme>;
};

function toDayjs(value: string): Dayjs | null {
  if (!value) return null;
  const parsed = dayjs(value, DATE_VALUE_FORMAT, true);
  return parsed.isValid() ? parsed : null;
}

function toValueString(value: Dayjs | null): string {
  return value?.isValid() ? value.format(DATE_VALUE_FORMAT) : "";
}

export function AppDateField({
  label,
  value,
  onChange,
  size = "small",
  fullWidth,
  disabled,
  sx,
}: AppDateFieldProps) {
  return (
    <DatePicker
      label={label}
      format={DATE_PICKER_DISPLAY_FORMAT}
      value={toDayjs(value)}
      disabled={disabled}
      onChange={(next) => onChange(toValueString(next))}
      slotProps={{
        textField: {
          size,
          fullWidth,
          sx,
        },
      }}
    />
  );
}
