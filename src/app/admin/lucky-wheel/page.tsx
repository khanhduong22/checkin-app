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

    // @ts-ignore
    const history = await prisma.luckyWheelHistory.findMany({
        orderBy: { createdAt: 'desc' },
        take: 20,
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

            <Card>
                <CardHeader>
                    <CardTitle>Lịch sử trúng thưởng (20 gần nhất)</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Thời gian</TableHead>
                                <TableHead>Người trúng</TableHead>
                                <TableHead>Danh hiệu</TableHead>
                                <TableHead>Giải thưởng</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {history.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center text-muted-foreground">Chưa có ai trúng thưởng</TableCell>
                                </TableRow>
                            ) : (
                                history.map((record: any) => (
                                    <TableRow key={record.id}>
                                        <TableCell>{new Date(record.createdAt).toLocaleString('vi-VN')}</TableCell>
                                        <TableCell className="font-medium">{record.user.name || record.user.email}</TableCell>
                                        <TableCell>
                                            {record.user.achievements?.[0]?.code ? (
                                                <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200">
                                                    {record.user.achievements[0].code}
                                                </Badge>
                                            ) : (
                                                <span className="text-muted-foreground text-xs">{record.user.role}</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="font-bold text-primary">{record.prizeName}</TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    )
}
