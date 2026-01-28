'use client';

import { signOut } from "next-auth/react";

export default function UserProfile({ user, role }: { user: any, role?: string }) {
  return (
    <div className="flex items-center justify-between rounded-xl bg-white/10 p-4 border border-white/10">
      <div className="flex items-center gap-3">
        {user.image ? (
            <img src={user.image} alt="Avatar" className="h-10 w-10 rounded-full border border-white/20" />
        ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-500 font-bold text-white">
                {user.name?.charAt(0).toUpperCase()}
            </div>
        )}
        <div>
            <div className="font-semibold text-gray-900">{user.name}</div>
            <div className="text-xs text-gray-600 email-text">{user.email}</div>
            {role === 'ADMIN' && (
                <span className="mt-1 inline-block rounded bg-purple-100 px-2 py-0.5 text-[10px] font-bold text-purple-700">
                    ADMIN
                </span>
            )}
        </div>
      </div>
      <button 
        onClick={() => signOut()}
        className="rounded-lg p-2 text-sm text-red-100 hover:bg-red-500/20 hover:text-red-600 transition-colors"
        title="Đăng xuất"
      >
        🚪
      </button>
    </div>
  );
}
