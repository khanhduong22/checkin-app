'use client';

import { Button } from "@/components/ui/button";

export default function ExportButton({ data, fileName = 'export.csv' }: { data: any[], fileName?: string }) {
    const handleExport = () => {
        if (!data || data.length === 0) return alert("Không có dữ liệu để xuất!");

        // 1. Get headers
        const headers = Object.keys(data[0]);
        
        // 2. Convert to CSV
        const csvContent = [
            headers.join(','), // Header row
            ...data.map(row => headers.map(fieldName => {
                let value = row[fieldName];
                // Escape quotes and wrap in quotes if string contains comma
                if (typeof value === 'string') {
                    value = `"${value.replace(/"/g, '""')}"`; 
                }
                return value;
            }).join(','))
        ].join('\n');

        // 3. Trigger Download
        const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' }); // Add BOM for Excel UTF-8
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", fileName);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <Button variant="outline" onClick={handleExport} className="gap-2">
            📊 Xuất Excel
        </Button>
    );
}
