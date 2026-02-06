import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import PrizeDialog from "./PrizeDialog";
import DeletePrizeButton from "./DeletePrizeButton";
import LuckyWheelHistoryClient from "@/components/admin/LuckyWheelHistoryClient";

export const dynamic = 'force-dynamic';

export default async function LuckyWheelPage() {
    const f = (n: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n);
    // @ts-ignore
    const prizes = await prisma.luckyWheelPrize.findMany({
        orderBy: { probability: 'asc' }
    });

    // @ts-ignore
    const history = await prisma.luckyWheelHistory.findMany({
        orderBy: { createdAt: 'desc' },
        take: 1000,
        include: {
            user: {
                include: {
                    achievements: {
                        orderBy: { unlockedAt: 'desc' },
                        take: 1
                    }
                }
            }
        }
    });

    // Group prizes by status
    const availablePrizes = prizes.filter((p: any) => p.remaining > 0);
    const outOfStockPrizes = prizes.filter((p: any) => p.remaining === 0);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-3xl font-bold tracking-tight">Vòng quay may mắn</h2>
                <PrizeDialog />
            </div>

            {/* 🎁 REWARD AUDIT SECTION */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                 {/* Available Loot */}
                 <Card className="md:col-span-2 border-emerald-200 bg-emerald-50/30">
                    <CardHeader>
                        <CardTitle className="text-emerald-700 flex items-center gap-2">🎁 Kho Quà Đang Có Sẵn</CardTitle>
                        {/* <CardDescription>Các phần quà và danh hiệu chưa có chủ</CardDescription> */}
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-wrap gap-2">
                             {availablePrizes.length === 0 ? (
                                <span className="text-muted-foreground italic">Kho đang rỗng!</span>
                             ) : (
                                availablePrizes.map((p: any) => (
                                    <Badge key={p.id} variant="outline" className="text-sm py-1 px-3 bg-white border-emerald-200 text-emerald-800 shadow-sm">
                                        {p.name} 
                                        <span className="ml-2 bg-emerald-100 text-emerald-700 rounded-full px-2 text-xs">x{p.remaining}</span>
                                    </Badge>
                                ))
                             )}
                        </div>
                    </CardContent>
                 </Card>

                 {/* Out of stock / Claimed */}
                 <Card className="border-gray-200 bg-gray-50/50">
                    <CardHeader>
                        <CardTitle className="text-gray-600 flex items-center gap-2">🚫 Đã Hết / Đã Trao</CardTitle>
                        {/* <CardDescription>Các phần quà đã được nhận hết</CardDescription> */}
                    </CardHeader>
                    <CardContent>
                         <div className="flex flex-wrap gap-2">
                             {outOfStockPrizes.length === 0 ? (
                                <span className="text-muted-foreground italic">Chưa có món nào hết hàng.</span>
                             ) : (
                                outOfStockPrizes.map((p: any) => (
                                    <Badge key={p.id} variant="secondary" className="text-sm py-1 px-3 text-gray-500 line-through">
                                        {p.name}
                                    </Badge>
                                ))
                             )}
                        </div>
                    </CardContent>
                 </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Danh sách giải thưởng</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Tên giải</TableHead>
                                <TableHead>Loại</TableHead>
                                <TableHead className="text-right">Giá trị</TableHead>
                                <TableHead className="text-right">Tổng SL</TableHead>
                                <TableHead className="text-right">Còn lại</TableHead>
                                <TableHead className="text-right">Tỷ lệ</TableHead>
                                <TableHead>Trạng thái</TableHead>
                                <TableHead className="text-right">Hành động</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {prizes.map((prize: any) => (
                                <TableRow key={prize.id}>
                                    <TableCell className="font-medium">
                                        {prize.name}
                                        {prize.description && <div className="text-xs text-muted-foreground">{prize.description}</div>}
                                    </TableCell>
                                    <TableCell><Badge variant="outline">{prize.type}</Badge></TableCell>
                                    <TableCell className="text-right font-mono">{f(prize.value || 0)}</TableCell>
                                    <TableCell className="text-right">{prize.quantity}</TableCell>
                                    <TableCell className="text-right font-bold text-emerald-600">{prize.remaining}</TableCell>
                                    <TableCell className="text-right">{prize.probability}%</TableCell>
                                    <TableCell>
                                        {prize.active 
                                            ? <Badge className="bg-green-500">Active</Badge> 
                                            : <Badge variant="secondary">Hidden</Badge>
                                        }
                                    </TableCell>
                                    <TableCell className="text-right space-x-2">
                                        <PrizeDialog prize={prize} />
                                        <DeletePrizeButton prizeId={prize.id} />
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <LuckyWheelHistoryClient initialHistory={history} />
        </div>
    )
}
