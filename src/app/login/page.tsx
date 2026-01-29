'use client';

import { signIn } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';

function LoginForm() {
    const searchParams = useSearchParams();
    const error = searchParams.get('error');
    const [isLoading, setIsLoading] = useState(false);
    
    // Check if we are potentially in dev mode via client-side hint if needed
    // But relying on simple button action is enough.
    const isDev = process.env.NODE_ENV === 'development';

    return (
        <div className="flex min-h-screen items-center justify-center p-4">
            <div className="card w-full max-w-[400px] p-8 text-center">
                <div className="mb-6 flex justify-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-black text-white text-2xl shadow-sm">
                        🔒
                    </div>
                </div>
                
                <h1 className="mb-2 text-xl font-semibold text-gray-900">Đăng nhập</h1>
                <p className="mb-8 text-sm text-gray-500">Chấm công nội bộ</p>

                {error && (
                    <div className="mb-6 rounded-md bg-red-50 p-3 text-sm text-red-600 border border-red-100">
                        {error === 'AccessDenied' 
                            ? 'Không có quyền truy cập.' 
                            : 'Đăng nhập lỗi. Thử lại.'}
                    </div>
                )}

                <button
                    onClick={() => {
                        setIsLoading(true);
                        signIn('google', { callbackUrl: '/' });
                    }}
                    disabled={isLoading}
                    className="relative flex w-full items-center justify-center gap-3 rounded-md bg-[#e8f0fe] px-4 py-3 text-sm font-medium text-[#1a73e8] transition-all hover:bg-[#d2e3fc] hover:shadow-sm disabled:opacity-70"
                >
                    {isLoading ? (
                        <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#1a73e8]/30 border-t-[#1a73e8]" />
                    ) : (
                        <>
                            <svg className="h-5 w-5" viewBox="0 0 24 24">
                                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                            </svg>
                            <span>Đăng nhập qua Google</span>
                        </>
                    )}
                </button>

                {/* DEV MODE BYPASS BUTTON */}
                {isDev && (
                    <div className="mt-6 border-t border-gray-100 pt-6">
                         <p className="mb-3 text-xs uppercase tracking-wider text-gray-400 font-semibold">Môi trường Dev</p>
                         <button
                            onClick={() => window.location.href = '/'}
                            className="btn btn-secondary w-full justify-center text-xs"
                        >
                            ⚡ Vào nhanh (Bypass Login)
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

export default function LoginPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <LoginForm />
        </Suspense>
    );
}
