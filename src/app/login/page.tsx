'use client';

import { signIn } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';

function LoginForm() {
    const searchParams = useSearchParams();
    const error = searchParams.get('error');
    const [isLoading, setIsLoading] = useState(false);

    return (
        <div className="flex min-h-screen items-center justify-center p-4">
            <div className="glass-card w-full max-w-md p-8 text-center animate-[slideUp_0.6s_ease-out]">
                <div className="mb-8 flex justify-center">
                    <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-white/20 text-4xl shadow-lg ring-1 ring-white/30 backdrop-blur-md">
                        🔐
                    </div>
                </div>
                
                <h1 className="mb-2 text-2xl font-bold text-gray-800">Đăng Nhập</h1>
                <p className="mb-8 text-sm text-gray-600">Hệ thống chấm công nội bộ</p>

                {error && (
                    <div className="mb-6 rounded-lg bg-red-100 p-3 text-sm text-red-700 border border-red-200">
                        {error === 'AccessDenied' 
                            ? 'Bạn không có quyền truy cập.' 
                            : 'Đăng nhập thất bại. Vui lòng thử lại.'}
                    </div>
                )}

                <button
                    onClick={() => {
                        setIsLoading(true);
                        signIn('google', { callbackUrl: '/' });
                    }}
                    disabled={isLoading}
                    className="btn w-full justify-center bg-white text-gray-700 shadow-md hover:bg-gray-50 disabled:opacity-70 transition-all border border-gray-200"
                >
                    {isLoading ? (
                        <span className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600"></span>
                    ) : (
                        <>
                            <img 
                                src="https://www.svgrepo.com/show/475656/google-color.svg" 
                                alt="Google" 
                                className="h-5 w-5 mr-2"
                            />
                            Tiếp tục với Google
                        </>
                    )}
                </button>
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
