export default function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50/50">
       <div className="space-y-4 text-center">
            <div className="relative h-12 w-12 mx-auto">
                 <div className="absolute inset-0 border-4 border-gray-200 rounded-full"></div>
                 <div className="absolute inset-0 border-4 border-emerald-500 rounded-full border-t-transparent animate-spin"></div>
            </div>
            <p className="text-sm text-gray-500 font-medium animate-pulse">Đang tải...</p>
       </div>
    </div>
  )
}
