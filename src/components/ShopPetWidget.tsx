'use client';

import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

export default function ShopPetWidget({ pet }: { pet: any }) {
    if (!pet) return null;

    // Mood Logic
    let moodEmoji = "🐱";
    let statusText = "Mèo đang chill";
    
    if (pet.mood >= 80) {
        moodEmoji = "😸";
        statusText = "Mèo đang rất vui!";
    } else if (pet.mood <= 50) {
        moodEmoji = "😿";
        statusText = "Mèo đang buồn...";
    } else if (pet.health <= 30) {
        moodEmoji = "🤕";
        statusText = "Mèo cần đi bác sĩ!";
    }

    return (
        <Card className="p-4 bg-gradient-to-br from-orange-50 to-yellow-50 border-orange-200">
            <div className="flex items-center gap-4">
                <div className="relative">
                    <div className="text-5xl animate-bounce hover:animate-spin cursor-pointer transition-all duration-500 select-none">
                        {moodEmoji}
                    </div>
                    {/* Level Badge */}
                    <div className="absolute -top-2 -right-2 bg-yellow-400 text-yellow-900 text-[10px] font-bold px-1.5 py-0.5 rounded-full border border-yellow-500 shadow-sm">
                        Lv.{pet.level}
                    </div>
                </div>

                <div className="flex-1 space-y-2">
                    <div className="flex justify-between items-center">
                        <h3 className="font-bold text-orange-900 text-sm">{pet.name}</h3>
                        <span className="text-[10px] text-orange-700 italic">{statusText}</span>
                    </div>
                    
                    {/* Health Bar */}
                    <div className="space-y-0.5">
                        <div className="flex justify-between text-[10px] text-muted-foreground">
                            <span>❤️ Sức khỏe</span>
                            <span>{pet.health}/100</span>
                        </div>
                        <Progress value={pet.health} className="h-1.5 bg-red-100 [&>div]:bg-red-500" />
                    </div>

                    {/* Mood Bar */}
                    <div className="space-y-0.5">
                        <div className="flex justify-between text-[10px] text-muted-foreground">
                            <span>✨ Tâm trạng</span>
                            <span>{pet.mood}/100</span>
                        </div>
                        <Progress value={pet.mood} className="h-1.5 bg-yellow-100 [&>div]:bg-yellow-500" />
                    </div>
                </div>
            </div>
        </Card>
    );
}
