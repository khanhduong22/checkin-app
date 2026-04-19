'use client';

import React, { useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import { Button } from '@/components/ui/button';
import { Upload, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { importWeeklySchedule, ParsedShiftItem } from '@/app/actions/schedule';

export default function UploadScheduleButton() {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isLoading, setIsLoading] = useState(false);

    const handleButtonClick = () => {
        if (fileInputRef.current) {
            fileInputRef.current.click();
        }
    };

    const parseDateText = (dateText: string | number): Date | null => {
        if (!dateText) return null;
        
        // Handle Excel Date serial numbers directly if read as number
        if (typeof dateText === 'number') {
            // Excel dates are days since 1900-01-01
            const date = new Date((dateText - (25567 + 2)) * 86400 * 1000); // 25569 offsets Excel's 1900 leap year bug
             // Timezone adjustment for local time
             const offsetDate = new Date(date.getTime() + date.getTimezoneOffset() * 60 * 1000);
             return offsetDate;
        }

        const text = dateText.toString().trim();
        // Match standard DD/MM/YYYY
        const parts = text.split(/[-/]/);
        if (parts.length === 3) {
            let day = parseInt(parts[0], 10);
            let month = parseInt(parts[1], 10);
            let year = parseInt(parts[2], 10);
            
            // Adjust if year is 2 digits
            if (year < 100) year += 2000;
            
            // Avoid swapping formats if typical DD/MM/YYYY
            if (day > 31) {
                // assume YYYY-MM-DD
                const temp = year;
                year = day;
                day = temp;
            }
            
            return new Date(year, month - 1, day);
        }
        
        const parsed = new Date(text);
        if (!isNaN(parsed.getTime())) return parsed;

        return null;
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsLoading(true);
        try {
            const buffer = await file.arrayBuffer();
            const workbook = XLSX.read(buffer, { type: 'array' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            
            // Get 2D array
            const jsonData: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
            if (jsonData.length < 2) {
                toast.error("File không hợp lệ hoặc không có dữ liệu.");
                return;
            }

            // Find headers
            const headerRowIndex = jsonData.findIndex(row => row && row.length > 0 && row.some((cell: any) => cell && cell.toString().toLowerCase().includes('ngày')));
            if (headerRowIndex === -1) {
                toast.error('Không tìm thấy dòng tiêu đề (phải chứa chữ "Ngày" hoặc "Ngày / Ca").');
                return;
            }

            const headers = jsonData[headerRowIndex];
            const dateColIndex = headers.findIndex((h: any) => h && h.toString().toLowerCase().includes('ngày'));
            
            // Find shift columns dynamically: "Ca Sáng (8h - 12h)" => start: 8, end: 12
            const shiftColumns: { index: number, startHour: number, endHour: number }[] = [];
            const timeSpanRegex = /(\d+)\s*[hH]?\s*(?:-|đến)\s*(\d+)\s*[hH]?/;
            
            headers.forEach((h: any, index: number) => {
                if (h && typeof h === 'string') {
                    const match = h.match(timeSpanRegex);
                    if (match) {
                        shiftColumns.push({
                            index,
                            startHour: parseInt(match[1]),
                            endHour: parseInt(match[2])
                        });
                    }
                }
            });

            if (shiftColumns.length === 0) {
                toast.error('Không tìm thấy cột ca làm việc nào (ví dụ tiêu đề cần có "8h - 12h").');
                return;
            }

            const shiftsToImport: ParsedShiftItem[] = [];

            // Parse data rows
            for (let i = headerRowIndex + 1; i < jsonData.length; i++) {
                const row = jsonData[i];
                if (!row || row.length === 0) continue;

                const dateText = row[dateColIndex];
                if (!dateText) continue;

                const parsedDate = parseDateText(dateText);
                if (!parsedDate || isNaN(parsedDate.getTime())) continue;

                const dateIso = `${parsedDate.getFullYear()}-${String(parsedDate.getMonth() + 1).padStart(2, '0')}-${String(parsedDate.getDate()).padStart(2, '0')}T00:00:00.000Z`;

                shiftColumns.forEach(shiftCol => {
                    const cellValue = row[shiftCol.index];
                    if (cellValue && typeof cellValue === 'string' && cellValue.trim() !== '') {
                        const names = cellValue.split(/[,&]/).map(n => n.trim()).filter(n => n !== '');
                        if (names.length > 0) {
                            shiftsToImport.push({
                                dateIso,
                                startHour: shiftCol.startHour,
                                endHour: shiftCol.endHour,
                                names
                            });
                        }
                    }
                });
            }

            if (shiftsToImport.length === 0) {
                toast.error("Không tìm thấy dữ liệu ca làm hợp lệ.");
                return;
            }

            // Call Server Action
            const result = await importWeeklySchedule(shiftsToImport, true);
            if (result.success) {
                toast.success(result.message || "Tải lịch lên thành công!");
            } else {
                toast.error(result.error || "Có lỗi xảy ra khi tải lịch.");
            }

        } catch (error) {
            console.error(error);
            toast.error("Lỗi khi đọc file Excel.");
        } finally {
            setIsLoading(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = ''; // clear input
            }
        }
    };

    return (
        <div>
            <input 
                type="file" 
                accept=".xlsx, .xls" 
                className="hidden" 
                ref={fileInputRef} 
                onChange={handleFileChange}
            />
            <Button 
                onClick={handleButtonClick} 
                disabled={isLoading}
                className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 shadow-sm rounded-full px-5 font-semibold"
            >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                Tải Lịch Lên (Excel)
            </Button>
        </div>
    );
}
