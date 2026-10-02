import React from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function PayrollMonthSelector({
  current,
  options,
  onSelect,
}: {
  current: string;
  options: Array<{ value: string; label: string }>;
  onSelect?: (val: string) => void;
}) {
  const currentLabel = options.find((o) => o.value === current)?.label || current;

  return (
    <Select value={current} onValueChange={(val) => onSelect && onSelect(val)}>
      <SelectTrigger className="w-full bg-white">
        <SelectValue placeholder="Chọn tháng">{currentLabel}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {options.map((opt) => (
          <SelectItem key={opt.value} value={opt.value}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
