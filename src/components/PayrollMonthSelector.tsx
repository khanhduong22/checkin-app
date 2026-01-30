'use client';

import { useRouter } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export default function PayrollMonthSelector({ current, options, baseUrl = "/payroll" }: { current: string, options: any[], baseUrl?: string }) {
    const router = useRouter();

    const handleValueChange = (val: string) => {
        const [year, month] = val.split('-');
        router.push(`${baseUrl}?year=${year}&month=${month}`);
    }

    // Find label
    const currentLabel = options.find(o => o.value === current)?.label || current;

    return (
        <Select value={current} onValueChange={handleValueChange}>
            <SelectTrigger className="w-full">
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
