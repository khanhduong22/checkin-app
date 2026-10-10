import React, { useState } from "react";
import useSWR from "swr";
import { swrFetcher, api, setToken } from "@/lib/api";
import { AdminPageLoadingSkeleton } from "@/components/ui/AdminPageLoadingSkeleton";
import { ShieldAlert, KeyRound, Loader2, ArrowLeft, ShieldCheck, Lock } from "lucide-react";
import { toast } from "sonner";

interface AdminGuardProps {
  children: React.ReactNode;
}

export function AdminGuard({ children }: AdminGuardProps) {
  const { data, error, isLoading, mutate } = useSWR<any>("/api/me", swrFetcher, {
    revalidateOnFocus: true,
    shouldRetryOnError: false,
  });

  const [adminEmail, setAdminEmail] = useState("");
  const [adminPin, setAdminPin] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // If currently loading profile for the first time
  if (isLoading && !data && !error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 sm:p-6 flex items-center justify-center">
        <div className="w-full max-w-4xl">
          <AdminPageLoadingSkeleton />
        </div>
      </div>
    );
  }

  const currentUser = data?.user;
  const isAdmin = currentUser?.role === "ADMIN";

  // If user is authenticated and has ADMIN role, grant access
  if (isAdmin) {
    return <>{children}</>;
  }

  // Handle Admin PIN Unlock submission
  const handlePinAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const emailToUse = (adminEmail.trim() || currentUser?.email || "").trim();
    const pinToUse = adminPin.trim();

    if (!emailToUse) {
      setErrorMessage("Vui lòng nhập địa chỉ email Quản trị viên");
      return;
    }
    if (!pinToUse) {
      setErrorMessage("Vui lòng nhập mã PIN bảo mật Admin");
      return;
    }

    setIsSubmitting(true);
    try {
      const res: any = await api.post("/auth/login", {
        email: emailToUse,
        adminPin: pinToUse,
      });

      if (res && res.accessToken) {
        setToken(res.accessToken);
        toast.success(`Xác thực Quản trị viên thành công: ${res.user?.name || emailToUse} 🛡️`);
        await mutate();
      } else {
        setErrorMessage(res?.error || "Mã PIN không hợp lệ hoặc tài khoản không có quyền Admin");
      }
    } catch (err: any) {
      setErrorMessage(
        err?.data?.error ||
        err?.message ||
        "Mã PIN bảo mật Admin không chính xác. Vui lòng thử lại."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#faf6f0] dark:bg-gray-950 flex items-center justify-center p-4 sm:p-6 select-none">
      <div className="w-full max-w-md bg-white dark:bg-gray-900 border border-orange-100 dark:border-gray-800 shadow-2xl rounded-3xl p-6 sm:p-8 text-center animate-in fade-in zoom-in-95 duration-200">
        {/* Warning Icon Badge */}
        <div className="mx-auto w-16 h-16 rounded-2xl bg-amber-100 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800 flex items-center justify-center shadow-xs mb-4">
          <ShieldAlert className="w-8 h-8 text-amber-600 dark:text-amber-400" />
        </div>

        <span className="inline-block px-3 py-1 rounded-full text-[11px] font-bold bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-900 mb-2">
          Truy cập bị từ chối (403)
        </span>

        <h2 className="text-xl font-extrabold text-stone-900 dark:text-stone-100 tracking-tight">
          Khu vực Quản trị viên
        </h2>

        <p className="mt-2 text-xs text-stone-600 dark:text-stone-400 leading-relaxed">
          Trang quản trị chỉ dành riêng cho <strong>Quản trị viên LimArt</strong>. Nhân viên vui lòng sử dụng ứng dụng chấm công dành cho nhân viên.
        </p>

        {currentUser && (
          <div className="mt-4 p-2.5 rounded-xl bg-stone-50 dark:bg-gray-800/60 border border-stone-200 dark:border-gray-700 text-xs text-stone-600 dark:text-stone-400 text-left">
            <p className="font-semibold text-stone-700 dark:text-stone-300">Tài khoản hiện tại:</p>
            <p className="font-mono text-[11px] text-stone-500 truncate">{currentUser.name} ({currentUser.email})</p>
            <p className="text-[10px] text-amber-600 font-semibold mt-0.5">Vai trò: {currentUser.role}</p>
          </div>
        )}

        {/* Admin PIN Unlock Form */}
        <div className="mt-5 pt-4 border-t border-orange-100 dark:border-gray-800 text-left">
          <div className="flex items-center gap-1.5 mb-2.5 text-xs font-bold text-stone-800 dark:text-stone-200">
            <Lock className="w-3.5 h-3.5 text-amber-600" />
            <span>Mở khóa bằng mã PIN Quản trị viên</span>
          </div>

          <form onSubmit={handlePinAuth} className="space-y-3">
            <div>
              <label className="block text-[11px] font-medium text-stone-600 dark:text-stone-400 mb-1">
                Email Quản trị viên
              </label>
              <input
                type="email"
                required
                placeholder={currentUser?.email || "admin@limart.vn"}
                value={adminEmail || (currentUser?.email ? "" : adminEmail)}
                onChange={(e) => setAdminEmail(e.target.value)}
                defaultValue={currentUser?.email}
                className="w-full px-3 py-2 text-xs bg-stone-50 dark:bg-gray-800 border border-stone-200 dark:border-gray-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-amber-500 text-stone-900 dark:text-stone-100"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-stone-600 dark:text-stone-400 mb-1">
                Mã PIN bảo mật Admin
              </label>
              <input
                type="password"
                required
                placeholder="Nhập mã PIN Admin..."
                value={adminPin}
                onChange={(e) => setAdminPin(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-stone-50 dark:bg-gray-800 border border-stone-200 dark:border-gray-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-amber-500 text-stone-900 dark:text-stone-100 font-mono tracking-widest"
              />
            </div>

            {errorMessage && (
              <div className="p-2 rounded-lg bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-400 text-[11px]">
                {errorMessage}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 active:scale-98 text-white font-semibold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shadow-xs"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <KeyRound className="w-4 h-4" />
                  <span>Xác thực Quản trị viên</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Back to Staff App Button */}
        <div className="mt-4 pt-3 border-t border-orange-100 dark:border-gray-800">
          <a
            href="/"
            className="inline-flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl border border-stone-200 dark:border-gray-700 hover:bg-stone-100 dark:hover:bg-gray-800 text-stone-700 dark:text-stone-300 font-semibold text-xs transition-all active:scale-98"
          >
            <ArrowLeft className="w-4 h-4 text-stone-500" />
            <span>← Quay lại trang nhân viên</span>
          </a>
        </div>
      </div>
    </div>
  );
}
