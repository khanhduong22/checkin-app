'use client';

import { deletePrize } from "./actions";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

export default function DeletePrizeButton({ prizeId }: { prizeId: string }) {
    const handleDelete = async () => {
        if (confirm("Bạn có chắc muốn xóa giải thưởng này?")) {
            await deletePrize(prizeId);
        }
    };

    return (
        <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-700" onClick={handleDelete}>
            <Trash2 className="h-4 w-4" />
        </Button>
    )
}
