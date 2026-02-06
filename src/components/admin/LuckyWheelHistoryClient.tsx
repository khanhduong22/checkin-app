'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";

interface LuckyWheelHistoryClientProps {
    initialHistory: any[];
}

export default function LuckyWheelHistoryClient({ initialHistory }: LuckyWheelHistoryClientProps) {
    const [searchTerm, setSearchTerm] = useState('');
    const [prizeFilter, setPrizeFilter] = useState('ALL');
    const [page, setPage] = useState(1);
    const pageSize = 10;

    // Derived unique prizes for filter
    const prizeOptions = Array.from(new Set(initialHistory.map(h => h.prizeName)));

    // Filtering
    const filteredHistory = initialHistory.filter(record => {
        const matchesSearch = 
            (record.user.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) || 
            (record.user.email?.toLowerCase() || '').includes(searchTerm.toLowerCase());
        
        const matchesPrize = prizeFilter === 'ALL' || record.prizeName === prizeFilter;

        return matchesSearch && matchesPrize;
    });

    // Pagination
    const totalPages = Math.ceil(filteredHistory.length / pageSize);
    const paginatedHistory = filteredHistory.slice((page - 1) * pageSize, page * pageSize);

    return (
        <Card>
            <CardHeader>
                <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                    <CardTitle>Lịch sử trúng thưởng</CardTitle>
                    <div className="flex gap-2">
                        <div className="relative w-64">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input 
                                placeholder="Tìm theo tên/email..." 
                                className="pl-8" 
                                value={searchTerm}
                                onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
                            />
                        </div>
                        <Select value={prizeFilter} onValueChange={(v) => { setPrizeFilter(v); setPage(1); }}>
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="Lọc giải thưởng" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">Tất cả giải</SelectItem>
                                {prizeOptions.map(p => (
                                    <SelectItem key={p} value={p}>{p}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <div className="rounded-md border">
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
                            {paginatedHistory.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Không tìm thấy dữ liệu</TableCell>
                                </TableRow>
                            ) : (
                                paginatedHistory.map((record: any) => (
                                    <TableRow key={record.id}>
                                        <TableCell>
                                            <span className="font-mono text-xs">
                                                {new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'medium', timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date(record.createdAt))}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span className="font-medium">{record.user.name || 'N/A'}</span>
                                                <span className="text-xs text-muted-foreground">{record.user.email}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {record.user.achievements?.[0]?.code ? (
                                                <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200 text-[10px]">
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
                </div>
                
                {/* Pagination Controls */}
                {totalPages > 1 && (
                    <div className="flex justify-end items-center gap-2 mt-4">
                        <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1}
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <span className="text-sm">Trang {page} / {totalPages}</span>
                        <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                            disabled={page === totalPages}
                        >
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
