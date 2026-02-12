'use client';

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from 'sonner';

export default function BackupManager() {
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleDownload = async () => {
        try {
            setIsLoading(true);
            
            // Build query params
            const params = new URLSearchParams();
            if (startDate) params.append('from', startDate);
            if (endDate) params.append('to', endDate);

            const url = `/api/admin/export?${params.toString()}`;
            
            // Trigger download via fake link
            const link = document.createElement('a');
            link.href = url;
            link.download = `backup_data_${new Date().toISOString().split('T')[0]}.xlsx`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            toast.success("Đang tải xuống bản sao lưu...");
        } catch (error) {
            console.error("Download failed", error);
            toast.error("Không thể tải xuống bản sao lưu");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div id="backup-data-section" className="rounded-xl border bg-card text-card-foreground shadow-sm">
            <div className="flex flex-col space-y-1.5 p-6">
                <h3 className="text-2xl font-semibold leading-none tracking-tight">Sao lưu dữ liệu</h3>
                <p className="text-sm text-muted-foreground">Tải xuống dữ liệu hệ thống (Check-in, Ca làm việc) theo khoảng thời gian.</p>
            </div>
            <div className="p-6 pt-0 space-y-4">
                <div className="flex flex-col sm:flex-row gap-4 items-end">
                    <div className="grid w-full max-w-sm items-center gap-1.5">
                        <Label htmlFor="from">Từ ngày</Label>
                        <Input 
                            type="date" 
                            id="from" 
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                        />
                    </div>
                    <div className="grid w-full max-w-sm items-center gap-1.5">
                        <Label htmlFor="to">Đến ngày</Label>
                        <Input 
                            type="date" 
                            id="to" 
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                        />
                    </div>
                </div>

                <div className="flex gap-2">
                    <Button 
                        onClick={handleDownload} 
                        disabled={isLoading}
                        className="w-full sm:w-auto"
                    >
                        {isLoading ? "Đang xử lý..." : "📥 Tải về bản Backup (.xlsx)"}
                    </Button>
                    
                    {(startDate || endDate) && (
                        <Button 
                            variant="outline" 
                            onClick={() => {
                                setStartDate('');
                                setEndDate('');
                            }}
                            title="Xóa bộ lọc ngày"
                        >
                            Xóa bộ lọc
                        </Button>
                    )}
                </div>
                
                <p className="text-xs text-muted-foreground italic">
                    * Nếu không chọn ngày, hệ thống sẽ tải toàn bộ dữ liệu.
                </p>
            </div>
        </div>
    );
}
