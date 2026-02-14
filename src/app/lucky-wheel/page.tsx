import { prisma } from "@/lib/prisma";
import LuckyWheelGame from "@/components/LuckyWheelGame";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";

export const dynamic = 'force-dynamic';

export default async function LuckyWheelUserPage() {
    const session = await getServerSession(authOptions);
    if (!session) {
        redirect('/login');
    }

    // Get active prizes for display on the wheel
    // Note: We might want to include "Better Luck Next Time" even if quantity is infinite, or filter appropriately.
    // The previous seeding created 'remaining' 9999 for 'BETTER_LUCK_NEXT_TIME'.
    
    // We only show items with remaining > 0 to be honest.
    const prizes = await prisma.luckyWheelPrize.findMany({
        where: { 
            active: true,
            remaining: { gt: 0 }
        },
        orderBy: { probability: 'asc' } // Or randomize order? Usually wheel order is fixed.
    });

    return (
        <div className="min-h-screen bg-gradient-to-b from-indigo-900 via-purple-900 to-pink-900 p-4 md:p-8 flex items-center justify-center">
            <Card className="w-full max-w-4xl bg-white/95 backdrop-blur shadow-2xl border-purple-200">
                <CardHeader className="text-center border-b pb-8">
                    <CardTitle className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600">
                        VÒNG QUAY NHÂN PHẨM
                    </CardTitle>
                    <CardDescription className="text-lg mt-2">
                        Thử vận may - Rinh quà &quot;khủng&quot; - Thay đổi danh hiệu
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {prizes.length < 2 ? (
                        <div className="text-center py-20 text-muted-foreground">
                            Hiện chưa có đủ giải thưởng để bắt đầu vòng quay.
                        </div>
                    ) : (
                        <LuckyWheelGame prizes={prizes} />
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
