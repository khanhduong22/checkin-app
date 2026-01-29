'use client';

import { Button } from "@/components/ui/button"
import { signOut } from "next-auth/react"

export default function UserProfile({ user, role }: { user: any, role?: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg border bg-card p-4 text-card-foreground shadow-sm">
      <div className="flex items-center gap-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold">
           {user.image ? (
                <img src={user.image} alt={user.name} className="h-full w-full rounded-full object-cover" />
            ) : (
                user.name?.charAt(0).toUpperCase()
            )}
        </div>
        <div>
            <div className="font-medium">{user.name}</div>
            <div className="text-sm text-muted-foreground">{user.email}</div>
            {role === 'ADMIN' && (
                <span className="mt-1 inline-flex items-center rounded-full border border-transparent bg-destructive/10 px-2.5 py-0.5 text-xs font-semibold text-destructive transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
                    ADMIN
                </span>
            )}
        </div>
      </div>
      <Button 
        variant="ghost" 
        size="icon"
        onClick={() => signOut()}
        title="Đăng xuất"
      >
        🚪
      </Button>
    </div>
  );
}
