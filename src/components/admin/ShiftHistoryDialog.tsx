'use client';

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { History, Search, Loader2 } from "lucide-react";
import { getShiftAuditLogs } from "@/app/actions/audit-actions";

export default function ShiftHistoryDialog() {
  const [open, setOpen] = useState(false);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const fetchLogs = async (pageNum: number, append = false) => {
    setLoading(true);
    const result = await getShiftAuditLogs(pageNum, 50);
    if (result.success && result.logs) {
      if (append) {
        setLogs(prev => [...prev, ...result.logs!]);
      } else {
        setLogs(result.logs);
      }
      setHasMore(result.logs.length === 50);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (open) {
      setPage(1);
      fetchLogs(1, false);
    }
  }, [open]);

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchLogs(nextPage, true);
  };

  const formatShiftDateTime = (dateStr: string | null) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    // Convert to Vietnam Time (UTC+7)
    const utc = date.getTime() + date.getTimezoneOffset() * 60000;
    const vnTime = new Date(utc + (3600000 * 7));
    
    const pad = (n: number) => n.toString().padStart(2, '0');
    const days = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
    const dayName = days[vnTime.getDay()];
    const day = pad(vnTime.getDate());
    const month = pad(vnTime.getMonth() + 1);
    const hours = pad(vnTime.getHours());
    const minutes = pad(vnTime.getMinutes());
    
    return `${dayName} ${day}/${month} ${hours}:${minutes}`;
  };

  const formatLogTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const utc = date.getTime() + date.getTimezoneOffset() * 60000;
    const vnTime = new Date(utc + (3600000 * 7));
    
    const pad = (n: number) => n.toString().padStart(2, '0');
    const day = pad(vnTime.getDate());
    const month = pad(vnTime.getMonth() + 1);
    const year = vnTime.getFullYear();
    const hours = pad(vnTime.getHours());
    const minutes = pad(vnTime.getMinutes());
    
    return `${hours}:${minutes} ${day}/${month}/${year}`;
  };

  const renderActionBadge = (action: string) => {
    switch (action) {
      case 'CREATE':
        return <Badge className="bg-emerald-100 hover:bg-emerald-100 text-emerald-700 border-emerald-200">Thêm mới</Badge>;
      case 'UPDATE':
        return <Badge className="bg-amber-100 hover:bg-amber-100 text-amber-700 border-amber-200">Cập nhật</Badge>;
      case 'DELETE':
        return <Badge className="bg-rose-100 hover:bg-rose-100 text-rose-700 border-rose-200">Hủy/Xóa</Badge>;
      case 'IMPORT':
        return <Badge className="bg-blue-100 hover:bg-blue-100 text-blue-700 border-blue-200">Import Excel</Badge>;
      case 'TAKE_SWAP':
        return <Badge className="bg-purple-100 hover:bg-purple-100 text-purple-700 border-purple-200">Nhận đổi ca</Badge>;
      default:
        return <Badge variant="outline">{action}</Badge>;
    }
  };

  const formatLogDetail = (log: any) => {
    switch (log.action) {
      case 'CREATE':
        return (
          <span>
            Gán ca: <span className="font-semibold text-slate-700">{formatShiftDateTime(log.newStart)} - {formatShiftDateTime(log.newEnd).split(' ').slice(2).join(' ')}</span>
          </span>
        );
      case 'DELETE':
        return (
          <span>
            Hủy ca: <span className="font-semibold text-rose-700 line-through">{formatShiftDateTime(log.oldStart)} - {formatShiftDateTime(log.oldEnd).split(' ').slice(2).join(' ')}</span>
          </span>
        );
      case 'UPDATE':
        return (
          <div className="flex flex-col text-xs space-y-0.5">
            <span className="text-slate-400 line-through">Cũ: {formatShiftDateTime(log.oldStart)} - {formatShiftDateTime(log.oldEnd).split(' ').slice(2).join(' ')}</span>
            <span className="text-emerald-700 font-semibold">Mới: {formatShiftDateTime(log.newStart)} - {formatShiftDateTime(log.newEnd).split(' ').slice(2).join(' ')}</span>
          </div>
        );
      case 'IMPORT':
        return (
          <span>
            Import từ file Excel: <span className="font-semibold text-slate-700">{formatShiftDateTime(log.newStart)} - {formatShiftDateTime(log.newEnd).split(' ').slice(2).join(' ')}</span>
          </span>
        );
      case 'TAKE_SWAP':
        return (
          <span>
            Nhận ca đổi từ chợ ca: <span className="font-semibold text-slate-700">{formatShiftDateTime(log.newStart)} - {formatShiftDateTime(log.newEnd).split(' ').slice(2).join(' ')}</span>
          </span>
        );
      default:
        return <span>Hành động khác</span>;
    }
  };

  const filteredLogs = logs.filter(log => {
    const userName = (log.user?.name || "").toLowerCase();
    const userEmail = (log.user?.email || "").toLowerCase();
    const changedByName = (log.changedBy?.name || "").toLowerCase();
    const changedByEmail = (log.changedBy?.email || "").toLowerCase();
    const query = search.toLowerCase();
    
    return userName.includes(query) || 
           userEmail.includes(query) || 
           changedByName.includes(query) || 
           changedByEmail.includes(query);
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="flex items-center gap-2 border-emerald-200 text-emerald-800 hover:bg-emerald-50">
          <History className="w-4 h-4" />
          Lịch sử thay đổi ca
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-slate-800">Lịch sử Thay đổi Đăng ký Ca làm</DialogTitle>
          <DialogDescription>
            Xem toàn bộ nhật ký thêm, sửa, xóa ca làm việc của nhân viên trong hệ thống.
          </DialogDescription>
        </DialogHeader>

        <div className="relative my-2">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Tìm theo tên nhân viên hoặc người thực hiện..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <ScrollArea className="flex-1 border rounded-lg overflow-hidden bg-white">
          <Table>
            <TableHeader className="bg-slate-50 sticky top-0 z-10">
              <TableRow>
                <TableHead className="w-[150px]">Thời gian</TableHead>
                <TableHead className="w-[130px]">Người thực hiện</TableHead>
                <TableHead className="w-[130px]">Nhân viên</TableHead>
                <TableHead className="w-[110px]">Thao tác</TableHead>
                <TableHead>Chi tiết ca làm</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-40 text-center">
                    <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                      <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
                      <span>Đang tải lịch sử...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredLogs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-40 text-center text-muted-foreground">
                    Không tìm thấy bản ghi lịch sử nào.
                  </TableCell>
                </TableRow>
              ) : (
                filteredLogs.map((log) => (
                  <TableRow key={log.id} className="hover:bg-slate-50/50">
                    <TableCell className="font-mono text-xs text-slate-500">
                      {formatLogTime(log.createdAt)}
                    </TableCell>
                    <TableCell className="font-medium text-slate-700">
                      {log.changedBy?.name || log.changedBy?.email?.split('@')[0]}
                      <span className="block text-[10px] text-slate-400 font-normal">
                        {log.changedBy?.role === 'ADMIN' ? 'Admin' : 'Staff'}
                      </span>
                    </TableCell>
                    <TableCell className="text-slate-700 font-medium">
                      {log.user?.name || log.user?.email?.split('@')[0]}
                    </TableCell>
                    <TableCell>
                      {renderActionBadge(log.action)}
                    </TableCell>
                    <TableCell className="text-slate-600 text-sm">
                      {formatLogDetail(log)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </ScrollArea>

        {hasMore && !loading && (
          <div className="flex justify-center mt-4">
            <Button variant="outline" size="sm" onClick={handleLoadMore}>
              Tải thêm dữ liệu
            </Button>
          </div>
        )}
        
        {loading && logs.length > 0 && (
          <div className="flex justify-center mt-4 text-xs text-muted-foreground items-center gap-1.5">
            <Loader2 className="h-3 w-3 animate-spin" /> Đang tải thêm...
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
