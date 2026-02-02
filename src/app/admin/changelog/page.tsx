
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from 'next/link';
import { Button } from '@/components/ui/button';

import { CHANGELOGS } from "@/lib/changelogs";

export const dynamic = 'force-dynamic';

export default function ChangelogPage() {
    return (
        <div className="space-y-6 max-w-4xl mx-auto py-8">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Nhật ký Cập nhật hệ thống</h2>
                    <p className="text-muted-foreground">Theo dõi các thay đổi và tính năng mới qua từng phiên bản.</p>
                </div>
                <Link href="/admin">
                     <Button variant="outline">← Quay lại Dashboard</Button>
                </Link>
            </div>

            <div className="space-y-8 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-300 before:to-transparent">
                {CHANGELOGS.map((log, index) => (
                    <div key={log.version} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                        {/* Dot */}
                        <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white bg-slate-300 group-[.is-active]:bg-emerald-500 text-slate-500 group-[.is-active]:text-emerald-50 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                            <svg className="fill-current" xmlns="http://www.w3.org/2000/svg" width="12" height="10">
                                <path fillRule="nonzero" d="M10.422 1.257 4.655 7.025 2.553 4.923A.916.916 0 0 0 1.257 6.22l2.75 2.75a.916.916 0 0 0 1.296 0l6.415-6.416a.916.916 0 0 0-1.296-1.296Z" />
                            </svg>
                        </div>
                        
                        {/* Content */}
                        <Card className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 shadow-md border-emerald-100/50 hover:shadow-lg transition-shadow bg-white">
                            <CardHeader className="p-0 pb-2 mb-2 border-b border-dashed">
                                <div className="flex justify-between items-start">
                                    <div className="flex flex-col">
                                        <CardTitle className="text-xl font-bold text-slate-900">v{log.version}</CardTitle>
                                        <time className="font-mono text-xs text-slate-500">{log.date}</time>
                                    </div>
                                    <div className="flex gap-1">
                                        {log.tags.map(t => <Badge key={t} variant="secondary" className="text-[10px]">{t}</Badge>)}
                                    </div>
                                </div>
                                <h3 className="font-semibold text-emerald-700 mt-1">{log.title}</h3>
                            </CardHeader>
                            <CardContent className="p-0 text-sm text-slate-600">
                                <ul className="space-y-2">
                                    {log.changes.map((change, i) => (
                                        <li key={i} className="flex gap-2">
                                            <span className="text-emerald-500 mt-0.5">•</span>
                                            <span dangerouslySetInnerHTML={{ __html: change.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>') }} />
                                        </li>
                                    ))}
                                </ul>
                            </CardContent>
                        </Card>
                    </div>
                ))}
            </div>
        </div>
    );
}
