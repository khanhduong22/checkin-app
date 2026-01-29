'use client';

import { useState } from "react";
import { createNote, deleteNote } from "@/app/actions/note";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, X, Pin } from "lucide-react";
import { cn } from "@/lib/utils";

const COLORS = [
    { name: 'yellow', bg: 'bg-yellow-100 hover:bg-yellow-200 border-yellow-200 text-yellow-900' },
    { name: 'pink', bg: 'bg-pink-100 hover:bg-pink-200 border-pink-200 text-pink-900' },
    { name: 'blue', bg: 'bg-blue-100 hover:bg-blue-200 border-blue-200 text-blue-900' },
    { name: 'green', bg: 'bg-green-100 hover:bg-green-200 border-green-200 text-green-900' },
];

export default function StickyBoard({ notes, currentUser }: { notes: any[], currentUser: any }) {
    const [newNote, setNewNote] = useState("");
    const [selectedColor, setSelectedColor] = useState('yellow');
    const [isAdding, setIsAdding] = useState(false);

    const handleAdd = async () => {
        if (!newNote.trim()) return;
        await createNote(newNote, selectedColor);
        setNewNote("");
        setIsAdding(false);
    };

    const handleDelete = async (id: string) => {
        if (confirm("Gỡ giấy nhớ này?")) {
            await deleteNote(id);
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold flex items-center gap-2">
                    <Pin className="h-4 w-4 rotate-45 text-orange-500" /> 
                    Sổ Giao Ca
                </h3>
                <Button size="sm" variant="ghost" onClick={() => setIsAdding(!isAdding)}>
                    {isAdding ? "Đóng" : "📝 Viết mới"}
                </Button>
            </div>

            {isAdding && (
                <div className="p-3 bg-white rounded-lg border shadow-sm space-y-3 animate-in fade-in slide-in-from-top-2">
                    <Input 
                        placeholder="Nhắn gì cho ca sau?..." 
                        value={newNote} 
                        onChange={e => setNewNote(e.target.value)}
                        className="border-none bg-gray-50 focus-visible:ring-1"
                    />
                    <div className="flex items-center justify-between">
                        <div className="flex gap-2">
                            {COLORS.map(c => (
                                <button
                                    key={c.name}
                                    onClick={() => setSelectedColor(c.name)}
                                    className={`w-6 h-6 rounded-full border ${c.name === selectedColor ? 'ring-2 ring-offset-2 ring-gray-400' : ''}`}
                                    style={{ backgroundColor: c.name === 'yellow' ? '#fef9c3' : c.name === 'pink' ? '#fce7f3' : c.name === 'blue' ? '#dbeafe' : '#dcfce7' }}
                                />
                            ))}
                        </div>
                        <Button size="sm" onClick={handleAdd}>Dán lên</Button>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-2 gap-3">
                {notes.map(note => {
                    const style = COLORS.find(c => c.name === note.color) || COLORS[0];
                    return (
                        <div key={note.id} className={cn("p-3 rounded-lg border shadow-sm relative group transition-all transform hover:-translate-y-1", style.bg)}>
                            <div className="text-sm font-medium whitespace-pre-wrap font-handwriting">{note.content}</div>
                            <div className="text-[10px] opacity-70 mt-2 flex justify-between items-end">
                                <span>{note.user?.name?.split(' ').pop()} • {new Date(note.createdAt).toLocaleTimeString('vi-VN', {hour:'2-digit', minute:'2-digit'})}</span>
                            </div>
                            <button 
                                onClick={() => handleDelete(note.id)}
                                className="absolute -top-1 -right-1 bg-white rounded-full p-0.5 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                                <X className="h-3 w-3 text-red-500" />
                            </button>
                        </div>
                    );
                })}
                {notes.length === 0 && !isAdding && (
                     <div className="col-span-2 text-center py-8 text-muted-foreground text-sm border-2 border-dashed rounded-lg">
                        Chưa có tin nhắn nào.
                     </div>
                )}
            </div>
        </div>
    );
}
