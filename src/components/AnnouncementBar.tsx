'use client';

import { useState, useEffect } from 'react';
import { Megaphone, Flame, Info, CheckCircle, AlertTriangle, Check } from "lucide-react";

interface Announcement {
    id: string;
    title: string;
    content: string;
    type: string;
    active: boolean;
    createdAt: Date;
}

export default function AnnouncementBar({ announcements }: { announcements: Announcement[] }) {
    const [showPopup, setShowPopup] = useState(false);
    const [unreadAnnouncements, setUnreadAnnouncements] = useState<Announcement[]>([]);

    useEffect(() => {
        if (!announcements || announcements.length === 0) return;

        const readIdsStr = localStorage.getItem('read_announcement_ids');
        const readIds: string[] = readIdsStr ? JSON.parse(readIdsStr) : [];
        
        // Filter announcements that are active and have not been read yet
        const unread = announcements.filter(a => !readIds.includes(a.id));
        
        if (unread.length > 0) {
            setUnreadAnnouncements(unread);
            setShowPopup(true);
        }
    }, [announcements]);

    const handleMarkAsRead = () => {
        const readIdsStr = localStorage.getItem('read_announcement_ids');
        const readIds: string[] = readIdsStr ? JSON.parse(readIdsStr) : [];
        
        // Add all current unread IDs to read list
        const newReadIds = [...new Set([...readIds, ...unreadAnnouncements.map(a => a.id)])];
        localStorage.setItem('read_announcement_ids', JSON.stringify(newReadIds));
        
        setShowPopup(false);
    };

    if (!showPopup || unreadAnnouncements.length === 0) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden border border-orange-100 flex flex-col animate-in zoom-in-95 duration-300">
                
                {/* Glowing Vibrant Header */}
                <div className="bg-gradient-to-r from-rose-500 via-orange-500 to-amber-500 p-6 text-white flex items-center gap-4 relative overflow-hidden">
                    {/* Animated background circles */}
                    <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/10 rounded-full blur-xl" />
                    <div className="absolute -bottom-10 -left-10 w-24 h-24 bg-white/10 rounded-full blur-lg" />
                    
                    <div className="bg-white/20 p-3 rounded-xl backdrop-blur-sm animate-pulse">
                        <Megaphone className="h-7 w-7 text-white" />
                    </div>
                    <div>
                        <h2 className="text-xl font-extrabold tracking-wider drop-shadow-md">THÔNG BÁO MỚI NHẤT</h2>
                        <p className="text-xs text-white/80 mt-0.5 font-medium">Bạn có {unreadAnnouncements.length} thông báo chưa đọc</p>
                    </div>
                </div>

                {/* Content Area */}
                <div className="p-6 max-h-[60vh] overflow-y-auto space-y-4 bg-gray-50/50">
                    {unreadAnnouncements.map((a) => {
                        let Icon = Info;
                        let typeText = "Thông tin";
                        let badgeStyle = "bg-blue-100 text-blue-700 border-blue-200";
                        let borderStyle = "border-blue-100 bg-white hover:border-blue-200";
                        
                        if (a.type === 'WARNING') { 
                            Icon = AlertTriangle; 
                            typeText = "Cảnh báo"; 
                            badgeStyle = "bg-amber-100 text-amber-700 border-amber-200";
                            borderStyle = "border-amber-100 bg-white hover:border-amber-200";
                        }
                        if (a.type === 'SUCCESS') { 
                            Icon = CheckCircle; 
                            typeText = "Quan trọng"; 
                            badgeStyle = "bg-emerald-100 text-emerald-700 border-emerald-200";
                            borderStyle = "border-emerald-100 bg-white hover:border-emerald-200";
                        }
                        if (a.type === 'URGENT') { 
                            Icon = Flame; 
                            typeText = "Khẩn cấp"; 
                            badgeStyle = "bg-rose-100 text-rose-700 border-rose-200 animate-pulse";
                            borderStyle = "border-rose-100 bg-rose-50/20 hover:border-rose-200";
                        }

                        return (
                            <div key={a.id} className={`p-4 rounded-xl border shadow-sm transition-all duration-200 ${borderStyle}`}>
                                <div className="flex items-center justify-between mb-2">
                                    <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full border ${badgeStyle}`}>
                                        {typeText}
                                    </span>
                                    <span className="text-[10px] text-gray-400 font-medium">
                                        {new Date(a.createdAt).toLocaleDateString('vi-VN')}
                                    </span>
                                </div>
                                <h3 className="font-extrabold text-gray-900 text-base md:text-lg flex items-start gap-2 leading-snug">
                                    <Icon className="h-5 w-5 shrink-0 mt-0.5 text-orange-500" />
                                    {a.title}
                                </h3>
                                <p className="text-gray-700 text-sm mt-2.5 leading-relaxed whitespace-pre-line bg-gray-50/70 p-3 rounded-lg border border-gray-100">
                                    {a.content}
                                </p>
                            </div>
                        );
                    })}
                </div>

                {/* Footer Action */}
                <div className="p-4 bg-white border-t border-gray-100 flex justify-end shadow-inner">
                    <button
                        onClick={handleMarkAsRead}
                        className="w-full py-3.5 bg-gradient-to-r from-orange-500 to-rose-600 hover:from-orange-600 hover:to-rose-700 text-white font-extrabold rounded-xl shadow-lg hover:shadow-orange-500/20 active:scale-[0.98] transition-all duration-150 flex items-center justify-center gap-2 cursor-pointer"
                    >
                        <Check className="h-5 w-5" />
                        ĐÃ ĐỌC THÔNG BÁO
                    </button>
                </div>

            </div>
        </div>
    );
}
