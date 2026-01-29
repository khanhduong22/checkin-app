'use client';

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Megaphone, Flame, Info, CheckCircle, AlertTriangle } from "lucide-react";

export default function AnnouncementBar({ announcements }: { announcements: any[] }) {
    if (!announcements || announcements.length === 0) return null;

    return (
        <div className="space-y-2 mb-4 animate-in slide-in-from-top duration-500">
            {announcements.map(a => {
                let Icon = Info;
                let style = "bg-blue-50 text-blue-800 border-blue-200";
                
                if (a.type === 'WARNING') { Icon = AlertTriangle; style = "bg-yellow-50 text-yellow-800 border-yellow-200"; }
                if (a.type === 'SUCCESS') { Icon = CheckCircle; style = "bg-emerald-50 text-emerald-800 border-emerald-200"; }
                if (a.type === 'URGENT') { Icon = Flame; style = "bg-red-50 text-red-800 border-red-200"; }

                return (
                    <Alert key={a.id} className={`${style} shadow-sm border`}>
                        <Icon className="h-4 w-4" />
                        <AlertTitle className="font-bold ml-2">{a.title}</AlertTitle>
                        <AlertDescription className="ml-2 text-xs opacity-90">
                            {a.content}
                        </AlertDescription>
                    </Alert>
                );
            })}
        </div>
    );
}
