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
                    className="btn btn-primary w-full justify-center disabled:opacity-70"
                >
                    {isLoading ? (
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white"></span>
                    ) : (
                        <>Tiếp tục với Google</>
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
