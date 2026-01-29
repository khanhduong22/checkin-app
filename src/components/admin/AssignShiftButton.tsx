'use client';

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"; // Use Dialog if available or simple conditional rendering
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { assignCustomShift } from "@/app/actions/shift";
import { useRouter } from "next/navigation";

// Simple Select for Users
function UserSelect({ users, value, onChange }: any) {
    return (
        <select 
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            value={value}
            onChange={(e) => onChange(e.target.value)}
        >
            <option value="">-- Chọn nhân viên --</option>
            {users.map((u: any) => (
                <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
            ))}
        </select>
    );
}

export default function AssignShiftButton({ users, currentDate }: { users: any[], currentDate: string }) {
    const router = useRouter();
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    
    // Form State
    const [userId, setUserId] = useState("");
    const [startTime, setStartTime] = useState("08:30");
    const [endTime, setEndTime] = useState("17:30");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!userId) return alert("Vui lòng chọn nhân viên");
        
        setIsLoading(true);
        const res = await assignCustomShift(userId, currentDate, startTime, endTime);
        setIsLoading(false);

        if (res.success) {
            setIsOpen(false);
            setUserId(""); // Reset
            router.refresh(); // Refresh Data
        } else {
            alert(res.message);
        }
    }

    return (
        <>
            <Button onClick={() => setIsOpen(true)}>➕ Gán ca làm</Button>

            {/* Manual Modal Overlay to avoid missing Shadcn Dialog components issue if any */}
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden">
                        <div className="p-6">
                            <h3 className="text-lg font-bold mb-4">Gán Ca Tùy Chỉnh ({currentDate})</h3>
                            
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div className="space-y-2">
                                    <Label>Nhân viên</Label>
                                    <UserSelect users={users} value={userId} onChange={setUserId} />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Giờ bắt đầu</Label>
                                        <Input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} required />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Giờ kết thúc</Label>
                                        <Input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} required />
                                    </div>
                                </div>

                                <div className="pt-4 flex justify-end gap-2">
                                    <Button type="button" variant="ghost" onClick={() => setIsOpen(false)}>Hủy</Button>
                                    <Button type="submit" disabled={isLoading}>
                                        {isLoading ? 'Đang lưu...' : 'Lưu Ca Làm'}
                                    </Button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
