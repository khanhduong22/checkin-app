import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import PrizeDialog from "./PrizeDialog";
import DeletePrizeButton from "./DeletePrizeButton";

export const dynamic = 'force-dynamic';

export default async function LuckyWheelPage() {
    // @ts-ignore
    const prizes = await prisma.luckyWheelPrize.findMany({
        orderBy: { probability: 'asc' }
    });

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-3xl font-bold tracking-tight">Vòng quay may mắn</h2>
                <PrizeDialog />
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
        </div>
    )
}
