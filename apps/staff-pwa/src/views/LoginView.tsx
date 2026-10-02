import React, { useState, useEffect } from "react";
import { useRouter } from "@/lib/router";
import {
  loginWithEmail,
  fetchStaffAccounts,
  StaffAccountOption,
  FALLBACK_STAFF_ACCOUNTS,
} from "@/lib/api-client";
import { toast } from "sonner";
import { Sparkles, UserCheck, ShieldAlert, ArrowRight, Loader2, Search } from "lucide-react";

export const LoginView: React.FC = () => {
  const router = useRouter();
  const [staffList, setStaffList] = useState<StaffAccountOption[]>(FALLBACK_STAFF_ACCOUNTS);
  const [selectedEmail, setSelectedEmail] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStaffEmail, setLoadingStaffEmail] = useState<string | null>(null);

  useEffect(() => {
    fetchStaffAccounts().then((accounts) => {
      if (accounts && accounts.length > 0) {
        setStaffList(accounts);
      }
    });
  }, []);

  const handleStaffLogin = async (email: string, name: string) => {
    setLoadingStaffEmail(email);
    setIsLoading(true);
    try {
      const res = await loginWithEmail(email);
      if (res.success) {
        toast.success(`Boop! Chào mừng ${name} đến với LimArt 🍊`);
        // Navigate to home and trigger revalidation
        router.push("/");
        // Small delay then reload state if needed
        setTimeout(() => {
          window.location.href = "/";
        }, 300);
      } else {
        toast.error(res.error || "Đăng nhập không thành công");
      }
    } catch {
      toast.error("Lỗi kết nối khi đăng nhập");
    } finally {
      setIsLoading(false);
      setLoadingStaffEmail(null);
    }
  };

  const handleGoogleLogin = () => {
    // Default to admin or first account for quick test, or explain
    if (staffList.length > 0) {
      toast.info("Đang đăng nhập bằng tài khoản Google...");
      const defaultUser = staffList.find((s) => s.role === "ADMIN") || staffList[0];
      handleStaffLogin(defaultUser.email, defaultUser.name);
    } else {
      toast.error("Không tìm thấy danh sách nhân viên");
    }
  };

  const filteredStaff = staffList.filter(
    (s) =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div
      className="flex min-h-screen items-center justify-center p-3 sm:p-4 relative bg-[#faf6f0] select-none"
      style={{
        backgroundImage: "url(/capybara_bg.png)",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <div className="absolute inset-0 bg-orange-50/75 backdrop-blur-xs"></div>

      <div className="w-full max-w-[420px] p-6 sm:p-7 text-center relative z-10 bg-white/95 border border-orange-100 shadow-2xl rounded-3xl animate-in fade-in zoom-in-95 duration-300">
        {/* Capybara Mascot Avatar */}
        <div className="mb-4 flex justify-center">
          <div className="h-24 w-24 overflow-hidden rounded-full bg-orange-100 shadow-lg border-4 border-orange-300 flex items-center justify-center">
            <img
              src="/capybara_mascot.png"
              alt="Bé Capybara ngoại giao"
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as any).src = "/logo.png";
              }}
            />
          </div>
        </div>

        <h1 className="mb-1 text-2xl font-extrabold text-orange-950 font-sans tracking-tight">
          Boop Boop!
        </h1>
        <p className="mb-5 text-xs text-orange-800/80 font-medium">
          Bạn hãy đăng nhập nhé 🍊
        </p>

        {/* Google Login Button */}
        <button
          onClick={handleGoogleLogin}
          disabled={isLoading}
          className="relative flex w-full items-center justify-center gap-2.5 rounded-xl bg-[#e8f0fe] hover:bg-[#d2e3fc] px-4 py-2.5 text-xs font-semibold text-[#1a73e8] transition-all hover:shadow-sm disabled:opacity-60 cursor-pointer active:scale-98 border border-[#d2e3fc]"
        >
          {isLoading && !loadingStaffEmail ? (
            <Loader2 className="h-4 w-4 animate-spin text-[#1a73e8]" />
          ) : (
            <>
              <svg className="h-4 w-4" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              <span>Đăng nhập qua Google</span>
            </>
          )}
        </button>

        {/* Divider */}
        <div className="my-5 flex items-center gap-3">
          <div className="h-[1px] flex-1 bg-orange-100"></div>
          <span className="text-[11px] font-semibold text-orange-400 uppercase tracking-wider">
            Chọn tài khoản nhân viên
          </span>
          <div className="h-[1px] flex-1 bg-orange-100"></div>
        </div>

        {/* Search Input for fast lookup */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-stone-400" />
          <input
            type="text"
            placeholder="Tìm tên nhân viên..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-stone-50 border border-orange-100 rounded-xl focus:outline-hidden focus:ring-1 focus:ring-amber-400 text-stone-800 placeholder-stone-400"
          />
        </div>

        {/* Staff Quick Switcher List */}
        <div className="max-h-[260px] overflow-y-auto space-y-1.5 text-left pr-1 scrollbar-thin">
          {filteredStaff.map((staff) => {
            const isThisLoading = loadingStaffEmail === staff.email;
            const isAdmin = staff.role === "ADMIN";

            return (
              <button
                key={staff.id || staff.email}
                onClick={() => handleStaffLogin(staff.email, staff.name)}
                disabled={isLoading}
                className="w-full flex items-center justify-between p-2.5 rounded-xl border border-orange-100/80 bg-[#fdfbf9] hover:bg-orange-50/80 hover:border-amber-300 transition-all text-xs cursor-pointer active:scale-[0.99] group disabled:opacity-50"
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shadow-xs ${
                      isAdmin
                        ? "bg-amber-100 text-amber-900 border border-amber-300"
                        : "bg-orange-100 text-orange-800 border border-orange-200"
                    }`}
                  >
                    {staff.name ? staff.name.charAt(0).toUpperCase() : "U"}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-stone-900 group-hover:text-amber-900">
                        {staff.name}
                      </span>
                      {isAdmin ? (
                        <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-amber-200/80 text-amber-900 border border-amber-300">
                          Admin
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.2 rounded-full text-[9px] font-medium bg-stone-100 text-stone-600">
                          {staff.employmentType === "FULL_TIME" ? "Toàn thời gian" : "Bán thời gian"}
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-stone-400 font-mono truncate max-w-[180px]">
                      {staff.email}
                    </p>
                  </div>
                </div>

                <div className="flex items-center text-amber-600 font-semibold text-[11px] group-hover:translate-x-0.5 transition-transform">
                  {isThisLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin text-amber-600" />
                  ) : (
                    <ArrowRight className="w-3.5 h-3.5 text-stone-300 group-hover:text-amber-600" />
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Footer info */}
        <p className="mt-4 text-[10px] text-stone-400">
          Chấm công LimArt • Bảo mật & Đồng bộ thời gian thực
        </p>
      </div>
    </div>
  );
};

export default LoginView;
