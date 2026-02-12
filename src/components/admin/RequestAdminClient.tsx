'use client';

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { approveRequest, rejectRequest } from "@/app/actions/request";
import { useRouter } from "next/navigation";

export default function RequestAdminClient({ requests }: { requests: any[] }) {
    const router = useRouter();

    const handleApprove = async (id: number) => {
        if (!confirm("Duyệt yêu cầu này?")) return;
        await approveRequest(id);
        router.refresh();
    };

    const handleReject = async (id: number) => {
        if (!confirm("Từ chối yêu cầu này?")) return;
        await rejectRequest(id);
        router.refresh();
    };

    return (
        <div id="request-admin-list" className="space-y-4">
            {requests.length === 0 ? (
                <div className="text-center italic text-muted-foreground">Không có yêu cầu nào.</div>
            ) : requests.map((r: any) => (
                <Card key={r.id} className="overflow-hidden">
                    <CardContent className="p-0 flex flex-col md:flex-row">
                         <div className={`w-2 ${
                             r.status === 'PENDING' ? 'bg-yellow-400' : 
                             r.status === 'APPROVED' ? 'bg-emerald-500' : 'bg-red-500'
                         }`} />
                         
                         <div className="flex-1 p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                    <span className="font-bold">{r.user.name}</span>
                                    <Badge variant="outline">{r.type}</Badge>
                                    <span className="text-sm text-muted-foreground">
                                        Ngày: {new Date(r.date).toLocaleDateString('vi-VN')}
                                    </span>
                                </div>
                                <div className="text-sm">
                                    Lý do: <span className="italic">"{r.reason}"</span>
                                </div>
                                <div className="text-xs text-muted-foreground">
                                    Gửi lúc: {new Date(r.createdAt).toLocaleString('vi-VN')}
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                {r.status === 'PENDING' ? (
                                    <>
                                        <Button size="sm" variant="default" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => handleApprove(r.id)}>
                                            ✅ Duyệt
                                        </Button>
                                        <Button size="sm" variant="destructive" onClick={() => handleReject(r.id)}>
                                            ❌ Từ chối
                                        </Button>
                                    </>
                                ) : (
                                    <Badge className={r.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}>
                                        {r.status === 'APPROVED' ? 'Đã duyệt' : 'Đã từ chối'}
                                    </Badge>
                                )}
                            </div>
                         </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}
