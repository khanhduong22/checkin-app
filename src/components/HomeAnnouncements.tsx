'use client';

import { useState } from 'react';
import { Megaphone, Flame, Info, CheckCircle, AlertTriangle, ChevronDown, ChevronUp } from "lucide-react";

interface Announcement {
    id: string;
    title: string;
    content: string;
    type: string;
    active: boolean;
    createdAt: Date;
}

export default function HomeAnnouncements({ announcements }: { announcements: Announcement[] }) {
    const [expandedId, setExpandedId] = useState<string | null>(null);

    if (!announcements || announcements.length === 0) return null;

    const toggleExpand = (id: string) => {
        setExpandedId(prev => prev === id ? null : id);
    };

    return (
        <div className="mt-2 space-y-3">
            <div className="flex items-center gap-2 px-1 text-gray-700 font-extrabold text-sm uppercase tracking-wider">
                <Megaphone className="h-4 w-4 text-orange-500" />
                <span>Bảng tin thông báo</span>
                <span className="bg-orange-100 text-orange-600 px-2.5 py-0.5 rounded-full text-xs font-bold shadow-xs">
                    {announcements.length}
                </span>
            </div>
            
            <div className="space-y-2">
                {announcements.map((a) => {
                    const isExpanded = expandedId === a.id;
                    let Icon = Info;
                    let badgeColor = "bg-blue-100 text-blue-700 border-blue-200";
                    let typeText = "Thông tin";
                    
                    if (a.type === 'WARNING') {
                        Icon = AlertTriangle;
                        badgeColor = "bg-amber-100 text-amber-700 border-amber-200";
                        typeText = "Cảnh báo";
                    } else if (a.type === 'SUCCESS') {
                        Icon = CheckCircle;
                        badgeColor = "bg-emerald-100 text-emerald-700 border-emerald-200";
                        typeText = "Quan trọng";
                    } else if (a.type === 'URGENT') {
                        Icon = Flame;
                        badgeColor = "bg-rose-100 text-rose-700 border-rose-200 animate-pulse";
                        typeText = "Khẩn cấp";
                    }

                    return (
                        <div 
                            key={a.id} 
                            className="bg-white border border-gray-100 rounded-xl overflow-hidden shadow-xs transition-all hover:border-orange-200"
                        >
                            {/* Header / Clickable Area */}
                            <button
                                onClick={() => toggleExpand(a.id)}
                                className="w-full text-left p-3.5 flex items-center justify-between gap-3 focus:outline-none cursor-pointer"
                            >
                                <div className="flex items-start gap-2.5 min-w-0">
                                    <div className={`mt-0.5 p-1.5 rounded-lg ${badgeColor}`}>
                                        <Icon className="h-4 w-4 shrink-0" />
                                    </div>
                                    <div className="min-w-0">
                                        <h4 className="font-bold text-sm text-gray-900 leading-snug line-clamp-2">
                                            {a.title}
                                        </h4>
                                        <span className="text-[10px] text-gray-400 font-bold mt-1 block">
                                            {new Date(a.createdAt).toLocaleDateString('vi-VN')}
                                        </span>
                                    </div>
                                </div>
                                <div className="text-gray-400">
                                    {isExpanded ? (
                                        <ChevronUp className="h-4 w-4 shrink-0" />
                                    ) : (
                                        <ChevronDown className="h-4 w-4 shrink-0" />
                                    )}
                                </div>
                            </button>

                            {/* Content Area */}
                            {isExpanded && (
                                <div className="px-4 pb-4 pt-1 bg-gray-50/50 border-t border-gray-50">
                                    <p className="text-gray-800 text-xs leading-relaxed whitespace-pre-line bg-white p-3 rounded-lg border border-gray-100 font-medium">
                                        {a.content}
                                    </p>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
