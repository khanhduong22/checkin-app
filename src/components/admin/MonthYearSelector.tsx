"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCallback, useTransition } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";

export default function MonthYearSelector({
  defaultMonth,
  defaultYear,
}: {
  defaultMonth: number;
  defaultYear: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const currentMonth = Number(searchParams.get("month")) || defaultMonth;
  const currentYear = Number(searchParams.get("year")) || defaultYear;

  const updateUrl = useCallback(
    (newMonth: number, newYear: number) => {
      const params = new URLSearchParams(searchParams.toString());
      if (newMonth === defaultMonth && newYear === defaultYear && !searchParams.has("month") && !searchParams.has("year")) {
        // Already on default and no params in URL, nothing to do
        return;
      }
      params.set("month", newMonth.toString());
      params.set("year", newYear.toString());
      startTransition(() => {
        router.push(`${pathname}?${params.toString()}`, { scroll: false });
      });
    },
    [searchParams, pathname, router, defaultMonth, defaultYear]
  );

  return (
    <div className="flex items-center gap-2">
      <Select
        value={currentMonth.toString()}
        onValueChange={(val) => updateUrl(Number(val), currentYear)}
        disabled={isPending}
      >
        <SelectTrigger className="w-[120px]">
          <SelectValue placeholder="Tháng" />
        </SelectTrigger>
        <SelectContent>
          {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
            <SelectItem key={m} value={m.toString()}>
              Tháng {m}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={currentYear.toString()}
        onValueChange={(val) => updateUrl(currentMonth, Number(val))}
        disabled={isPending}
      >
        <SelectTrigger className="w-[100px]">
          <SelectValue placeholder="Năm" />
        </SelectTrigger>
        <SelectContent>
          {Array.from({ length: 5 }, (_, i) => defaultYear - 2 + i).map((y) => (
            <SelectItem key={y} value={y.toString()}>
              {y}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {isPending && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground ml-2" />}
    </div>
  );
}
